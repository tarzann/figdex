BEGIN;

CREATE TABLE IF NOT EXISTS index_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_file_id INTEGER NOT NULL REFERENCES index_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT,
  figma_file_key TEXT,
  file_name TEXT,
  index_data JSONB,
  frame_tags JSONB,
  custom_tags JSONB,
  naming_tags JSONB,
  size_tags JSONB,
  file_size BIGINT,
  storage_paths TEXT[],
  uploaded_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_index_archives_project_file ON index_archives(project_id, figma_file_key);

COMMIT;



