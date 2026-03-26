-- Normalized index model for FigDex
-- Splits logical file, pages, and frames into separate tables.

CREATE TABLE IF NOT EXISTS indexed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  owner_anon_id TEXT,
  logical_file_id TEXT NOT NULL,
  project_id TEXT,
  figma_file_key TEXT,
  file_name TEXT NOT NULL,
  normalized_file_name TEXT,
  cover_image_url TEXT,
  source TEXT NOT NULL DEFAULT 'plugin',
  total_frames INTEGER NOT NULL DEFAULT 0,
  indexed_pages_count INTEGER NOT NULL DEFAULT 0,
  last_sync_id TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT indexed_files_owner_check CHECK (
    (user_id IS NOT NULL AND owner_anon_id IS NULL) OR
    (user_id IS NULL AND owner_anon_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_indexed_files_user_logical
  ON indexed_files(user_id, logical_file_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_indexed_files_guest_logical
  ON indexed_files(owner_anon_id, logical_file_id)
  WHERE user_id IS NULL AND owner_anon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_indexed_files_user_id ON indexed_files(user_id);
CREATE INDEX IF NOT EXISTS idx_indexed_files_owner_anon_id ON indexed_files(owner_anon_id);
CREATE INDEX IF NOT EXISTS idx_indexed_files_figma_file_key ON indexed_files(figma_file_key);
CREATE INDEX IF NOT EXISTS idx_indexed_files_project_id ON indexed_files(project_id);
CREATE INDEX IF NOT EXISTS idx_indexed_files_uploaded_at ON indexed_files(last_indexed_at DESC);

CREATE TABLE IF NOT EXISTS indexed_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES indexed_files(id) ON DELETE CASCADE,
  figma_page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  normalized_page_name TEXT,
  frame_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_sync_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(file_id, figma_page_id)
);

CREATE INDEX IF NOT EXISTS idx_indexed_pages_file_id ON indexed_pages(file_id);
CREATE INDEX IF NOT EXISTS idx_indexed_pages_file_sort ON indexed_pages(file_id, sort_order);

CREATE TABLE IF NOT EXISTS indexed_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES indexed_pages(id) ON DELETE CASCADE,
  figma_frame_id TEXT NOT NULL,
  frame_name TEXT NOT NULL,
  search_text TEXT,
  frame_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  thumb_url TEXT,
  frame_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_sync_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page_id, figma_frame_id)
);

CREATE INDEX IF NOT EXISTS idx_indexed_frames_page_id ON indexed_frames(page_id);
CREATE INDEX IF NOT EXISTS idx_indexed_frames_page_sort ON indexed_frames(page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_indexed_frames_search_text ON indexed_frames USING GIN (to_tsvector('simple', COALESCE(search_text, '')));
CREATE INDEX IF NOT EXISTS idx_indexed_frames_frame_tags ON indexed_frames USING GIN (frame_tags);
CREATE INDEX IF NOT EXISTS idx_indexed_frames_custom_tags ON indexed_frames USING GIN (custom_tags);

CREATE TABLE IF NOT EXISTS indexed_owner_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  owner_anon_id TEXT,
  total_files INTEGER NOT NULL DEFAULT 0,
  total_frames INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT indexed_owner_usage_owner_check CHECK (
    (user_id IS NOT NULL AND owner_anon_id IS NULL) OR
    (user_id IS NULL AND owner_anon_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_indexed_owner_usage_user
  ON indexed_owner_usage(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_indexed_owner_usage_guest
  ON indexed_owner_usage(owner_anon_id)
  WHERE user_id IS NULL AND owner_anon_id IS NOT NULL;
