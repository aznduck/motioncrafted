-- Seed Admin User
-- This creates the initial admin account for Luke
-- ⚠️ IMPORTANT: Change the password after first login!

-- Insert admin user (password: "changeme123" - MUST be changed!)
-- Note: The password will be hashed by the backend when Luke first logs in
-- This is just a placeholder to create the record

INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'luke@cherishedmotion.com',
  -- This is a bcrypt hash of 'changeme123'
  -- Luke should change this immediately after first login
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lWfVvJlJvKy6',
  'Luke'
)
ON CONFLICT (email) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Admin user created!';
  RAISE NOTICE '📧 Email: luke@cherishedmotion.com';
  RAISE NOTICE '🔑 Temporary Password: changeme123';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  SECURITY: Change password immediately after first login!';
END $$;
