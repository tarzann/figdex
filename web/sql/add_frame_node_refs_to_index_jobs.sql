-- Add columns for storing frame node references and document data
-- This allows processing frames in background job instead of during creation

ALTER TABLE index_jobs
ADD COLUMN IF NOT EXISTS frame_node_refs JSONB,
ADD COLUMN IF NOT EXISTS document_data JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_index_jobs_frame_node_refs ON index_jobs USING GIN (frame_node_refs);



