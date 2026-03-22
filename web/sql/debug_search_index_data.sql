-- =====================================================
-- SQL queries to debug index_data and search results
-- Run these in Supabase SQL Editor (Dashboard > SQL Editor)
-- https://supabase.com/dashboard > Your Project > SQL Editor
-- =====================================================

-- 0. Check if index_data is in DB or in Storage (storageRef)
SELECT id, file_name,
  CASE 
    WHEN index_data::text LIKE '%storageRef%' THEN 'In Storage (can''t query content)'
    ELSE 'In DB (queries below will work)'
  END as data_location
FROM index_files
ORDER BY uploaded_at DESC
LIMIT 10;


-- 1. List all indices with basic info (last 20)
SELECT 
  id,
  file_name,
  figma_file_key,
  user_id,
  uploaded_at,
  jsonb_typeof(index_data) as index_data_type,
  CASE 
    WHEN jsonb_typeof(index_data) = 'array' 
      THEN jsonb_array_length(index_data)
    WHEN index_data ? 'pages' 
      THEN jsonb_array_length(index_data->'pages')
    ELSE NULL
  END as pages_count
FROM index_files
ORDER BY uploaded_at DESC
LIMIT 20;


-- 2. Extract page names and frame counts per index
-- (Handles both array format and object with pages)
-- Note: Skips rows where index_data is in Storage (storageRef)
WITH pages_data AS (
  SELECT 
    id,
    file_name,
    page_elem->>'name' as page_name,
    page_elem->'frames' as frames,
    jsonb_array_length(page_elem->'frames') as frame_count
  FROM index_files,
  LATERAL (
    SELECT jsonb_array_elements(
      CASE 
        WHEN jsonb_typeof(index_data) = 'array' THEN index_data
        WHEN index_data ? 'pages' THEN index_data->'pages'
        ELSE '[]'::jsonb
      END
    ) as page_elem
  ) pages
  WHERE page_elem ? 'frames'
)
SELECT id, file_name, page_name, frame_count
FROM pages_data
ORDER BY id, page_name;


-- 3. Search for "nova" in index_data (which frames would match?)
-- Checks: frame name, page name, textContent (first 200 chars)
WITH flat_frames AS (
  SELECT 
    if.id,
    if.file_name,
    p.elem->>'name' as page_name,
    f.frame->>'name' as frame_name,
    left(f.frame->>'textContent', 200) as text_content_preview,
    f.frame ? 'textContent' as has_text_content,
    f.frame ? 'searchTokens' as has_search_tokens
  FROM index_files if,
  LATERAL jsonb_array_elements(
    CASE 
      WHEN jsonb_typeof(if.index_data) = 'array' THEN if.index_data
      WHEN if.index_data ? 'pages' THEN if.index_data->'pages'
      ELSE '[]'::jsonb
    END
  ) as p(elem),
  LATERAL jsonb_array_elements(COALESCE(p.elem->'frames', '[]'::jsonb)) as f(frame)
)
SELECT 
  id,
  file_name,
  page_name,
  frame_name,
  has_text_content,
  has_search_tokens,
  -- Check if "nova" appears (for debugging)
  frame_name ILIKE '%nova%' as name_has_nova,
  page_name ILIKE '%nova%' as page_has_nova,
  text_content_preview ILIKE '%nova%' as text_has_nova
FROM flat_frames
WHERE 
  frame_name ILIKE '%nova%' 
  OR page_name ILIKE '%nova%'
  OR text_content_preview ILIKE '%nova%'
ORDER BY id, page_name, frame_name;


-- 4. Summary: How many frames per index, and do they have textContent/searchTokens?
WITH frame_stats AS (
  SELECT 
    if.id,
    if.file_name,
    count(*) as total_frames,
    count(*) FILTER (WHERE f.frame ? 'textContent') as with_text_content,
    count(*) FILTER (WHERE f.frame ? 'searchTokens') as with_search_tokens
  FROM index_files if,
  LATERAL jsonb_array_elements(
    CASE 
      WHEN jsonb_typeof(if.index_data) = 'array' THEN if.index_data
      WHEN if.index_data ? 'pages' THEN if.index_data->'pages'
      ELSE '[]'::jsonb
    END
  ) as p(elem),
  LATERAL jsonb_array_elements(COALESCE(p.elem->'frames', '[]'::jsonb)) as f(frame)
  GROUP BY if.id, if.file_name
)
SELECT * FROM frame_stats ORDER BY id;
