"""
Debug script to test Kling API with a photo from the failed order
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.storage_service import storage_service
from app.services.kling_service import kling_service

def test_kling_submission(order_id: str):
    """Test Kling with a photo from the order"""

    db = storage_service.client

    # Get first photo from order
    print(f"\n{'='*60}")
    print("DEBUGGING KLING API SUBMISSION")
    print(f"{'='*60}\n")

    result = db.table('photos').select('*').eq('order_id', order_id).order('upload_order').limit(1).execute()

    if not result.data or len(result.data) == 0:
        print("❌ No photos found for order")
        return

    photo = result.data[0]

    print(f"✅ Photo found:")
    print(f"   ID: {photo['id']}")
    print(f"   Storage Path: {photo['storage_path']}")
    print(f"   Prompt: {photo.get('animation_prompt', 'No prompt')}\n")

    # Step 1: Get signed URL
    print("Step 1: Getting signed URL...")
    try:
        photo_url = storage_service.get_public_url(photo['storage_path'])
        print(f"✅ Got URL: {photo_url[:100]}...\n")
    except Exception as e:
        print(f"❌ Failed to get signed URL: {str(e)}")
        import traceback
        traceback.print_exc()
        return

    # Step 2: Submit to Kling
    print("Step 2: Submitting to Kling API...")
    print(f"   Image URL: {photo_url[:80]}...")
    print(f"   Prompt: {photo.get('animation_prompt', 'Animate this image')}")
    print(f"   Duration: 5 seconds\n")

    try:
        task_id = kling_service.create_animation(
            image_url=photo_url,
            prompt=photo.get('animation_prompt', 'Animate this image'),
            duration=5
        )

        print(f"✅ Success! Task ID: {task_id}")
        print(f"\n⚠️  Task submitted. Not polling to avoid charges.")
        print(f"   Check Kling dashboard to see if it's processing.")

    except Exception as e:
        print(f"\n❌ FAILED TO SUBMIT TO KLING:")
        print(f"   Error: {str(e)}\n")
        print("Full traceback:")
        import traceback
        traceback.print_exc()

        print("\n🔍 Debugging info:")
        print(f"   Kling Base URL: {kling_service.base_url}")
        print(f"   Kling Access Key: {kling_service.access_key[:20]}...")
        print(f"   Photo URL starts with: {photo_url[:50]}...")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_kling.py <order_id>")
        print("\nExample:")
        print("  python debug_kling.py 7211c7ff-94f6-4d3a-a6c3-7c9a155a91e3")
        sys.exit(1)

    order_id = sys.argv[1]
    test_kling_submission(order_id)
