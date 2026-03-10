-- Add credits columns to users table
-- This migration adds support for the credits system

-- Add credits_remaining column (default 0)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0;

-- Add credits_reset_date column (nullable, for tracking when credits reset)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS credits_reset_date DATE;

-- Add index on credits_remaining for fast queries
CREATE INDEX IF NOT EXISTS idx_users_credits_remaining ON users(credits_remaining);

-- Add comment to columns
COMMENT ON COLUMN users.credits_remaining IS 'Current credit balance for the user';
COMMENT ON COLUMN users.credits_reset_date IS 'Date when credits will reset to base amount (monthly reset)';

-- Optional: Set initial credits for existing users based on their plan
-- Free plan: 100 credits, Pro plan: 1000 credits, Team plan: 2000 credits
-- This is a one-time update for existing users
UPDATE users 
SET credits_remaining = CASE
  WHEN is_admin = true THEN 0  -- Admins have unlimited, set to 0 or NULL
  WHEN plan = 'pro' THEN 1000
  WHEN plan = 'team' THEN 2000
  ELSE 100  -- free plan or null
END
WHERE credits_remaining = 0 OR credits_remaining IS NULL;

-- Optional: Set credits_reset_date for existing users (first of next month)
-- Uncomment if you want to set reset dates for existing users
-- UPDATE users 
-- SET credits_reset_date = DATE_TRUNC('month', NOW() + INTERVAL '1 month')
-- WHERE credits_reset_date IS NULL AND credits_remaining > 0;

