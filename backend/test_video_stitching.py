"""
Test script for video stitching functionality
Creates test clips and stitches them together using video_service
"""

import sys
import subprocess
import tempfile
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.video_service import video_service
from app.services.storage_service import storage_service
from app.core.database import get_db


def create_test_clip(output_path: Path, color: str, text: str, duration: int = 5):
    """
    Create a simple test video clip with FFmpeg

    Args:
        output_path: Where to save the clip
        color: Background color (e.g., 'red', 'blue', 'green')
        text: Text to display
        duration: Duration in seconds
    """
    print(f"Creating test clip: {text} ({color})")

    ffmpeg_cmd = [
        'ffmpeg',
        '-f', 'lavfi',
        '-i', f'color=c={color}:s=1920x1080:d={duration}',
        '-vf', (
            f"drawtext="
            f"text='{text}':"
            f"fontsize=80:"
            f"fontcolor=white:"
            f"x=(w-text_w)/2:"
            f"y=(h-text_h)/2"
        ),
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-y',
        str(output_path)
    ]

    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"Failed to create test clip: {result.stderr}")

    print(f"✅ Created: {output_path.name}")


def setup_test_order_with_clips(num_clips: int = 3):
    """
    Create a test order with approved clips

    Args:
        num_clips: Number of test clips to create

    Returns:
        order_id: UUID of created test order
    """
    db = get_db()

    print(f"\n{'='*60}")
    print(f"SETTING UP TEST ORDER WITH {num_clips} CLIPS")
    print(f"{'='*60}\n")

    # Step 1: Create test order
    order_id = str(uuid.uuid4())
    order_data = {
        "id": order_id,
        "customer_name": "Test Customer",
        "customer_email": "test@example.com",
        "vibe": "cinematic_emotional",
        "personalization_message": "Thank you for the wonderful memories! ❤️",
        "status": "approved",  # Set to approved so we can finalize
        "payment_status": "paid"
    }

    print(f"1. Creating test order: {order_id}")
    db.table('orders').insert(order_data).execute()
    print(f"   ✅ Order created\n")

    # Step 2: Create test clips
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        colors = ['red', 'blue', 'green', 'yellow', 'purple']

        for i in range(num_clips):
            photo_id = str(uuid.uuid4())
            clip_id = str(uuid.uuid4())

            print(f"2.{i+1}. Creating test clip {i+1}/{num_clips}")

            # Create photo record
            photo_data = {
                "id": photo_id,
                "order_id": order_id,
                "storage_path": f"test/order_{order_id}/photo_{i+1}.jpg",
                "upload_order": i + 1,
                "animation_prompt": f"Test clip {i+1}"
            }
            db.table('photos').insert(photo_data).execute()
            print(f"   ✅ Photo record created")

            # Generate test video
            color = colors[i % len(colors)]
            clip_file = temp_path / f"test_clip_{i+1}.mp4"
            create_test_clip(
                clip_file,
                color=color,
                text=f"Clip {i+1}",
                duration=5
            )

            # Upload to Supabase Storage
            with open(clip_file, 'rb') as f:
                clip_data = f.read()

            storage_path = storage_service.upload_clip(
                order_id=order_id,
                file_data=clip_data,
                filename=f"test_clip_{i+1}.mp4"
            )
            print(f"   ✅ Uploaded to storage: {storage_path}")

            # Create clip record with approved status
            clip_data_record = {
                "id": clip_id,
                "photo_id": photo_id,
                "storage_path": storage_path,
                "duration": 5.0,
                "status": "ready",
                "review_status": "approved"  # Important: Set to approved
            }
            db.table('clips').insert(clip_data_record).execute()
            print(f"   ✅ Clip record created (approved)\n")

    print(f"✅ Test order setup complete!")
    print(f"   Order ID: {order_id}")
    print(f"   Clips: {num_clips} approved clips\n")

    return order_id


