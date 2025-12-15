"""
Storage Service - Handles file uploads/downloads with Supabase Storage
"""

import os
from typing import BinaryIO, Optional
from pathlib import Path
from supabase import Client
from app.core.database import get_db
from app.core.config import settings


class StorageService:
    """Service for managing file storage in Supabase Storage"""

    def __init__(self):
        self.client: Client = get_db()
        self.bucket_name = settings.SUPABASE_STORAGE_BUCKET

    def upload_photo(
        self,
        order_id: str,
        file_data: bytes,
        filename: str,
        content_type: str = "image/jpeg"
    ) -> str:
        """
        Upload a photo to Supabase Storage

        Args:
            order_id: UUID of the order
            file_data: Binary file data
            filename: Original filename
            content_type: MIME type of the file

        Returns:
            Storage path of uploaded file
        """
        # Create path: orders/{order_id}/originals/{filename}
        storage_path = f"orders/{order_id}/originals/{filename}"

        try:
            # Upload to Supabase Storage
            response = self.client.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )

            return storage_path

        except Exception as e:
            raise Exception(f"Failed to upload photo: {str(e)}")

    def upload_clip(
        self,
        order_id: str,
        file_data: bytes,
        filename: str,
        content_type: str = "video/mp4"
    ) -> str:
        """
        Upload an animated clip to Supabase Storage

        Args:
            order_id: UUID of the order
            file_data: Binary video data
            filename: Clip filename
            content_type: MIME type

        Returns:
            Storage path of uploaded clip
        """
        # Create path: orders/{order_id}/clips/{filename}
        storage_path = f"orders/{order_id}/clips/{filename}"

        try:
            response = self.client.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )

            return storage_path

        except Exception as e:
            raise Exception(f"Failed to upload clip: {str(e)}")

    def upload_final_video(
        self,
        order_id: str,
        file_data: bytes,
        filename: str = "final_video.mp4",
        content_type: str = "video/mp4"
    ) -> str:
        """
        Upload final stitched video to Supabase Storage

        Args:
            order_id: UUID of the order
            file_data: Binary video data
            filename: Video filename
            content_type: MIME type

        Returns:
            Storage path of uploaded video
        """
        # Create path: orders/{order_id}/final_video.mp4
        storage_path = f"orders/{order_id}/{filename}"

        try:
            response = self.client.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )

            return storage_path

        except Exception as e:
            raise Exception(f"Failed to upload final video: {str(e)}")

    def download_file(self, storage_path: str) -> bytes:
        """
        Download a file from Supabase Storage

        Args:
            storage_path: Path to file in storage

        Returns:
            Binary file data
        """
        try:
            response = self.client.storage.from_(self.bucket_name).download(storage_path)
            return response

        except Exception as e:
            raise Exception(f"Failed to download file: {str(e)}")

    def get_public_url(self, storage_path: str) -> str:
        """
        Get public URL for a file (for private buckets, use signed URLs)

        Args:
            storage_path: Path to file in storage

        Returns:
            Public URL
        """
        try:
            # For private buckets, create a signed URL (expires in 1 hour)
            response = self.client.storage.from_(self.bucket_name).create_signed_url(
                path=storage_path,
                expires_in=3600  # 1 hour
            )
            return response['signedURL']

        except Exception as e:
            raise Exception(f"Failed to generate signed URL: {str(e)}")

    def delete_file(self, storage_path: str) -> bool:
        """
        Delete a file from Supabase Storage

        Args:
            storage_path: Path to file in storage

        Returns:
            True if deleted successfully
        """
        try:
            response = self.client.storage.from_(self.bucket_name).remove([storage_path])
            return True

        except Exception as e:
            raise Exception(f"Failed to delete file: {str(e)}")

    def delete_order_files(self, order_id: str) -> bool:
        """
        Delete all files for an order

        Args:
            order_id: UUID of the order

        Returns:
            True if deleted successfully
        """
        try:
            # List all files in the order folder
            files = self.client.storage.from_(self.bucket_name).list(f"orders/{order_id}")

            if files:
                # Delete all files
                paths = [f"orders/{order_id}/{file['name']}" for file in files]
                self.client.storage.from_(self.bucket_name).remove(paths)

            return True

        except Exception as e:
            raise Exception(f"Failed to delete order files: {str(e)}")

    def get_file_size(self, storage_path: str) -> int:
        """
        Get size of a file in bytes

        Args:
            storage_path: Path to file in storage

        Returns:
            File size in bytes
        """
        try:
            # Download and measure
            file_data = self.download_file(storage_path)
            return len(file_data)

        except Exception as e:
            raise Exception(f"Failed to get file size: {str(e)}")


# Create singleton instance
storage_service = StorageService()
