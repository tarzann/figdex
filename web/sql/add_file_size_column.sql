-- Add file_size column to index_files table
ALTER TABLE index_files 
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Create index for better performance (optional, but can help with sorting/filtering)
CREATE INDEX IF NOT EXISTS idx_index_files_file_size ON index_files(file_size);

-- Update existing records to calculate file_size from index_data
-- This will set file_size for existing records based on the size of index_data
UPDATE index_files 
SET file_size = pg_column_size(index_data)
WHERE file_size IS NULL;


