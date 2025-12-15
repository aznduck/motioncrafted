-- Cherished Motion Lab - Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Customer Orders Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  vibe TEXT NOT NULL CHECK (vibe IN ('cinematic_emotional', 'warm_human', 'joyful_alive', 'quiet_timeless')),
  personalization_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
    -- Status flow: pending → processing → generating_clips → pending_review → approved → completed
  payment_status TEXT DEFAULT 'unpaid',
  payment_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Admin Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Photos Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- Path in Supabase Storage
  upload_order INTEGER NOT NULL,        -- Order: 1, 2, 3, etc.
  analysis_result JSONB,                -- OpenAI analysis result
  animation_prompt TEXT,                -- Generated prompt for Kling
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Clips Table (Generated Animations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- Path in Supabase Storage
  duration REAL DEFAULT 5.0,            -- Duration in seconds
  status TEXT DEFAULT 'generating',     -- generating | ready | approved | rejected
  review_status TEXT,                   -- approved | rejected | needs_regen
  admin_notes TEXT,                     -- Luke's notes if rejected
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Final Videos Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS final_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- Path in Supabase Storage
  duration REAL,                        -- Total duration in seconds
  file_size_mb REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(order_id);
CREATE INDEX IF NOT EXISTS idx_clips_photo ON clips(photo_id);
CREATE INDEX IF NOT EXISTS idx_clips_review ON clips(review_status);

-- ============================================================================
-- Updated_at Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) - Basic Setup
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_videos ENABLE ROW LEVEL SECURITY;

-- Allow service role (backend) full access to all tables
CREATE POLICY "Service role has full access to orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to photos" ON photos
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to clips" ON clips
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to final_videos" ON final_videos
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '📝 Tables created: orders, admin_users, photos, clips, final_videos';
  RAISE NOTICE '🔒 Row Level Security enabled';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '1. Run the seed script to create admin user';
  RAISE NOTICE '2. Set up Storage bucket: cherished-motion-videos';
END $$;
