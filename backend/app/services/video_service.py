"""
Video Processing Service - Stitch clips together with FFmpeg
Handles concatenation, transitions, and text overlays
"""

import os
import subprocess
import tempfile
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

from app.services.storage_service import storage_service
from app.core.database import get_db

logger = logging.getLogger(__name__)


class VideoService:
    """Service for processing and stitching video clips"""

    def __init__(self):
        self.storage = storage_service
        self.db = get_db()

    def create_final_video(
        self,
        order_id: str,
        personalization_message: str,
        vibe: str = "cinematic_emotional"
    ) -> str:
        """
        Create final video by stitching approved clips with transitions and message

        Args:
            order_id: UUID of the order
            personalization_message: Message to display at end
            vibe: Video vibe for music selection

        Returns:
            Storage path of final video

        Raises:
            Exception: If video creation fails
        """
        logger.info(f"Starting video creation for order {order_id}")

        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            try:
                # Step 1: Get approved clips
                clips = self._get_approved_clips(order_id)

                if not clips or len(clips) == 0:
                    raise Exception("No approved clips found for this order")

                logger.info(f"Found {len(clips)} approved clips")

                # Step 2: Download clips to temp directory
                clip_files = self._download_clips(clips, temp_path)

                # Step 3: Create personalization message video
                message_file = self._create_message_video(
                    personalization_message,
                    temp_path
                )

                # Step 4: Concatenate clips with fade transitions
                clips_video = self._concatenate_clips(
                    clip_files,
                    temp_path
                )

                # Step 5: Concatenate clips video with message and add music
                final_video = self._concatenate_final_video(
                    clips_video,
                    message_file,
                    vibe,
                    temp_path
                )

                # Step 6: Upload final video to storage
                logger.info("Uploading final video to storage")
                with open(final_video, 'rb') as f:
                    video_data = f.read()

                storage_path = self.storage.upload_final_video(
                    order_id=order_id,
                    file_data=video_data,
                    filename="final_video.mp4"
                )

                logger.info(f"Final video uploaded: {storage_path}")

                # Step 7: Create final_videos record
                self._create_final_video_record(
                    order_id,
                    storage_path,
                    final_video
                )

                return storage_path

            except Exception as e:
                logger.error(f"Video creation failed: {str(e)}")
                raise

    def _get_approved_clips(self, order_id: str) -> List[Dict[str, Any]]:
        """Get all approved clips for an order, sorted by photo upload order"""

        # Get all photos for this order
        photos_result = self.db.table('photos').select('id').eq('order_id', order_id).order('upload_order').execute()
        photo_ids = [p['id'] for p in (photos_result.data or [])]

        if not photo_ids:
            return []

        # Get approved clips for these photos
        clips_result = self.db.table('clips').select('*').in_('photo_id', photo_ids).eq('review_status', 'approved').execute()
        clips = clips_result.data or []

        # Sort clips by photo upload order
        photo_order_map = {p['id']: idx for idx, p in enumerate(photos_result.data or [])}
        clips.sort(key=lambda c: photo_order_map.get(c['photo_id'], 999))

        return clips

    def _download_clips(
        self,
        clips: List[Dict[str, Any]],
        temp_path: Path
    ) -> List[Path]:
        """Download clips from storage to temporary directory"""

        clip_files = []

        for idx, clip in enumerate(clips):
            logger.info(f"Downloading clip {idx + 1}/{len(clips)}")

            # Download clip
            clip_data = self.storage.download_file(clip['storage_path'])

            # Save to temp file
            clip_file = temp_path / f"clip_{idx:03d}.mp4"
            with open(clip_file, 'wb') as f:
                f.write(clip_data)

            clip_files.append(clip_file)

        return clip_files

    def _create_message_video(
        self,
        message: str,
        temp_path: Path,
        duration: int = 5
    ) -> Path:
        """
        Create a video with text overlay for personalization message

        Args:
            message: The personalization message
            temp_path: Temporary directory
            duration: Duration in seconds (default 5)

        Returns:
            Path to created message video
        """
        logger.info("Creating personalization message video")

        output_file = temp_path / "message.mp4"

        # Escape special characters in message for FFmpeg
        escaped_message = message.replace("'", "'\\\\\\''").replace(":", "\\:")

        # Create a black screen with white text
        # Using drawtext filter with proper formatting
        ffmpeg_cmd = [
            'ffmpeg',
            '-f', 'lavfi',
            '-i', f'color=c=black:s=1920x1080:d={duration}',
            '-vf', (
                f"drawtext="
                f"text='{escaped_message}':"
                f"fontsize=60:"
                f"fontcolor=white:"
                f"x=(w-text_w)/2:"  # Center horizontally
                f"y=(h-text_h)/2:"  # Center vertically
                f"box=1:"
                f"boxcolor=black@0.5:"
                f"boxborderw=10"
            ),
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-y',  # Overwrite output file
            str(output_file)
        ]

        logger.info(f"Running FFmpeg: {' '.join(ffmpeg_cmd)}")
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise Exception(f"Failed to create message video: {result.stderr}")

        return output_file

    def _concatenate_clips(
        self,
        clip_files: List[Path],
        temp_path: Path
    ) -> Path:
        """
        Concatenate clips with hard cuts (no transitions)
        Normalizes all videos to 1080p (1920x1080) before concatenating
        """

        logger.info(f"Concatenating {len(clip_files)} clips with hard cuts")

        output_file = temp_path / "clips_concatenated.mp4"

        # Build FFmpeg command
        ffmpeg_cmd = ['ffmpeg']

        # Add inputs
        for clip_file in clip_files:
            ffmpeg_cmd.extend(['-i', str(clip_file)])

        # Build filter: scale each video to 1920x1080 with padding, then concat
        # This ensures all videos have the same dimensions
        filter_parts = []
        for i in range(len(clip_files)):
            # Scale and pad each video to 1920x1080
            # scale=1920:1080:force_original_aspect_ratio=decrease pads with black bars
            # pad=1920:1080:(ow-iw)/2:(oh-ih)/2 centers the video
            filter_parts.append(
                f'[{i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,'
                f'pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v{i}]'
            )

        # Concatenate all normalized videos
        concat_inputs = ''.join(f'[v{i}]' for i in range(len(clip_files)))
        filter_complex = ';'.join(filter_parts) + f';{concat_inputs}concat=n={len(clip_files)}:v=1:a=0[v]'

        # concat filter (video only)
        ffmpeg_cmd.extend([
            '-filter_complex',
            filter_complex,
            '-map', '[v]',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-y',
            str(output_file)
        ])

        logger.info("Running FFmpeg concatenation with normalization")
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise Exception(f"Failed to concatenate clips: {result.stderr}")

        return output_file


    def _concatenate_final_video(
        self,
        clips_video: Path,
        message_video: Path,
        vibe: str,
        temp_path: Path
    ) -> Path:
        """
        Concatenate clips video with message video and add background music

        Args:
            clips_video: Path to concatenated clips
            message_video: Path to message video
            vibe: Video vibe for music selection
            temp_path: Temporary directory

        Returns:
            Path to final video with music
        """
        logger.info("Creating final video with message and music")

        # Map vibes to music files
        music_map = {
            "cinematic_emotional": "cinematic_emotional.mp3",
            "warm_human": "warm_human.mp3",
            "joyful_alive": "joyful_alive.mp3",
            "quiet_timeless": "quiet_timeless.mp3"
        }

        music_filename = music_map.get(vibe, "cinematic_emotional.mp3")
        music_path = Path(__file__).parent.parent / "assets" / music_filename

        output_file = temp_path / "final.mp4"

        # Check if music file exists
        if not music_path.exists():
            logger.warning(f"Music file not found: {music_path}, creating video without music")
            # Fallback to no music
            ffmpeg_cmd = [
                'ffmpeg',
                '-i', str(clips_video),
                '-i', str(message_video),
                '-filter_complex',
                '[0:v]setpts=PTS-STARTPTS[v0];'
                '[1:v]setpts=PTS-STARTPTS[v1];'
                '[v0][v1]concat=n=2:v=1:a=0[v]',
                '-map', '[v]',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                '-r', '30',
                '-y',
                str(output_file)
            ]
        else:
            logger.info(f"Adding background music: {music_filename}")
            # Concatenate videos and add music in one command
            ffmpeg_cmd = [
                'ffmpeg',
                '-i', str(clips_video),      # Input 0: clips
                '-i', str(message_video),    # Input 1: message
                '-stream_loop', '-1',        # Loop audio infinitely
                '-i', str(music_path),       # Input 2: music
                '-filter_complex',
                # Concatenate videos
                '[0:v]setpts=PTS-STARTPTS[v0];'
                '[1:v]setpts=PTS-STARTPTS[v1];'
                '[v0][v1]concat=n=2:v=1:a=0[v];'
                # Lower music volume
                '[2:a]volume=-20dB[a]',
                '-map', '[v]',               # Map concatenated video
                '-map', '[a]',               # Map processed audio
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                '-r', '30',
                '-c:a', 'aac',               # Encode audio as AAC
                '-shortest',                 # End when video ends
                '-y',
                str(output_file)
            ]

        logger.info("Running final concatenation with music")
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise Exception(f"Failed to create final video: {result.stderr}")

        return output_file

    def _create_final_video_record(
        self,
        order_id: str,
        storage_path: str,
        video_file: Path
    ):
        """Create final_videos database record"""

        # Get file size
        file_size_bytes = os.path.getsize(video_file)
        file_size_mb = file_size_bytes / (1024 * 1024)

        # Get video duration using ffprobe
        try:
            result = subprocess.run(
                [
                    'ffprobe',
                    '-v', 'error',
                    '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    str(video_file)
                ],
                capture_output=True,
                text=True,
                check=True
            )
            duration = float(result.stdout.strip())
        except Exception as e:
            logger.warning(f"Could not get video duration: {e}")
            duration = None

        # Create record
        self.db.table('final_videos').insert({
            'order_id': order_id,
            'storage_path': storage_path,
            'duration': duration,
            'file_size_mb': file_size_mb
        }).execute()


# Singleton instance
video_service = VideoService()
