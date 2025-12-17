"""
Admin API request/response schemas
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ============================================================================
# Authentication
# ============================================================================

class AdminLoginRequest(BaseModel):
    """Admin login request"""
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    """Admin login response with JWT token"""
    access_token: str
    token_type: str = "bearer"


# ============================================================================
# Orders
# ============================================================================

class OrderListItem(BaseModel):
    """Order item in list view"""
    id: str
    customer_name: str
    customer_email: str
    vibe: str
    status: str
    created_at: datetime
    photo_count: Optional[int] = 0
    clip_count: Optional[int] = 0


class OrderListResponse(BaseModel):
    """List of orders"""
    orders: List[OrderListItem]
    total: int


class PhotoDetail(BaseModel):
    """Photo details"""
    id: str
    storage_path: str
    upload_order: int
    analysis_result: Optional[dict] = None
    animation_prompt: Optional[str] = None
    photo_url: Optional[str] = None


class ClipDetail(BaseModel):
    """Clip details for review"""
    id: str
    photo_id: str
    storage_path: str
    duration: float
    status: str
    review_status: Optional[str] = None
    admin_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class OrderDetailResponse(BaseModel):
    """Detailed order information with photos and clips"""
    id: str
    customer_name: str
    customer_email: str
    vibe: str
    personalization_message: str
    status: str
    payment_status: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    photos: List[PhotoDetail]
    clips: List[ClipDetail]
    final_video_url: Optional[str] = None


# ============================================================================
# Clip Review
# ============================================================================

class ClipApproveRequest(BaseModel):
    """Request to approve a clip"""
    pass  # No body needed, just the clip_id in URL


class ClipRejectRequest(BaseModel):
    """Request to reject a clip"""
    notes: Optional[str] = None
    regenerate: bool = False
    new_prompt: Optional[str] = None


class ClipActionResponse(BaseModel):
    """Response after approving/rejecting a clip"""
    clip_id: str
    status: str
    message: str


# ============================================================================
# Order Finalization
# ============================================================================

class OrderFinalizeRequest(BaseModel):
    """Request to finalize an order (stitch video)"""
    pass  # No body needed


class OrderFinalizeResponse(BaseModel):
    """Response after finalizing an order"""
    order_id: str
    status: str
    message: str
    video_path: Optional[str] = None
