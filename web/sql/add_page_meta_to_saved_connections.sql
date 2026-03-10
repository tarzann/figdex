-- Add page_meta column to saved_connections table
-- This stores full page metadata including frameCount for statistics

BEGIN;

ALTER TABLE saved_connections 
ADD COLUMN IF NOT EXISTS page_meta JSONB;

COMMENT ON COLUMN saved_connections.page_meta IS 'Full page metadata including frameCount for calculating statistics (total pages, empty pages, indexed pages)';

COMMIT;

