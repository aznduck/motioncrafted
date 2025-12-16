"""
Customer order submission endpoint
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import List
import uuid
from app.schemas.orders import OrderCreateRequest, OrderResponse
from app.models.database_helpers import db_helpers
from app.services.storage_service import storage_service

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
        "status": "pending",
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
    # Step 4: Return success response
    # ========================================================================

    return OrderResponse(
        order_id=order_id,
        message=f"Order received! We'll process your {len(photos)} photos and notify you when ready."
    )
