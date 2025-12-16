"""
Test script for order submission endpoint
Run this after starting the backend server
"""

import requests
from io import BytesIO
from PIL import Image

# Backend URL
API_URL = "http://localhost:8000/api/v1/customer/orders"

# Create test images
def create_test_image(color, filename):
    """Create a simple test image"""
    img = Image.new('RGB', (800, 600), color=color)
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    return (filename, img_byte_arr, 'image/jpeg')

# Prepare test data
data = {
    'customer_name': 'Test Customer',
    'customer_email': 'test@example.com',
    'vibe': 'cinematic_emotional',
    'personalization_message': 'This is a test order for our automated photo animation service!'
}

# Create 5 test images
files = [
    ('photos', create_test_image('red', 'test1.jpg')),
    ('photos', create_test_image('blue', 'test2.jpg')),
    ('photos', create_test_image('green', 'test3.jpg')),
    ('photos', create_test_image('yellow', 'test4.jpg')),
    ('photos', create_test_image('purple', 'test5.jpg')),
]

print("🚀 Submitting test order...")
print(f"   Customer: {data['customer_name']}")
print(f"   Email: {data['customer_email']}")
print(f"   Vibe: {data['vibe']}")
print(f"   Photos: {len(files)}")
print()

try:
    # Send POST request
    response = requests.post(API_URL, data=data, files=files)

    if response.status_code == 200:
        result = response.json()
        print("✅ SUCCESS!")
        print(f"   Order ID: {result['order_id']}")
        print(f"   Message: {result['message']}")
        print()
        print("📝 Check Supabase to verify:")
        print("   1. Order exists in 'orders' table")
        print("   2. 5 photos exist in 'photos' table")
        print("   3. Photos uploaded to Storage bucket")
    else:
        print(f"❌ FAILED: {response.status_code}")
        print(f"   Error: {response.json()}")

except Exception as e:
    print(f"❌ ERROR: {str(e)}")
    print()
    print("Make sure the backend is running:")
    print("   cd backend")
    print("   python main.py")
