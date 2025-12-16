"""
Customer order submission endpoint
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List
import uuid
import io
from app.schemas.orders import OrderCreateRequest, OrderResponse
from app.models.database_helpers import db_helpers
from app.services.storage_service import storage_service
from app.services.order_processor import order_processor

router = APIRouter()


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
        "final_video_url": final_video.get("storage_path") if final_video else None
    }


@router.post("/orders/{order_id}/checkout")
async def create_checkout_session(order_id: str):
    """
    Create Stripe checkout session for order payment

    This will be implemented once we add Stripe to the backend
    For now, returns placeholder
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

    # TODO: Implement Stripe checkout session creation
    # For now, return placeholder
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Stripe integration coming soon. Use test mode for now."
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
