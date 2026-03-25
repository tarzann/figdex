-- Lightweight metadata to avoid repeated heavy reads of index_data JSONB
ALTER TABLE index_files
ADD COLUMN IF NOT EXISTS frame_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_index_files_user_file_key
  ON index_files(user_id, figma_file_key);

CREATE INDEX IF NOT EXISTS idx_index_files_owner_anon_file_key
  ON index_files(owner_anon_id, figma_file_key)
  WHERE user_id IS NULL;

-- Backfill frame_count from index_data when possible
WITH page_counts AS (
  SELECT
    id,
    COALESCE(SUM(
      CASE
        WHEN jsonb_typeof(page_elem->'frames') = 'array' THEN jsonb_array_length(page_elem->'frames')
        ELSE 0
      END
    ), 0) AS computed_frame_count
  FROM index_files,
  LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(index_data) = 'array' THEN index_data
      WHEN jsonb_typeof(index_data) = 'object' AND jsonb_typeof(index_data->'pages') = 'array' THEN index_data->'pages'
      ELSE '[]'::jsonb
    END
  ) AS page_elem
  GROUP BY id
)
UPDATE index_files i
SET frame_count = pc.computed_frame_count
FROM page_counts pc
WHERE i.id = pc.id
  AND (i.frame_count IS NULL OR i.frame_count <> pc.computed_frame_count);
