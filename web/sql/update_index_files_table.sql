-- Update index_files table to support tags and user_id
-- Add user_id column if it doesn't exist
ALTER TABLE index_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add tags column to store frame tags
ALTER TABLE index_files ADD COLUMN IF NOT EXISTS frame_tags JSONB DEFAULT '[]'::jsonb;

-- Add custom_tags column to store custom tags
ALTER TABLE index_files ADD COLUMN IF NOT EXISTS custom_tags JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_index_files_user_id ON index_files(user_id);
CREATE INDEX IF NOT EXISTS idx_index_files_frame_tags ON index_files USING GIN(frame_tags);
CREATE INDEX IF NOT EXISTS idx_index_files_custom_tags ON index_files USING GIN(custom_tags);

-- Update existing records to have empty arrays for tags
UPDATE index_files SET frame_tags = '[]'::jsonb WHERE frame_tags IS NULL;
UPDATE index_files SET custom_tags = '[]'::jsonb WHERE custom_tags IS NULL;









