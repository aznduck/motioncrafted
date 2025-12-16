"""
Pydantic schemas for order-related requests and responses
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime


class OrderCreateRequest(BaseModel):
    """Request schema for creating an order"""
    customer_name: str = Field(..., min_length=1, max_length=100)
    customer_email: EmailStr
    vibe: str = Field(..., description="Video vibe: cinematic_emotional, warm_human, joyful_alive, or quiet_timeless")
    personalization_message: str = Field(..., min_length=1, max_length=500)

    @validator('vibe')
    def validate_vibe(cls, v):
        """Validate vibe is one of the allowed values"""
        allowed_vibes = ['cinematic_emotional', 'warm_human', 'joyful_alive', 'quiet_timeless']
        if v not in allowed_vibes:
            raise ValueError(f"Vibe must be one of: {', '.join(allowed_vibes)}")
        return v


class OrderResponse(BaseModel):
    """Response schema for order creation"""
    order_id: str
    message: str = "Order received! We'll process your video and notify you when ready."


class OrderDetailResponse(BaseModel):
    """Detailed order information"""
    id: str
    customer_name: str
    customer_email: str
    vibe: str
    personalization_message: str
    status: str
    payment_status: Optional[str] = None
    payment_amount: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class OrderListItem(BaseModel):
    """Order item in list view"""
    id: str
    customer_name: str
    customer_email: str
    vibe: str
    status: str
    created_at: datetime
    photo_count: int = 0
    clips_approved: int = 0


class OrderListResponse(BaseModel):
    """Response for order list"""
    orders: List[OrderListItem]
    total: int
