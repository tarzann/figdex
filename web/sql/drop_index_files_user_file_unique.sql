-- Drop unique constraint on (user_id, figma_file_key) to allow one-index-per-page model.
-- Multiple indices per file (one per page) are now supported.
-- Run this in Supabase SQL Editor: Dashboard -> SQL Editor -> New query

-- Drop the unique constraint/index (PostgreSQL: unique constraint creates an index with same name)
ALTER TABLE index_files DROP CONSTRAINT IF EXISTS idx_index_files_user_file_key;
DROP INDEX IF EXISTS idx_index_files_user_file_key;

-- Create non-unique index for query performance
CREATE INDEX IF NOT EXISTS idx_index_files_user_file ON index_files(user_id, figma_file_key);
