-- Create shared_views table for user-level sharing and search results sharing
-- This replaces index-level sharing with user-level and search results sharing

CREATE TABLE IF NOT EXISTS shared_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type VARCHAR NOT NULL CHECK (share_type IN ('all_indices', 'search_results')),
  share_token TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  search_params JSONB, -- For search_results type: { textSearch, fileFilter, tags, etc. }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_views_user_id ON shared_views(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_views_share_token ON shared_views(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_views_enabled ON shared_views(enabled);
CREATE INDEX IF NOT EXISTS idx_shared_views_share_type ON shared_views(share_type);

-- Update updated_at on update
CREATE OR REPLACE FUNCTION update_shared_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shared_views_updated_at
  BEFORE UPDATE ON shared_views
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_views_updated_at();

-- Comments
COMMENT ON TABLE shared_views IS 'User-level sharing: all indices or search results';
COMMENT ON COLUMN shared_views.share_type IS 'Type: all_indices (view all user indices) or search_results (view specific search results)';
COMMENT ON COLUMN shared_views.search_params IS 'Search parameters for search_results type (textSearch, fileFilter, tags, etc.)';
COMMENT ON COLUMN shared_views.enabled IS 'Whether the share link is active (can be toggled by user)';

