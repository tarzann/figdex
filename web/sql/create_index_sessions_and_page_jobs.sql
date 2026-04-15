CREATE TABLE IF NOT EXISTS public.index_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  project_id TEXT,
  file_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'plugin',
  status TEXT NOT NULL DEFAULT 'queued',
  total_pages INTEGER NOT NULL DEFAULT 0,
  completed_pages INTEGER NOT NULL DEFAULT 0,
  failed_pages INTEGER NOT NULL DEFAULT 0,
  cancelled_pages INTEGER NOT NULL DEFAULT 0,
  total_frames INTEGER NOT NULL DEFAULT 0,
  processed_frames INTEGER NOT NULL DEFAULT 0,
  selected_pages TEXT[] DEFAULT '{}'::text[],
  selected_page_ids TEXT[] DEFAULT '{}'::text[],
  current_page_job_id UUID,
  cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.index_page_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.index_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  project_id TEXT,
  file_name TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  total_frames INTEGER NOT NULL DEFAULT 0,
  processed_frames INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  uploaded_chunk_count INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  payload_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_index_sessions_user_created_at
  ON public.index_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_index_sessions_file_key
  ON public.index_sessions(user_id, file_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_index_sessions_status
  ON public.index_sessions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_index_page_jobs_session_sort
  ON public.index_page_jobs(session_id, sort_order, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_index_page_jobs_status
  ON public.index_page_jobs(status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_index_page_jobs_user_file
  ON public.index_page_jobs(user_id, file_key, created_at DESC);

ALTER TABLE public.index_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.index_page_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own index sessions" ON public.index_sessions;
CREATE POLICY "Users can view own index sessions" ON public.index_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage index sessions" ON public.index_sessions;
CREATE POLICY "Service role can manage index sessions" ON public.index_sessions
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view own index page jobs" ON public.index_page_jobs;
CREATE POLICY "Users can view own index page jobs" ON public.index_page_jobs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage index page jobs" ON public.index_page_jobs;
CREATE POLICY "Service role can manage index page jobs" ON public.index_page_jobs
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
