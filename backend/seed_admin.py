"""
Seed script to create initial admin user
Run this once to set up the admin account
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import get_db
from app.core.security import hash_password
import uuid

def create_admin_user():
    """Create the initial admin user"""
    db = get_db()

    # Admin user details
    admin_email = "dhan6663@usc.edu"
    admin_password = "changeme123"
    admin_name = "Admin User"

    print(f"\n{'='*60}")
    print("CREATING ADMIN USER")
    print(f"{'='*60}\n")

    # Check if admin already exists
    try:
        result = db.table('admin_users').select('*').eq('email', admin_email).execute()

        if result.data and len(result.data) > 0:
            print(f"⚠️  Admin user already exists: {admin_email}")
            print(f"   User ID: {result.data[0]['id']}")
            print(f"   Name: {result.data[0]['name']}")

            # Ask if they want to update password
            update = input("\nDo you want to update the password? (yes/no): ")
            if update.lower() == 'yes':
                password_hash = hash_password(admin_password)
                db.table('admin_users').update({
                    'password_hash': password_hash
                }).eq('email', admin_email).execute()
                print(f"✅ Password updated!")

            return

    except Exception as e:
        pass  # User doesn't exist, continue to create

    # Hash password
    password_hash = hash_password(admin_password)

    # Create admin user
    admin_data = {
        "id": str(uuid.uuid4()),
        "email": admin_email,
        "password_hash": password_hash,
        "name": admin_name
    }

    try:
        result = db.table('admin_users').insert(admin_data).execute()

        print(f"✅ Admin user created successfully!")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print(f"   Name: {admin_name}")
        print(f"\n⚠️  IMPORTANT: Change the password after first login!")

    except Exception as e:
        print(f"❌ Failed to create admin user: {str(e)}")
        raise


if __name__ == "__main__":
    create_admin_user()

    print(f"\n{'='*60}")
    print("✅ SEED COMPLETE")
    print(f"{'='*60}")
    print(f"\nYou can now log in at:")
    print(f"   POST http://localhost:8000/api/v1/admin/login")
    print(f"   Email: dhan6663@usc.edu")
    print(f"   Password: changeme123")
