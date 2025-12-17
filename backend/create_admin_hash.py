"""
Quick script to generate password hash for new admin users
Run with: python create_admin_hash.py
"""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("=== Admin Password Hash Generator ===\n")

email = input("Enter admin email: ")
password = input("Enter password: ")

password_hash = pwd_context.hash(password)

print("\n=== Copy these values to Supabase ===")
print(f"\nEmail: {email}")
print(f"Password Hash: {password_hash}")
print("\nTo add to Supabase:")
print("1. Go to Supabase → Table Editor → admin_users")
print("2. Click 'Insert row'")
print("3. Paste the values above")
print("4. Add a name for the admin user")
print("5. Click 'Save'\n")
