-- Backfill normalized index tables from legacy index_files rows.
-- Supports legacy array format and object.pages format when JSON is stored inline in Postgres.
-- Rows whose index_data is only a storageRef still backfill indexed_files metadata, but not pages/frames.

BEGIN;

WITH legacy_rows AS (
  SELECT
    i.id AS legacy_index_id,
    i.user_id,
    i.owner_anon_id,
    CASE
      WHEN COALESCE(NULLIF(BTRIM(i.figma_file_key), ''), '') <> '' THEN BTRIM(i.figma_file_key)
      WHEN COALESCE(NULLIF(BTRIM(i.project_id), ''), '') <> '' AND BTRIM(i.project_id) <> '0:0' THEN BTRIM(i.project_id)
      ELSE 'unknown'
    END AS logical_file_id,
    NULLIF(BTRIM(i.project_id), '') AS project_id,
    NULLIF(BTRIM(i.figma_file_key), '') AS figma_file_key,
    COALESCE(NULLIF(BTRIM(i.file_name), ''), 'Untitled') AS file_name,
    CASE
      WHEN jsonb_typeof(i.index_data) = 'object' THEN NULLIF(BTRIM(i.index_data->>'coverImageUrl'), '')
      ELSE NULL
    END AS cover_image_url,
    COALESCE(i.uploaded_at, NOW()) AS uploaded_at,
    COALESCE(i.frame_count, 0) AS frame_count,
    i.index_data
  FROM index_files i
  WHERE (i.user_id IS NOT NULL OR i.owner_anon_id IS NOT NULL)
),
latest_user_rows AS (
  SELECT *
  FROM (
    SELECT
      legacy_rows.*,
      ROW_NUMBER() OVER (PARTITION BY user_id, logical_file_id ORDER BY uploaded_at DESC, legacy_index_id DESC) AS row_num
    FROM legacy_rows
    WHERE user_id IS NOT NULL
  ) ranked
  WHERE row_num = 1
),
latest_guest_rows AS (
  SELECT *
  FROM (
    SELECT
      legacy_rows.*,
      ROW_NUMBER() OVER (PARTITION BY owner_anon_id, logical_file_id ORDER BY uploaded_at DESC, legacy_index_id DESC) AS row_num
    FROM legacy_rows
    WHERE user_id IS NULL AND owner_anon_id IS NOT NULL
  ) ranked
  WHERE row_num = 1
)
INSERT INTO indexed_files (
  user_id,
  owner_anon_id,
  logical_file_id,
  project_id,
  figma_file_key,
  file_name,
  normalized_file_name,
  cover_image_url,
  source,
  created_at,
  updated_at,
  last_indexed_at
)
SELECT
  user_id,
  NULL,
  logical_file_id,
  project_id,
  figma_file_key,
  file_name,
  LOWER(file_name),
  cover_image_url,
  'legacy_backfill',
  uploaded_at,
  uploaded_at,
  uploaded_at
FROM latest_user_rows
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, logical_file_id) WHERE user_id IS NOT NULL
DO UPDATE SET
  project_id = EXCLUDED.project_id,
  figma_file_key = EXCLUDED.figma_file_key,
  file_name = EXCLUDED.file_name,
  normalized_file_name = EXCLUDED.normalized_file_name,
  cover_image_url = COALESCE(EXCLUDED.cover_image_url, indexed_files.cover_image_url),
  updated_at = GREATEST(indexed_files.updated_at, EXCLUDED.updated_at),
  last_indexed_at = GREATEST(indexed_files.last_indexed_at, EXCLUDED.last_indexed_at);

INSERT INTO indexed_files (
  user_id,
  owner_anon_id,
  logical_file_id,
  project_id,
  figma_file_key,
  file_name,
  normalized_file_name,
  cover_image_url,
  source,
  created_at,
  updated_at,
  last_indexed_at
)
SELECT
  NULL,
  owner_anon_id,
  logical_file_id,
  project_id,
  figma_file_key,
  file_name,
  LOWER(file_name),
  cover_image_url,
  'legacy_backfill',
  uploaded_at,
  uploaded_at,
  uploaded_at
FROM latest_guest_rows
ON CONFLICT (owner_anon_id, logical_file_id) WHERE user_id IS NULL AND owner_anon_id IS NOT NULL
DO UPDATE SET
  project_id = EXCLUDED.project_id,
  figma_file_key = EXCLUDED.figma_file_key,
  file_name = EXCLUDED.file_name,
  normalized_file_name = EXCLUDED.normalized_file_name,
  cover_image_url = COALESCE(EXCLUDED.cover_image_url, indexed_files.cover_image_url),
  updated_at = GREATEST(indexed_files.updated_at, EXCLUDED.updated_at),
  last_indexed_at = GREATEST(indexed_files.last_indexed_at, EXCLUDED.last_indexed_at);

