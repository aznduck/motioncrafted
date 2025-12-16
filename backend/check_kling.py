"""
Check Kling task status and download the video
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.kling_service import kling_service
import time

def check_and_download_video(task_id: str):
    """Check status and download video if ready"""
    
    print(f"\n{'='*60}")
    print(f"CHECKING KLING TASK: {task_id}")
    print(f"{'='*60}\n")
    
    # Check status
    print("Checking status...")
    try:
        status = kling_service.check_status(task_id)
        
        print(f"Status: {status.get('status', 'unknown')}")
        print(f"Progress: {status.get('progress', 0)}%")
        
        if status.get('status') == 'completed':
            video_url = status.get('video_url') or status.get('result', {}).get('video_url')
            
            if not video_url:
                print("❌ Video is completed but no URL found!")
                print(f"Full response: {status}")
                return
            
            print(f"\n✅ Video ready!")
            print(f"   URL: {video_url}\n")
            
            # Download it
            print("Downloading video...")
            video_data = kling_service.download_clip(video_url)
            
            # Save to file
            output_path = f"./test_video_{task_id[:8]}.mp4"
            with open(output_path, 'wb') as f:
                f.write(video_data)
            
            print(f"✅ Video saved to: {output_path}")
            print(f"   Size: {len(video_data) / 1024 / 1024:.2f} MB")
            
        elif status.get('status') == 'failed':
            print(f"❌ Task failed!")
            print(f"   Reason: {status.get('error', 'Unknown error')}")
            
        elif status.get('status') in ['pending', 'processing']:
            print(f"⏳ Still processing... Progress: {status.get('progress', 0)}%")
            print(f"   Try again in a few minutes")
            
        else:
            print(f"❓ Unknown status: {status}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_kling.py <task_id>")
        print("\nGet task_id from the output of debug_kling.py")
        sys.exit(1)
    
    task_id = sys.argv[1]
    check_and_download_video(task_id)