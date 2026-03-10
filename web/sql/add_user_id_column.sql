-- Add user_id column to index_files table
ALTER TABLE index_files 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_index_files_user_id ON index_files(user_id);

-- Update existing records to link them to a user (if there's a default user)
-- This can be done manually later if needed
