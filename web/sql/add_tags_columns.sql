-- Add tags columns to index_files table
ALTER TABLE index_files 
ADD COLUMN IF NOT EXISTS frame_tags JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_tags JSONB DEFAULT '[]';









