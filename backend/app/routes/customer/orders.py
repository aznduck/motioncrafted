"""
Customer order submission endpoint
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List
import uuid
import io
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from app.schemas.orders import OrderCreateRequest, OrderResponse
from app.models.database_helpers import db_helpers
from app.services.storage_service import storage_service
from app.services.order_processor import order_processor
from app.services.stripe_service import stripe_service
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Thread pool for blocking background tasks
executor = ThreadPoolExecutor(max_workers=4)


def run_order_processing_sync(order_id: str):
    """Wrapper to run async order processing in a sync context"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(order_processor.process_order(order_id))
    finally:
        loop.close()


@router.post("/orders/{order_id}/test-process")
async def test_process_order(order_id: str):
    """
    TEST ENDPOINT: Manually trigger order processing

    This bypasses payment and starts processing immediately.
    Use this for testing the full pipeline without Stripe integration.
    """
    order = db_helpers.get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order["status"] == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order already completed"
        )

    # Update payment status to paid and order status to pending
    db_helpers.update_order_status(order_id, "pending")

    # Trigger background processing in a separate thread (non-blocking!)
    asyncio.get_event_loop().run_in_executor(
        executor,
        run_order_processing_sync,
        order_id
    )

    return {
        "message": "Order processing started in background!",
        "order_id": order_id,
        "note": "This is a test endpoint. The API will remain responsive while processing."
    }


@router.post("/orders", response_model=OrderResponse)
async def create_order(
    # Form fields
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    vibe: str = Form(...),
    personalization_message: str = Form(...),
    # File uploads
    photos: List[UploadFile] = File(...),
):
    """
    Create a new order with photos

    Customer submits:
    - 5+ photos
    - Personal info (name, email)
    - Video vibe selection
    - Personalization message

    Returns order_id for tracking
    """

    # ========================================================================
    # Step 1: Validate inputs
    # ========================================================================

    # Validate photo count
    if len(photos) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"At least 5 photos required. You uploaded {len(photos)}."
        )

    # Validate vibe
    allowed_vibes = ['cinematic_emotional', 'warm_human', 'joyful_alive', 'quiet_timeless']
    if vibe not in allowed_vibes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vibe. Must be one of: {', '.join(allowed_vibes)}"
        )

    # Validate photo file types
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
    for photo in photos:
        if photo.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type for {photo.filename}. Allowed: JPEG, PNG, HEIC"
            )

    # ========================================================================
    # Step 2: Create order in database
    # ========================================================================

    order_id = str(uuid.uuid4())

    order_data = {
        "id": order_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "vibe": vibe,
        "personalization_message": personalization_message,
        "status": "pending_payment",
        "payment_status": "unpaid"
    }

    order = db_helpers.create_order(order_data)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )

    # ========================================================================
    # Step 3: Upload photos to Supabase Storage
    # ========================================================================

    try:
        for idx, photo in enumerate(photos, start=1):
            # Read file data
            file_data = await photo.read()

            # Generate filename
            file_extension = photo.filename.split('.')[-1] if '.' in photo.filename else 'jpg'
            filename = f"photo_{idx}.{file_extension}"

            # Upload to storage
            storage_path = storage_service.upload_photo(
                order_id=order_id,
                file_data=file_data,
                filename=filename,
                content_type=photo.content_type
            )

            # Create photo record in database
            photo_data = {
                "id": str(uuid.uuid4()),
                "order_id": order_id,
                "storage_path": storage_path,
                "upload_order": idx
            }

            db_helpers.create_photo(photo_data)

    except Exception as e:
        # If upload fails, update order status to failed
        db_helpers.update_order_status(order_id, "failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload photos: {str(e)}"
        )

    # ========================================================================
    # Step 4: Return order ID for payment
    # ========================================================================
    # Note: Order processing will start after payment is confirmed via webhook

    return OrderResponse(
        order_id=order_id,
        message=f"Order created! Proceed to payment to start processing."
    )


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """
    Get order details for customer (for order tracking/delivery page)

    Returns order info including status, clips, and final video if available
    """
    order = db_helpers.get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Get clips for this order
    clips = db_helpers.get_clips_by_order(order_id)

    # Get final video if exists
    final_video = db_helpers.get_final_video_by_order(order_id)

    # Generate public URL for final video if it exists
    final_video_url = None
    if final_video and final_video.get("storage_path"):
        final_video_url = storage_service.get_public_url(final_video["storage_path"])

    return {
        "id": order["id"],
        "customer_name": order["customer_name"],
        "customer_email": order["customer_email"],
        "vibe": order["vibe"],
        "personalization_message": order.get("personalization_message", ""),
        "status": order["status"],
        "payment_status": order["payment_status"],
        "created_at": order["created_at"],
        "clips": clips or [],
        "final_video_url": final_video_url
    }


@router.post("/orders/{order_id}/checkout")
async def create_checkout_session(order_id: str):
    """
    Create Stripe checkout session for order payment

    Returns Stripe checkout URL for customer to complete payment
    """
    order = db_helpers.get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order["payment_status"] == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order already paid"
        )

    # Get photo count for this order
    photos = db_helpers.get_photos_by_order(order_id)
    photo_count = len(photos)

    if photo_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No photos found for this order"
        )

    # Create Stripe checkout session
    try:
        # Determine base URL based on environment
        # In production, use settings.CUSTOMER_SITE_URL
        # For local dev, use localhost:8080
        base_url = "http://localhost:8080" if settings.DEBUG else settings.CUSTOMER_SITE_URL

        checkout_data = stripe_service.create_checkout_session(
            order_id=order_id,
            photo_count=photo_count,
            customer_email=order["customer_email"],
            success_url=f"{base_url}/order-confirmed?order_id={order_id}",
            cancel_url=f"{base_url}/checkout?order_id={order_id}&cancelled=true"
        )

        return {
            "checkout_url": checkout_data["checkout_url"],
            "session_id": checkout_data["session_id"]
        }

    except Exception as e:
        logger.error(f"Failed to create checkout session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.get("/orders/{order_id}/download")
async def download_final_video(order_id: str):
    """
    Download the final video for completed orders
    """
    order = db_helpers.get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order not completed yet"
        )

    # Get final video
    final_video = db_helpers.get_final_video_by_order(order_id)

    if not final_video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Final video not found"
        )

    # Download from storage
    try:
        video_data = storage_service.download_file(final_video["storage_path"])

        return StreamingResponse(
            io.BytesIO(video_data),
            media_type="video/mp4",
            headers={
                "Content-Disposition": f"attachment; filename=cherished_motion_{order_id}.mp4"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download video: {str(e)}"
        )
