"""
Test script for Admin API endpoints
Tests authentication and order management
"""

import requests
import json
from pathlib import Path

# Base URL (update if deployed)
BASE_URL = "http://localhost:8000/api/v1"

# Test admin credentials (from seed script)
ADMIN_EMAIL = "dhan6663@usc.edu"
ADMIN_PASSWORD = "changeme123"  # Change this to match your seed script password


def test_admin_login():
    """Test admin login and get JWT token"""
    print("\n" + "="*60)
    print("TEST 1: Admin Login")
    print("="*60)

    response = requests.post(
        f"{BASE_URL}/admin/login",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
    )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful!")
        print(f"   Token: {data['access_token'][:50]}...")
        print(f"   Token type: {data['token_type']}")
        return data['access_token']
    else:
        print(f"❌ Login failed: {response.text}")
        return None


def test_list_orders(token):
    """Test listing orders"""
    print("\n" + "="*60)
    print("TEST 2: List Orders")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Test without filter
    response = requests.get(
        f"{BASE_URL}/admin/orders",
        headers=headers
    )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data['total']} orders")
        for order in data['orders'][:3]:  # Show first 3
            print(f"   - {order['id'][:8]}... | {order['customer_name']} | {order['status']} | {order['photo_count']} photos, {order['clip_count']} clips")
        return data['orders'][0]['id'] if data['orders'] else None
    else:
        print(f"❌ Failed: {response.text}")
        return None


def test_order_detail(token, order_id):
    """Test getting order details"""
    print("\n" + "="*60)
    print(f"TEST 3: Get Order Detail - {order_id[:8]}...")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{BASE_URL}/admin/orders/{order_id}",
        headers=headers
    )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Order Details:")
        print(f"   Customer: {data['customer_name']} <{data['customer_email']}>")
        print(f"   Vibe: {data['vibe']}")
        print(f"   Status: {data['status']}")
        print(f"   Photos: {len(data['photos'])}")
        print(f"   Clips: {len(data['clips'])}")

        if data['clips']:
            print(f"\n   First clip:")
            clip = data['clips'][0]
            print(f"   - ID: {clip['id'][:8]}...")
            print(f"   - Status: {clip['status']}")
            print(f"   - Review: {clip.get('review_status', 'pending')}")
            return clip['id']
        return None
    else:
        print(f"❌ Failed: {response.text}")
        return None


def test_approve_clip(token, clip_id):
    """Test approving a clip"""
    print("\n" + "="*60)
    print(f"TEST 4: Approve Clip - {clip_id[:8]}...")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.post(
        f"{BASE_URL}/admin/clips/{clip_id}/approve",
        headers=headers
    )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ {data['message']}")
        print(f"   Clip ID: {data['clip_id'][:8]}...")
        print(f"   Status: {data['status']}")
    else:
        print(f"❌ Failed: {response.text}")


def test_without_auth():
    """Test that endpoints require authentication"""
    print("\n" + "="*60)
    print("TEST 5: Auth Protection")
    print("="*60)

    response = requests.get(f"{BASE_URL}/admin/orders")

    print(f"Status: {response.status_code}")

    if response.status_code == 403:
        print(f"✅ Endpoint is protected (403 Forbidden)")
    else:
        print(f"⚠️  Expected 403, got {response.status_code}")


def main():
    """Run all tests"""
    print("\n🧪 TESTING ADMIN API ENDPOINTS\n")
    print("Make sure the server is running: python main.py")
    print("")

    # Test 1: Login
    token = test_admin_login()
    if not token:
        print("\n❌ Cannot continue without auth token")
        return

    # Test 2: List orders
    order_id = test_list_orders(token)
    if not order_id:
        print("\n⚠️  No orders found. Create an order first with test_order_submission.py")
        return

    # Test 3: Order detail
    clip_id = test_order_detail(token, order_id)

    # Test 4: Approve clip (if clip exists)
    if clip_id:
        test_approve_clip(token, clip_id)
    else:
        print("\n⚠️  No clips found to test approval")

    # Test 5: Auth protection
    test_without_auth()

    print("\n" + "="*60)
    print("✅ ADMIN API TESTS COMPLETE")
    print("="*60)
    print("\nNext: Test the stream endpoint in a browser:")
    if clip_id:
        print(f"   http://localhost:8000/api/v1/admin/clips/{clip_id}/stream")
        print(f"   (Add Authorization: Bearer {token[:30]}... header)")


if __name__ == "__main__":
    main()
