"""
Test script for order processing pipeline

This script can be used to:
1. Trigger processing for an existing order (dry run or real)
2. Check order status
3. Test individual components

IMPORTANT: Running this with real orders will call Kling API and cost money!
"""

import sys
import asyncio
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.order_processor import order_processor
from app.services.storage_service import storage_service


async def check_order_status(order_id: str):
    """Check the current status of an order"""
    print(f"\n{'='*60}")
    print(f"ORDER STATUS CHECK: {order_id}")
    print(f"{'='*60}\n")

    db = storage_service.client

    # Fetch order
    try:
        result = db.table('orders').select('*').eq('id', order_id).single().execute()
        order = result.data

        if not order:
            print(f"❌ Order not found: {order_id}")
            return

        print(f"✅ Order Details:")
        print(f"   Customer: {order['customer_name']}")
        print(f"   Email: {order['customer_email']}")
        print(f"   Vibe: {order['vibe']}")
        print(f"   Status: {order['status']}")
        print(f"   Created: {order['created_at']}")

        # Fetch photos
        photos_result = db.table('photos').select('*').eq('order_id', order_id).order('upload_order').execute()
        photos = photos_result.data or []

        print(f"\n✅ Photos: {len(photos)} uploaded")
        for photo in photos:
            print(f"   - Photo {photo['upload_order']}: {photo['storage_path']}")
            if photo.get('animation_prompt'):
                print(f"     Prompt: {photo['animation_prompt'][:80]}...")

        # Fetch clips
        clips_result = db.table('clips').select('*, photos!inner(order_id)').eq('photos.order_id', order_id).execute()
        clips = clips_result.data or []

        print(f"\n✅ Clips: {len(clips)} generated")
        for clip in clips:
            print(f"   - Clip {clip['id'][:8]}...")
            print(f"     Status: {clip['status']}")
            print(f"     Review: {clip.get('review_status', 'pending')}")
            print(f"     Path: {clip['storage_path']}")

    except Exception as e:
        print(f"❌ Error checking order: {str(e)}")


async def process_existing_order(order_id: str, dry_run: bool = True):
    """
    Process an existing order through the AI pipeline

    Args:
        order_id: UUID of order to process
        dry_run: If True, shows what would happen without calling Kling
    """
    print(f"\n{'='*60}")
    if dry_run:
        print(f"DRY RUN MODE - No actual Kling calls will be made")
    else:
        print(f"⚠️  REAL MODE - This will call Kling API and cost money!")
    print(f"{'='*60}\n")

    if not dry_run:
        confirm = input("Are you sure you want to process with real Kling calls? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Cancelled.")
            return

    if dry_run:
        print("🔍 Dry run - checking order details...")
        await check_order_status(order_id)
        print("\n✅ Dry run complete. Order details shown above.")
        print("   To process for real, run with dry_run=False")
    else:
        print(f"🚀 Starting order processing: {order_id}")
        success = await order_processor.process_order(order_id)

        if success:
            print(f"\n✅ Order processing complete!")
        else:
            print(f"\n❌ Order processing failed. Check logs above.")

        # Show final status
        await check_order_status(order_id)


async def main():
    """Main test interface"""
    print("\n🧪 ORDER PROCESSING TEST SCRIPT\n")

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python test_order_processing.py <command> [order_id]")
        print("\nCommands:")
        print("  status <order_id>     - Check order status")
        print("  process <order_id>    - Process order (dry run)")
        print("  process-real <order_id> - Process order (REAL - costs money!)")
        print("\nExample:")
        print("  python test_order_processing.py status abc-123-def")
        return

    command = sys.argv[1]
    order_id = sys.argv[2] if len(sys.argv) > 2 else None

    if command == "status":
        if not order_id:
            print("❌ Please provide an order_id")
            return
        await check_order_status(order_id)

    elif command == "process":
        if not order_id:
            print("❌ Please provide an order_id")
            return
        await process_existing_order(order_id, dry_run=True)

    elif command == "process-real":
        if not order_id:
            print("❌ Please provide an order_id")
            return
        await process_existing_order(order_id, dry_run=False)

    else:
        print(f"❌ Unknown command: {command}")
        print("   Use 'status', 'process', or 'process-real'")


if __name__ == "__main__":
    asyncio.run(main())