WITH legacy_pages AS (
  SELECT
    i.user_id,
    i.owner_anon_id,
    CASE
      WHEN COALESCE(NULLIF(BTRIM(i.figma_file_key), ''), '') <> '' THEN BTRIM(i.figma_file_key)
      WHEN COALESCE(NULLIF(BTRIM(i.project_id), ''), '') <> '' AND BTRIM(i.project_id) <> '0:0' THEN BTRIM(i.project_id)
      ELSE 'unknown'
    END AS logical_file_id,
    COALESCE(NULLIF(BTRIM(page_elem->>'id'), ''), NULLIF(BTRIM(page_elem->>'pageId'), ''), CONCAT('legacy-page-', i.id, '-', page_ord::TEXT)) AS figma_page_id,
    COALESCE(NULLIF(BTRIM(page_elem->>'name'), ''), NULLIF(BTRIM(page_elem->>'pageName'), ''), 'Untitled Page') AS page_name,
    page_ord - 1 AS sort_order,
    page_elem
  FROM index_files i
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(i.index_data) = 'array' THEN i.index_data
      WHEN jsonb_typeof(i.index_data) = 'object' AND jsonb_typeof(i.index_data->'pages') = 'array' THEN i.index_data->'pages'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS pages(page_elem, page_ord)
  WHERE (i.user_id IS NOT NULL OR i.owner_anon_id IS NOT NULL)
),
resolved_pages AS (
  SELECT DISTINCT ON (f.id, p.figma_page_id)
    f.id AS file_id,
    p.figma_page_id,
    p.page_name,
    LOWER(p.page_name) AS normalized_page_name,
    p.sort_order
  FROM legacy_pages p
  JOIN indexed_files f
    ON f.logical_file_id = p.logical_file_id
   AND (
        (p.user_id IS NOT NULL AND f.user_id = p.user_id)
        OR
        (p.user_id IS NULL AND p.owner_anon_id IS NOT NULL AND f.user_id IS NULL AND f.owner_anon_id = p.owner_anon_id)
      )
  ORDER BY f.id, p.figma_page_id, p.sort_order
)
INSERT INTO indexed_pages (
  file_id,
  figma_page_id,
  page_name,
  normalized_page_name,
  sort_order,
  created_at,
  updated_at
)
SELECT
  file_id,
  figma_page_id,
  page_name,
  normalized_page_name,
  sort_order,
  NOW(),
  NOW()
FROM resolved_pages
ON CONFLICT (file_id, figma_page_id)
DO UPDATE SET
  page_name = EXCLUDED.page_name,
  normalized_page_name = EXCLUDED.normalized_page_name,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH legacy_frames AS (
  SELECT
    i.user_id,
    i.owner_anon_id,
    CASE
      WHEN COALESCE(NULLIF(BTRIM(i.figma_file_key), ''), '') <> '' THEN BTRIM(i.figma_file_key)
      WHEN COALESCE(NULLIF(BTRIM(i.project_id), ''), '') <> '' AND BTRIM(i.project_id) <> '0:0' THEN BTRIM(i.project_id)
      ELSE 'unknown'
    END AS logical_file_id,
    COALESCE(NULLIF(BTRIM(page_elem->>'id'), ''), NULLIF(BTRIM(page_elem->>'pageId'), ''), CONCAT('legacy-page-', i.id, '-', page_ord::TEXT)) AS figma_page_id,
    COALESCE(NULLIF(BTRIM(frame_elem->>'id'), ''), CONCAT('legacy-frame-', i.id, '-', page_ord::TEXT, '-', frame_ord::TEXT)) AS figma_frame_id,
    COALESCE(NULLIF(BTRIM(frame_elem->>'name'), ''), 'Untitled Frame') AS frame_name,
    frame_elem,
    frame_ord - 1 AS sort_order
  FROM index_files i
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(i.index_data) = 'array' THEN i.index_data
      WHEN jsonb_typeof(i.index_data) = 'object' AND jsonb_typeof(i.index_data->'pages') = 'array' THEN i.index_data->'pages'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS pages(page_elem, page_ord)
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(page_elem->'frames') = 'array' THEN page_elem->'frames'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS frames(frame_elem, frame_ord)
  WHERE (i.user_id IS NOT NULL OR i.owner_anon_id IS NOT NULL)
),
resolved_frames AS (
  SELECT DISTINCT ON (p.id, lf.figma_frame_id)
    p.id AS page_id,
    lf.figma_frame_id,
    lf.frame_name,
    TRIM(BOTH ' ' FROM CONCAT_WS(
      ' ',
      NULLIF(BTRIM(lf.frame_elem->>'name'), ''),
      NULLIF(BTRIM(lf.frame_elem->>'text'), ''),
      NULLIF(BTRIM(lf.frame_elem->>'pageName'), '')
    )) AS search_text,
    CASE WHEN jsonb_typeof(lf.frame_elem->'frameTags') = 'array' THEN lf.frame_elem->'frameTags' ELSE '[]'::jsonb END AS frame_tags,
    CASE WHEN jsonb_typeof(lf.frame_elem->'customTags') = 'array' THEN lf.frame_elem->'customTags' ELSE '[]'::jsonb END AS custom_tags,
    NULLIF(BTRIM(COALESCE(lf.frame_elem->>'image', lf.frame_elem->>'image_url')), '') AS image_url,
    NULLIF(BTRIM(lf.frame_elem->>'thumb_url'), '') AS thumb_url,
    lf.frame_elem AS frame_payload,
    lf.sort_order
  FROM legacy_frames lf
  JOIN indexed_files f
    ON f.logical_file_id = lf.logical_file_id
   AND (
        (lf.user_id IS NOT NULL AND f.user_id = lf.user_id)
        OR
        (lf.user_id IS NULL AND lf.owner_anon_id IS NOT NULL AND f.user_id IS NULL AND f.owner_anon_id = lf.owner_anon_id)
      )
  JOIN indexed_pages p
    ON p.file_id = f.id
   AND p.figma_page_id = lf.figma_page_id
  ORDER BY p.id, lf.figma_frame_id, lf.sort_order
)
INSERT INTO indexed_frames (
  page_id,
  figma_frame_id,
  frame_name,
  search_text,
  frame_tags,
  custom_tags,
  image_url,
  thumb_url,
  frame_payload,
  sort_order,
  created_at,
  updated_at
)
SELECT
  page_id,
  figma_frame_id,
  frame_name,
  search_text,
  frame_tags,
  custom_tags,
  image_url,
  thumb_url,
  frame_payload,
  sort_order,
  NOW(),
  NOW()
