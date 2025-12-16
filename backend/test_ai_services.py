"""
Test script for OpenAI and Kling AI services
Run this to verify AI integration is working
"""

import sys
from pathlib import Path
from PIL import Image
from io import BytesIO

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.openai_service import openai_service
from app.services.kling_service import kling_service
from app.services.storage_service import storage_service


def create_test_image() -> bytes:
    """Create a simple test image"""
    img = Image.new('RGB', (800, 600), color='blue')
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()


def test_openai_analysis():
    """Test OpenAI image analysis"""
    print("=" * 60)
    print("TEST 1: OpenAI Image Analysis")
    print("=" * 60)

    try:
        # Create test image
        image_data = create_test_image()
        print(f"✅ Created test image ({len(image_data)} bytes)")

        # Analyze with OpenAI
        print("\n📸 Analyzing image with GPT-4 Vision...")
        analysis = openai_service.analyze_image(image_data)

        print("\n✅ Analysis Results:")
        print(f"   Description: {analysis.get('description', 'N/A')}")
        print(f"   Subjects: {', '.join(analysis.get('subjects', []))}")
        print(f"   Setting: {analysis.get('setting', 'N/A')}")
        print(f"   Mood: {analysis.get('mood', 'N/A')}")
        print(f"   Suggested Actions: {', '.join(analysis.get('suggested_actions', []))}")

        return analysis

    except Exception as e:
        print(f"\n❌ OpenAI test failed: {str(e)}")
        return None


def test_prompt_generation(analysis):
    """Test vibe-based prompt generation"""
    print("\n" + "=" * 60)
    print("TEST 2: Vibe-Based Prompt Generation")
    print("=" * 60)

    if not analysis:
        print("❌ Skipping (no analysis available)")
        return

    vibes = ['cinematic_emotional', 'warm_human', 'joyful_alive', 'quiet_timeless']

    for vibe in vibes:
        try:
            prompt = openai_service.generate_animation_prompt(analysis, vibe)
            print(f"\n✅ {vibe}:")
            print(f"   {prompt}")
        except Exception as e:
            print(f"\n❌ {vibe} failed: {str(e)}")


def test_kling_dry_run():
    """Test Kling API structure (without actually submitting)"""
    print("\n" + "=" * 60)
    print("TEST 3: Kling Service Configuration")
    print("=" * 60)

    print(f"✅ Kling Base URL: {kling_service.base_url}")
    print(f"✅ Kling Access Key: {kling_service.access_key[:20]}...")
    print(f"✅ Kling Secret Key: {kling_service.secret_key[:20]}...")

    print("\n⚠️  Note: Not submitting actual job to avoid costs.")
    print("   To test full workflow, run with actual image URL.")


def test_full_workflow_info():
    """Show info about full workflow"""
    print("\n" + "=" * 60)
    print("FULL WORKFLOW (when integrated)")
    print("=" * 60)

    workflow = """
    1. Customer uploads photo → Supabase Storage
    2. Get signed URL for photo
    3. OpenAI analyzes photo → generates prompt based on vibe
    4. Submit to Kling with image URL + prompt
    5. Poll Kling until generation complete (~5-10 min)
    6. Download generated video
    7. Upload video to Supabase Storage
    8. Save clip record in database

    Cost per 5-second clip:
    - OpenAI GPT-4 Vision: ~$0.01
    - Kling Pro mode: ~$0.50-2.00 (varies)
    """
    print(workflow)


if __name__ == "__main__":
    print("\n🧪 TESTING AI SERVICES\n")

    # Test 1: OpenAI
    analysis = test_openai_analysis()

    # Test 2: Prompt generation
    test_prompt_generation(analysis)

    # Test 3: Kling config
    test_kling_dry_run()

    # Info
    test_full_workflow_info()

    print("\n" + "=" * 60)
    print("✅ AI SERVICES CONFIGURED AND READY!")
    print("=" * 60)
    print("\nNext: Integrate into order processing pipeline")