def test_video_stitching(order_id: str):
    """
    Test the video stitching service

    Args:
        order_id: UUID of order to process
    """
    db = get_db()

    print(f"{'='*60}")
    print(f"TESTING VIDEO STITCHING")
    print(f"{'='*60}\n")

    # Get order details
    order_result = db.table('orders').select('*').eq('id', order_id).single().execute()
    order = order_result.data

    print(f"Order: {order_id}")
    print(f"Status: {order['status']}")
    print(f"Message: {order['personalization_message']}\n")

    # Call video service
    print("Starting video creation...")
    print("This will:")
    print("  1. Download approved clips from storage")
    print("  2. Concatenate with 0.5s crossfade transitions")
    print("  3. Create personalization message screen (5s)")
    print("  4. Append message to end")
    print("  5. Upload final video to storage\n")

    try:
        storage_path = video_service.create_final_video(
            order_id=order_id,
            personalization_message=order['personalization_message']
        )

        print(f"\n✅ VIDEO CREATION SUCCESSFUL!")
        print(f"   Storage path: {storage_path}")

        # Get final video info
        final_video_result = db.table('final_videos').select('*').eq('order_id', order_id).single().execute()
        final_video = final_video_result.data

        print(f"   Duration: {final_video.get('duration', 'unknown')} seconds")
        print(f"   File size: {final_video.get('file_size_mb', 'unknown')} MB")

        # Download and save locally for review
        print(f"\n📥 Downloading final video for review...")
        video_data = storage_service.download_file(storage_path)

        output_file = Path(__file__).parent / "test_final_video.mp4"
        with open(output_file, 'wb') as f:
            f.write(video_data)

        print(f"✅ Saved to: {output_file}")
        print(f"\n🎬 You can now watch the video:")
        print(f"   open {output_file}")

        return True

    except Exception as e:
        print(f"\n❌ VIDEO CREATION FAILED")
        print(f"   Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def cleanup_test_order(order_id: str):
    """Clean up test data"""
    db = get_db()

    response = input("\nDo you want to clean up test data? (yes/no): ")
    if response.lower() != 'yes':
        print("Skipping cleanup")
        return

    print(f"\n🗑️  Cleaning up test order {order_id}...")

    # Delete in reverse order of foreign keys
    db.table('final_videos').delete().eq('order_id', order_id).execute()

    # Get photo IDs
    photos_result = db.table('photos').select('id').eq('order_id', order_id).execute()
    photo_ids = [p['id'] for p in (photos_result.data or [])]

    # Delete clips
    if photo_ids:
        db.table('clips').delete().in_('photo_id', photo_ids).execute()

    # Delete photos
    db.table('photos').delete().eq('order_id', order_id).execute()

    # Delete order
    db.table('orders').delete().eq('id', order_id).execute()

    # Delete from storage
    try:
        storage_service.delete_order_files(order_id)
    except:
        pass

    print("✅ Cleanup complete")


def main():
    """Main test flow"""
    print("\n🧪 VIDEO STITCHING TEST\n")

    import sys

    if len(sys.argv) > 1 and sys.argv[1] == 'existing':
        # Test with existing order
        if len(sys.argv) < 3:
            print("Usage: python test_video_stitching.py existing <order_id>")
            return

        order_id = sys.argv[2]
        print(f"Using existing order: {order_id}\n")

    else:
        # Create new test order
        print("Creating new test order with 3 clips...\n")
        order_id = setup_test_order_with_clips(num_clips=3)

    # Test stitching
    success = test_video_stitching(order_id)

    if success:
        print(f"\n{'='*60}")
        print("✅ TEST PASSED!")
        print(f"{'='*60}")
    else:
        print(f"\n{'='*60}")
        print("❌ TEST FAILED")
        print(f"{'='*60}")

    # Cleanup
    if len(sys.argv) <= 1 or sys.argv[1] != 'existing':
        cleanup_test_order(order_id)


if __name__ == "__main__":
    main()
