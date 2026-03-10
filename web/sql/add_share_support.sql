-- Add share support to index_files table
ALTER TABLE index_files ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE index_files ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for better performance when querying by share_token
CREATE INDEX IF NOT EXISTS idx_index_files_share_token ON index_files(share_token);
CREATE INDEX IF NOT EXISTS idx_index_files_is_public ON index_files(is_public);

-- Generate share tokens for any existing public indices (if needed)
-- UPDATE index_files SET share_token = gen_random_uuid()::text WHERE is_public = true AND share_token IS NULL;


