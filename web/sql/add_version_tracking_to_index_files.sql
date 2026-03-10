-- Add version tracking columns to index_files table
-- This enables incremental re-indexing by tracking Figma file version and frame IDs

BEGIN;

-- Add Figma version tracking
ALTER TABLE index_files 
ADD COLUMN IF NOT EXISTS figma_version TEXT,
ADD COLUMN IF NOT EXISTS figma_last_modified TIMESTAMPTZ;

-- Add frame_ids array for quick comparison
ALTER TABLE index_files 
ADD COLUMN IF NOT EXISTS frame_ids TEXT[] DEFAULT ARRAY[]::text[];

-- Create index for faster lookups by file_key and version
CREATE INDEX IF NOT EXISTS idx_index_files_figma_version 
ON index_files(figma_file_key, figma_version);

-- Create GIN index for frame_ids array searches
CREATE INDEX IF NOT EXISTS idx_index_files_frame_ids 
ON index_files USING GIN(frame_ids);

COMMENT ON COLUMN index_files.figma_version IS 'Figma file version string from API (e.g., "1234567890")';
COMMENT ON COLUMN index_files.figma_last_modified IS 'Timestamp of last modification from Figma API';
COMMENT ON COLUMN index_files.frame_ids IS 'Array of all frame node IDs in this index for quick change detection';

COMMIT;

