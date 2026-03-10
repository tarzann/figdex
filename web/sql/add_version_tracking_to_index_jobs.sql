-- Add version tracking columns to index_jobs table
-- This enables passing version info from job creation to index saving

BEGIN;

-- Add Figma version tracking to jobs
ALTER TABLE index_jobs 
ADD COLUMN IF NOT EXISTS figma_version TEXT,
ADD COLUMN IF NOT EXISTS figma_last_modified TIMESTAMPTZ;

COMMENT ON COLUMN index_jobs.figma_version IS 'Figma file version string from API, passed from job creation to index saving';
COMMENT ON COLUMN index_jobs.figma_last_modified IS 'Timestamp of last modification from Figma API';

COMMIT;

