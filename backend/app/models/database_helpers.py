"""
Database helper functions for common operations
"""

from typing import Optional, List, Dict, Any
from supabase import Client
from app.core.database import get_db


class DatabaseHelpers:
    """Helper functions for database operations"""

    def __init__(self):
        self.client: Client = get_db()

    # ========================================================================
    # Admin Users
    # ========================================================================

    def get_admin_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get admin user by email"""
        try:
            response = self.client.table("admin_users").select("*").eq("email", email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting admin by email: {e}")
            return None

    def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        """Get admin user by ID"""
        try:
            response = self.client.table("admin_users").select("*").eq("id", admin_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting admin by ID: {e}")
            return None

    # ========================================================================
    # Orders
    # ========================================================================

    def create_order(self, order_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new order"""
        try:
            response = self.client.table("orders").insert(order_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating order: {e}")
            return None

    def get_order_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get order by ID"""
        try:
            response = self.client.table("orders").select("*").eq("id", order_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting order: {e}")
            return None

    def get_orders_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get all orders with a specific status"""
        try:
            response = (
                self.client.table("orders")
                .select("*")
                .eq("status", status)
                .order("created_at", desc=True)
                .execute()
            )
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting orders by status: {e}")
            return []

    def get_all_orders(self) -> List[Dict[str, Any]]:
        """Get all orders"""
        try:
            response = (
                self.client.table("orders")
                .select("*")
                .order("created_at", desc=True)
                .execute()
            )
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting all orders: {e}")
            return []

    def update_order_status(self, order_id: str, status: str) -> Optional[Dict[str, Any]]:
        """Update order status"""
        try:
            response = (
                self.client.table("orders")
                .update({"status": status})
                .eq("id", order_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating order status: {e}")
            return None

    # ========================================================================
    # Photos
    # ========================================================================

    def create_photo(self, photo_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a photo record"""
        try:
            response = self.client.table("photos").insert(photo_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating photo: {e}")
            return None

    def get_photos_by_order(self, order_id: str) -> List[Dict[str, Any]]:
        """Get all photos for an order"""
        try:
            response = (
                self.client.table("photos")
                .select("*")
                .eq("order_id", order_id)
                .order("upload_order", desc=False)
                .execute()
            )
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting photos: {e}")
            return []

    def update_photo_analysis(
        self,
        photo_id: str,
        analysis_result: Dict[str, Any],
        animation_prompt: str
    ) -> Optional[Dict[str, Any]]:
        """Update photo with analysis results and prompt"""
        try:
            response = (
                self.client.table("photos")
                .update({
                    "analysis_result": analysis_result,
                    "animation_prompt": animation_prompt
                })
                .eq("id", photo_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating photo analysis: {e}")
            return None

    # ========================================================================
    # Clips
    # ========================================================================

    def create_clip(self, clip_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a clip record"""
        try:
            response = self.client.table("clips").insert(clip_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating clip: {e}")
            return None

    def get_clip_by_id(self, clip_id: str) -> Optional[Dict[str, Any]]:
        """Get clip by ID"""
        try:
            response = self.client.table("clips").select("*").eq("id", clip_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting clip: {e}")
            return None

    def get_clips_by_order(self, order_id: str) -> List[Dict[str, Any]]:
        """Get all clips for an order (via photos)"""
        try:
            # Join clips with photos to filter by order_id
            response = (
                self.client.table("clips")
                .select("*, photos!inner(order_id, upload_order)")
                .eq("photos.order_id", order_id)
                .execute()
            )
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting clips by order: {e}")
            return []

    def update_clip_review(
        self,
        clip_id: str,
        review_status: str,
        admin_notes: Optional[str] = None,
        reviewed_by: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update clip review status"""
        try:
            update_data = {
                "review_status": review_status,
                "reviewed_at": "now()"
            }
            if admin_notes:
                update_data["admin_notes"] = admin_notes
            if reviewed_by:
                update_data["reviewed_by"] = reviewed_by

            response = (
                self.client.table("clips")
                .update(update_data)
                .eq("id", clip_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating clip review: {e}")
            return None

    # ========================================================================
    # Final Videos
    # ========================================================================

    def create_final_video(self, video_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a final video record"""
        try:
            response = self.client.table("final_videos").insert(video_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating final video: {e}")
            return None

    def get_final_video_by_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get final video for an order"""
        try:
            response = (
                self.client.table("final_videos")
                .select("*")
                .eq("order_id", order_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting final video: {e}")
            return None


# Create singleton instance
db_helpers = DatabaseHelpers()
