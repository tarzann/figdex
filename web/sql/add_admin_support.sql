-- Add admin support to users table
-- This script adds the is_admin field and creates the first admin user

-- Add is_admin field to users table
ALTER TABLE IF EXISTS users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Update: Set your admin email here (replace with actual admin email)
-- This will set the first admin user
-- Run this command separately after the table is updated:

-- UPDATE users SET is_admin = true WHERE email = 'your_admin_email@example.com';

-- Optional: Add admin logs table for future audit logging
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT, -- 'user' or 'index'
  target_id INTEGER,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id);