FROM resolved_frames
ON CONFLICT (page_id, figma_frame_id)
DO UPDATE SET
  frame_name = EXCLUDED.frame_name,
  search_text = EXCLUDED.search_text,
  frame_tags = EXCLUDED.frame_tags,
  custom_tags = EXCLUDED.custom_tags,
  image_url = EXCLUDED.image_url,
  thumb_url = EXCLUDED.thumb_url,
  frame_payload = EXCLUDED.frame_payload,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH page_totals AS (
  SELECT
    p.id AS page_id,
    COUNT(f.id) AS frame_count
  FROM indexed_pages p
  LEFT JOIN indexed_frames f ON f.page_id = p.id
  GROUP BY p.id
)
UPDATE indexed_pages p
SET
  frame_count = page_totals.frame_count,
  updated_at = NOW()
FROM page_totals
WHERE p.id = page_totals.page_id;

WITH file_totals AS (
  SELECT
    f.id AS file_id,
    COUNT(p.id) AS indexed_pages_count,
    COALESCE(SUM(p.frame_count), 0) AS total_frames
  FROM indexed_files f
  LEFT JOIN indexed_pages p ON p.file_id = f.id
  GROUP BY f.id
)
UPDATE indexed_files f
SET
  indexed_pages_count = file_totals.indexed_pages_count,
  total_frames = file_totals.total_frames,
  updated_at = NOW()
FROM file_totals
WHERE f.id = file_totals.file_id;

INSERT INTO indexed_owner_usage (
  user_id,
  owner_anon_id,
  total_files,
  total_frames,
  updated_at
)
SELECT
  user_id,
  owner_anon_id,
  COUNT(*) AS total_files,
  COALESCE(SUM(total_frames), 0) AS total_frames,
  NOW()
FROM indexed_files
WHERE user_id IS NOT NULL
GROUP BY user_id, owner_anon_id
ON CONFLICT (user_id) WHERE user_id IS NOT NULL
DO UPDATE SET
  total_files = EXCLUDED.total_files,
  total_frames = EXCLUDED.total_frames,
  updated_at = NOW();

INSERT INTO indexed_owner_usage (
  user_id,
  owner_anon_id,
  total_files,
  total_frames,
  updated_at
)
SELECT
  user_id,
  owner_anon_id,
  COUNT(*) AS total_files,
  COALESCE(SUM(total_frames), 0) AS total_frames,
  NOW()
FROM indexed_files
WHERE user_id IS NULL AND owner_anon_id IS NOT NULL
GROUP BY user_id, owner_anon_id
ON CONFLICT (owner_anon_id) WHERE user_id IS NULL AND owner_anon_id IS NOT NULL
DO UPDATE SET
  total_files = EXCLUDED.total_files,
  total_frames = EXCLUDED.total_frames,
  updated_at = NOW();

COMMIT;
