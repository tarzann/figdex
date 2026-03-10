-- Add custom_tags column to users table for storing user's personal custom tags
-- This allows users to have their own set of custom tags that persist across sessions

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS custom_tags JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries (though JSONB already has good indexing)
CREATE INDEX IF NOT EXISTS idx_users_custom_tags ON users USING gin(custom_tags);

-- Add comment to column
COMMENT ON COLUMN users.custom_tags IS 'Array of custom tag names that belong to the user (e.g., ["Review", "Done", "To Fix"])';

