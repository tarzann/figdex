CREATE TABLE IF NOT EXISTS index_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  project_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  manifest JSONB NOT NULL,
  page_meta JSONB,
  selected_pages TEXT[],
  selected_page_ids TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  next_frame_index INTEGER NOT NULL DEFAULT 0,
  total_frames INTEGER NOT NULL,
  index_file_id INTEGER REFERENCES index_files(id) ON DELETE SET NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_index_jobs_status ON index_jobs(status);

