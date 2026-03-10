-- Check if version info exists in recent jobs and indices
-- Run this to diagnose why version info might be missing

-- Check recent jobs
SELECT 
  id,
  file_key,
  file_name,
  figma_version,
  figma_last_modified,
  status,
  created_at
FROM index_jobs
ORDER BY created_at DESC
LIMIT 5;

-- Check recent indices
SELECT 
  id,
  figma_file_key,
  file_name,
  figma_version,
  figma_last_modified,
  array_length(frame_ids, 1) as frame_ids_count,
  uploaded_at
FROM index_files
ORDER BY uploaded_at DESC
LIMIT 5;

-- Check if columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'index_jobs' 
  AND column_name IN ('figma_version', 'figma_last_modified')
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'index_files' 
  AND column_name IN ('figma_version', 'figma_last_modified', 'frame_ids')
ORDER BY column_name;

