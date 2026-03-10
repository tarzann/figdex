-- Create the index_files table
CREATE TABLE IF NOT EXISTS index_files (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  figma_file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  index_data JSONB NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_index_files_figma_file_key ON index_files(figma_file_key);
CREATE INDEX IF NOT EXISTS idx_index_files_uploaded_at ON index_files(uploaded_at);
