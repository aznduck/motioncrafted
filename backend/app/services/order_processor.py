"""
Order Processor - Background job processing for orders
Orchestrates the full AI pipeline: analyze photos → generate clips → save
"""

import logging
import asyncio
from typing import Dict, Any, Optional
from uuid import UUID

from app.services.openai_service import openai_service
from app.services.kling_service import kling_service
from app.services.storage_service import storage_service
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OrderProcessor:
    """Processes orders through the AI pipeline"""

    def __init__(self):
        self.openai = openai_service
        self.kling = kling_service
        self.storage = storage_service
        self.db = storage_service.client

    async def process_order(self, order_id: str) -> bool:
        """
        Main orchestrator - processes an entire order through the AI pipeline

        Args:
            order_id: UUID of the order to process

        Returns:
            True if successful, False if failed
        """
        try:
            logger.info(f"Starting order processing: {order_id}")

            # Update order status to processing
            await self._update_order_status(order_id, "processing")

            # Fetch order and photos
            order = await self._get_order(order_id)
            if not order:
                logger.error(f"Order not found: {order_id}")
                return False

            photos = await self._get_order_photos(order_id)
            if not photos:
                logger.error(f"No photos found for order: {order_id}")
                await self._update_order_status(order_id, "failed")
                return False

            logger.info(f"Processing {len(photos)} photos for order {order_id}")

            # Update status to generating clips
            await self._update_order_status(order_id, "generating_clips")

            # Process each photo
            for photo in photos:
                try:
                    success = await self._process_photo(photo, order['vibe'])
                    if not success:
                        logger.error(f"Failed to process photo {photo['id']}")
                        # Continue with other photos instead of failing entire order
                        continue

                except Exception as e:
                    logger.error(f"Error processing photo {photo['id']}: {str(e)}")
                    continue

            # Check if we have any clips generated
            clips = await self._get_order_clips(order_id)
            if not clips or len(clips) == 0:
                logger.error(f"No clips generated for order {order_id}")
                await self._update_order_status(order_id, "failed")
                return False

            # Update status to pending review
            await self._update_order_status(order_id, "pending_review")
            logger.info(f"Order {order_id} complete - {len(clips)} clips ready for review")

            # TODO: Send notification to Luke

            return True

        except Exception as e:
            logger.error(f"Fatal error processing order {order_id}: {str(e)}")
            await self._update_order_status(order_id, "failed")
            return False

    async def regenerate_clip(
        self,
        clip_id: str,
        improved_prompt: str
    ) -> bool:
        """
        Regenerate a single clip with an improved prompt

        Args:
            clip_id: ID of the rejected clip
            improved_prompt: The refined animation prompt

        Returns:
            True if successful, False if failed
        """
        try:
            logger.info(f"Regenerating clip {clip_id} with improved prompt")

            # Get the clip and associated photo
            clip_result = self.db.table('clips').select('*, photos(*)').eq('id', clip_id).single().execute()
            clip = clip_result.data

            if not clip or not clip.get('photos'):
                logger.error(f"Clip or photo not found for {clip_id}")
                return False

            photo = clip['photos']
            photo_id = photo['id']

            # Update photo's animation prompt
            await self._update_photo_analysis(
                photo_id,
                photo.get('analysis_result', {}),
                improved_prompt
            )

            # Mark old clip as archived (so we keep history)
            self.db.table('clips').update({
                'review_status': 'archived',
                'admin_notes': f"Regenerated - {clip.get('admin_notes', '')}"
            }).eq('id', clip_id).execute()

            # Get order vibe
            order_result = self.db.table('orders').select('vibe').eq('id', photo['order_id']).single().execute()
            vibe = order_result.data['vibe'] if order_result.data else 'cinematic_emotional'

            # Process photo with new prompt (this generates the new clip)
            success = await self._process_photo_with_prompt(
                photo,
                vibe,
                improved_prompt
            )

            return success

        except Exception as e:
            logger.error(f"Failed to regenerate clip {clip_id}: {str(e)}")
            return False

    async def _process_photo_with_prompt(
        self,
        photo: Dict[str, Any],
        vibe: str,
        prompt: str
    ) -> bool:
        """
        Process a photo with a specific prompt (used for regeneration)
        Similar to _process_photo but skips OpenAI analysis since we have the prompt

        Args:
            photo: Photo record from database
            vibe: Selected vibe for the order
            prompt: Pre-generated animation prompt

        Returns:
            True if successful, False if failed
        """
        photo_id = photo['id']
        logger.info(f"Processing photo {photo_id} with custom prompt")

        try:
            # Get photo URL for Kling
            photo_url = self.storage.get_public_url(photo['storage_path'])

            # Submit to Kling
            logger.info(f"Submitting photo {photo_id} to Kling AI")
            task_id = self.kling.create_animation(
                image_url=photo_url,
                prompt=prompt,
                duration=5
            )

            if not task_id:
                logger.error(f"Failed to submit photo {photo_id} to Kling")
                return False

            # Poll Kling until complete
            logger.info(f"Waiting for Kling (task: {task_id})")
            result = self.kling.wait_for_completion(task_id, timeout=600)

            video_url = result.get("video_url")
            if not video_url:
                logger.error(f"Kling generation failed for photo {photo_id}")
                return False

            # Download clip
            logger.info(f"Downloading generated clip")
            clip_data = self.kling.download_video(video_url)

            # Upload to storage with unique filename (timestamp to allow multiple regenerations)
            from datetime import datetime
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            clip_filename = f"photo_{photo_id}_regen_{timestamp}.mp4"
            clip_path = self.storage.upload_clip(
                order_id=photo['order_id'],
                file_data=clip_data,
                filename=clip_filename,
                content_type="video/mp4"
            )

            # Create new clip record
            await self._create_clip_record(photo_id, clip_path)

            logger.info(f"Successfully regenerated clip for photo {photo_id}")
            return True

        except Exception as e:
            logger.error(f"Error regenerating clip for photo {photo_id}: {str(e)}")
            return False

    async def _process_photo(self, photo: Dict[str, Any], vibe: str) -> bool:
        """
        Process a single photo: analyze → generate clip → save

        Args:
            photo: Photo record from database
            vibe: Selected vibe for the order

        Returns:
            True if successful, False if failed
        """
        photo_id = photo['id']
        logger.info(f"Processing photo {photo_id}")

        try:
            # Step 1: Download photo from storage
            logger.info(f"Downloading photo {photo_id} from storage")
            photo_data = self.storage.download_file(photo['storage_path'])

            # Step 2: Analyze with OpenAI
            logger.info(f"Analyzing photo {photo_id} with OpenAI")
            analysis = self.openai.analyze_image(photo_data)

            # Step 3: Generate animation prompt based on vibe
            logger.info(f"Generating prompt for photo {photo_id} (vibe: {vibe})")
            prompt = self.openai.generate_animation_prompt(analysis, vibe)

            # Step 4: Save analysis and prompt to photo record
            await self._update_photo_analysis(photo_id, analysis, prompt)

            # Step 5: Get signed URL for photo (Kling needs a URL)
            photo_url = self.storage.get_public_url(photo['storage_path'])

            # Step 6: Submit to Kling for animation
            logger.info(f"Submitting photo {photo_id} to Kling AI")
            task_id = self.kling.create_animation(
                image_url=photo_url,
                prompt=prompt,
                duration=5  # 5 seconds
            )

            if not task_id:
                logger.error(f"Failed to submit photo {photo_id} to Kling")
                return False

            # Step 7: Poll Kling until complete
            logger.info(f"Waiting for Kling to generate clip for photo {photo_id} (task: {task_id})")
            result = self.kling.wait_for_completion(task_id, timeout=600)  # 10 min timeout

            video_url = result.get("video_url")
            if not video_url:
                logger.error(f"Kling generation failed or timed out for photo {photo_id}")
                return False

            # Step 8: Download generated clip
            logger.info(f"Downloading generated clip for photo {photo_id}")
            clip_data = self.kling.download_video(video_url)

            # Step 9: Upload clip to storage
            clip_filename = f"photo_{photo_id}.mp4"
            logger.info(f"Uploading clip to storage for order {photo['order_id']}")
            clip_path = self.storage.upload_clip(
                order_id=photo['order_id'],
                file_data=clip_data,
                filename=clip_filename,
                content_type="video/mp4"
            )

            # Step 10: Create clip record in database
            await self._create_clip_record(photo_id, clip_path)

            logger.info(f"Successfully processed photo {photo_id}")
            return True

        except Exception as e:
            logger.error(f"Error processing photo {photo_id}: {str(e)}")
            return False

    async def _get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Fetch order from database"""
        try:
            result = self.db.table('orders').select('*').eq('id', order_id).single().execute()
            return result.data if result.data else None
        except Exception as e:
            logger.error(f"Error fetching order {order_id}: {str(e)}")
            return None

    async def _get_order_photos(self, order_id: str) -> list:
        """Fetch all photos for an order, sorted by upload_order"""
        try:
            result = self.db.table('photos').select('*').eq('order_id', order_id).order('upload_order').execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error fetching photos for order {order_id}: {str(e)}")
            return []

    async def _get_order_clips(self, order_id: str) -> list:
        """Fetch all clips for an order"""
        try:
            # Join clips with photos to get order_id
            result = self.db.table('clips').select('*, photos!inner(order_id)').eq('photos.order_id', order_id).execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error fetching clips for order {order_id}: {str(e)}")
            return []

    async def _update_order_status(self, order_id: str, status: str):
        """Update order status"""
        try:
            self.db.table('orders').update({
                'status': status,
                'updated_at': 'NOW()'
            }).eq('id', order_id).execute()
            logger.info(f"Order {order_id} status updated to: {status}")
        except Exception as e:
            logger.error(f"Error updating order status: {str(e)}")

    async def _update_photo_analysis(self, photo_id: str, analysis: Dict[str, Any], prompt: str):
        """Save OpenAI analysis and prompt to photo record"""
        try:
            self.db.table('photos').update({
                'analysis_result': analysis,
                'animation_prompt': prompt
            }).eq('id', photo_id).execute()
            logger.info(f"Photo {photo_id} analysis saved")
        except Exception as e:
            logger.error(f"Error saving photo analysis: {str(e)}")

    async def _create_clip_record(self, photo_id: str, storage_path: str):
        """Create clip record in database"""
        try:
            self.db.table('clips').insert({
                'photo_id': photo_id,
                'storage_path': storage_path,
                'duration': 5.0,
                'status': 'ready',
                'review_status': None
            }).execute()
            logger.info(f"Clip record created for photo {photo_id}")
        except Exception as e:
            logger.error(f"Error creating clip record: {str(e)}")


# Create singleton instance
order_processor = OrderProcessor()
