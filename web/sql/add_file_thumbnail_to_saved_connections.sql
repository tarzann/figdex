-- Add file_thumbnail_url column to saved_connections table
-- This stores the thumbnail URL of the Figma file (typically from the first frame)

BEGIN;

ALTER TABLE saved_connections 
ADD COLUMN IF NOT EXISTS file_thumbnail_url TEXT;

COMMENT ON COLUMN saved_connections.file_thumbnail_url IS 'Thumbnail URL of the Figma file, typically from the first frame of the first page. Stored for quick preview in UI.';

COMMIT;

