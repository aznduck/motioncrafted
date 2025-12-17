"""
Admin order management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from app.schemas.admin import (
    OrderListResponse, OrderListItem, OrderDetailResponse,
    PhotoDetail, ClipDetail, OrderFinalizeRequest, OrderFinalizeResponse
)
from app.core.security import require_admin, decode_access_token
from app.core.database import get_db
from app.core.config import settings
from app.services.storage_service import storage_service
from app.services.video_service import video_service
from app.services.email_service import email_service
import io

router = APIRouter()


@router.get("/orders", response_model=OrderListResponse)
async def list_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(require_admin)
):
    """
    List all orders with optional status filtering

    Query params:
        status: Filter by order status (pending, processing, pending_review, etc.)

    Returns:
        List of orders with photo/clip counts
    """
    db = get_db()

    # Build query
    query = db.table('orders').select('*').order('created_at', desc=True)

    if status_filter:
        query = query.eq('status', status_filter)

    result = query.execute()
    orders = result.data or []

    if not orders:
        return OrderListResponse(orders=[], total=0)

    # Optimize: Fetch all photos and clips in batch queries
    order_ids = [o['id'] for o in orders]

    # Get all photos for these orders
    all_photos = db.table('photos').select('id,order_id').in_('order_id', order_ids).execute()
    photos_data = all_photos.data or []

    # Build photo count map: {order_id: count}
    photo_counts = {}
    photo_id_to_order = {}
    for photo in photos_data:
        order_id = photo['order_id']
        photo_counts[order_id] = photo_counts.get(order_id, 0) + 1
        photo_id_to_order[photo['id']] = order_id

    # Get all clips for these photos
    if photos_data:
        photo_ids = [p['id'] for p in photos_data]
        all_clips = db.table('clips').select('id,photo_id').in_('photo_id', photo_ids).execute()
        clips_data = all_clips.data or []

        # Build clip count map: {order_id: count}
        clip_counts = {}
        for clip in clips_data:
            order_id = photo_id_to_order.get(clip['photo_id'])
            if order_id:
                clip_counts[order_id] = clip_counts.get(order_id, 0) + 1
    else:
        clip_counts = {}

    # Build response
    order_items = []
    for order in orders:
        order_id = order['id']
        order_items.append(OrderListItem(
            **order,
            photo_count=photo_counts.get(order_id, 0),
            clip_count=clip_counts.get(order_id, 0)
        ))

    return OrderListResponse(
        orders=order_items,
        total=len(order_items)
    )


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
async def get_order_detail(
    order_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Get detailed order information with all photos and clips

    Args:
        order_id: UUID of the order

    Returns:
        Complete order details including photos and clips for review
    """
    db = get_db()

    # Fetch order
    try:
        order_result = db.table('orders').select('*').eq('id', order_id).single().execute()
        order = order_result.data

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Fetch photos with signed URLs
    photos_result = db.table('photos').select('*').eq('order_id', order_id).order('upload_order').execute()
    photos = []
    for photo in (photos_result.data or []):
        # Generate signed URL for photo
        photo_url = storage_service.get_public_url(photo['storage_path'])
        photos.append(PhotoDetail(**photo, photo_url=photo_url))

    # Fetch clips (join with photos to filter by order)
    clips_result = db.table('clips').select('*, photos!inner(order_id)').eq('photos.order_id', order_id).execute()
    clips = [ClipDetail(**clip) for clip in (clips_result.data or [])]

    # Fetch final video if exists
    final_video_result = db.table('final_videos').select('*').eq('order_id', order_id).execute()
    final_video_url = None
    if final_video_result.data and len(final_video_result.data) > 0:
        final_video = final_video_result.data[0]
        final_video_url = storage_service.get_public_url(final_video['storage_path'])

    return OrderDetailResponse(
        **order,
        photos=photos,
        clips=clips,
        final_video_url=final_video_url
    )


@router.post("/orders/{order_id}/finalize", response_model=OrderFinalizeResponse)
async def finalize_order(
    order_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Finalize an order by stitching all approved clips into final video

    Args:
        order_id: UUID of the order

    Returns:
        Status and final video path
    """
    db = get_db()

    # Fetch order
    try:
        order_result = db.table('orders').select('*').eq('id', order_id).single().execute()
        order = order_result.data

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Check if order status is approved
    if order['status'] != 'approved':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order must be approved before finalizing. Current status: {order['status']}"
        )

    # Check if final video already exists
    final_video_result = db.table('final_videos').select('*').eq('order_id', order_id).execute()
    if final_video_result.data and len(final_video_result.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final video already exists for this order"
        )

    # Create final video
    try:
        storage_path = video_service.create_final_video(
            order_id=order_id,
            personalization_message=order['personalization_message'],
            vibe=order['vibe']
        )

        # Update order status to completed
        db.table('orders').update({
            'status': 'completed'
        }).eq('id', order_id).execute()

        return OrderFinalizeResponse(
            order_id=order_id,
            status="completed",
            message="Final video created successfully",
            video_path=storage_path
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create final video: {str(e)}"
        )


@router.post("/orders/{order_id}/send-delivery-email")
async def send_delivery_email(
    order_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Send delivery email to customer with link to their video

    Args:
        order_id: UUID of the order

    Returns:
        Success message
    """
    db = get_db()

    # Fetch order
    try:
        order_result = db.table('orders').select('*').eq('id', order_id).single().execute()
        order = order_result.data

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Check if order is completed
    if order['status'] != 'completed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order must be completed before sending delivery email. Current status: {order['status']}"
        )

    # Check if final video exists
    final_video_result = db.table('final_videos').select('*').eq('order_id', order_id).execute()
    if not final_video_result.data or len(final_video_result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final video not found for this order"
        )

    # Create delivery URL
    delivery_url = f"{settings.CUSTOMER_SITE_URL}/delivery?order_id={order_id}"

    # Send email
    try:
        result = email_service.send_delivery_email(
            to_email=order['customer_email'],
            customer_name=order['customer_name'],
            order_id=order_id,
            delivery_url=delivery_url
        )

        return {
            "success": True,
            "message": f"Delivery email sent to {order['customer_email']}",
            "email_id": result.get("email_id")
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send delivery email: {str(e)}"
        )


@router.get("/orders/{order_id}/download")
async def download_final_video(
    order_id: str,
    token: str = Query(...),
):
    """
    Download the final stitched video for an order

    Args:
        order_id: UUID of the order

    Returns:
        Video file stream
    """
    payload = decode_access_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="admin access required lol",
        )
    db = get_db()

    # Fetch final video record
    try:
        final_video_result = db.table('final_videos').select('*').eq('order_id', order_id).single().execute()
        final_video = final_video_result.data

        if not final_video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Final video not found for this order"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Final video not found for this order"
        )

    # Download video from storage
    try:
        video_data = storage_service.download_file(final_video['storage_path'])

        # Stream the video
        return StreamingResponse(
            io.BytesIO(video_data),
            media_type="video/mp4",
            headers={
                "Content-Disposition": f"attachment; filename=order_{order_id}_final.mp4"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download video: {str(e)}"
        )
