-- Add share_name column to shared_views table
ALTER TABLE shared_views 
ADD COLUMN IF NOT EXISTS share_name TEXT;

-- Add comment
COMMENT ON COLUMN shared_views.share_name IS 'User-defined name for the share link (optional)';

