"""
Admin clip review and streaming endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from datetime import datetime
from app.schemas.admin import (
    ClipApproveRequest, ClipRejectRequest, ClipActionResponse
)
from app.core.security import require_admin, decode_access_token
from app.core.database import get_db
from app.services.storage_service import storage_service
import io

router = APIRouter()


@router.post("/clips/{clip_id}/approve", response_model=ClipActionResponse)
async def approve_clip(
    clip_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Approve a clip for inclusion in final video

    Args:
        clip_id: UUID of the clip to approve

    Returns:
        Updated clip status
    """
    db = get_db()

    # Fetch clip
    try:
        clip_result = db.table('clips').select('*').eq('id', clip_id).single().execute()
        clip = clip_result.data

        if not clip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Clip not found"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clip not found"
        )

    # Update clip to approved
    db.table('clips').update({
        'review_status': 'approved',
        'reviewed_at': datetime.utcnow().isoformat(),
        'reviewed_by': current_user['sub'],
        'admin_notes': None
    }).eq('id', clip_id).execute()

    # Check if all clips for this order are approved
    # Get order_id from photo
    photo_result = db.table('photos').select('order_id').eq('id', clip['photo_id']).single().execute()
    order_id = photo_result.data['order_id']

    # Count total clips and approved clips for this order
    all_clips_result = db.table('clips').select('id, review_status, photos!inner(order_id)', count='exact').eq('photos.order_id', order_id).execute()
    all_clips = all_clips_result.data or []

    total_clips = len(all_clips)
    approved_clips = len([c for c in all_clips if c.get('review_status') == 'approved'])

    # If all clips approved, update order status
    if total_clips > 0 and approved_clips == total_clips:
        db.table('orders').update({
            'status': 'approved',
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', order_id).execute()

    return ClipActionResponse(
        clip_id=clip_id,
        status="approved",
        message="Clip approved successfully"
    )


@router.post("/clips/{clip_id}/reject", response_model=ClipActionResponse)
async def reject_clip(
    clip_id: str,
    request: ClipRejectRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Reject a clip with optional regeneration

    Args:
        clip_id: UUID of the clip to reject
        request: Rejection details (notes, regenerate flag, new prompt)

    Returns:
        Updated clip status
    """
    db = get_db()

    # Fetch clip
    try:
        clip_result = db.table('clips').select('*').eq('id', clip_id).single().execute()
        clip = clip_result.data

        if not clip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Clip not found"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clip not found"
        )

    # Update clip to rejected
    db.table('clips').update({
        'review_status': 'rejected',
        'reviewed_at': datetime.utcnow().isoformat(),
        'reviewed_by': current_user['sub'],
        'admin_notes': request.notes
    }).eq('id', clip_id).execute()

    message = "Clip rejected"

    # If regenerate requested, update the photo's prompt and trigger regeneration
    if request.regenerate:
        photo_id = clip['photo_id']

        # Update prompt if new one provided
        if request.new_prompt:
            db.table('photos').update({
                'animation_prompt': request.new_prompt
            }).eq('id', photo_id).execute()

        # TODO: Trigger regeneration job (similar to order processor)
        # This would resubmit the photo to Kling with the updated prompt
        message = "Clip rejected and marked for regeneration"

    return ClipActionResponse(
        clip_id=clip_id,
        status="rejected",
        message=message
    )


@router.get("/clips/{clip_id}/stream")
async def stream_clip(
    clip_id: str,
    token: str = Query(...),
):
    """
    Stream a video clip for preview in admin dashboard

    Args:
        clip_id: UUID of the clip to stream

    Returns:
        Video file stream (MP4)
    """
    payload = decode_access_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="admin access required lol",
        )

    db = get_db()

    # Fetch clip
    try:
        clip_result = db.table('clips').select('*').eq('id', clip_id).single().execute()
        clip = clip_result.data

        if not clip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Clip not found"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clip not found"
        )

    # Download clip from storage
    try:
        video_data = storage_service.download_file(clip['storage_path'])

        # Stream the video
        return StreamingResponse(
            io.BytesIO(video_data),
            media_type="video/mp4",
            headers={
                "Content-Disposition": f"inline; filename=clip_{clip_id}.mp4"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stream clip: {str(e)}"
        )
