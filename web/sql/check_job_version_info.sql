-- Check recent job to see if it includes version info
-- This will help diagnose why the index doesn't have version info

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
LIMIT 3;

