-- Create plans table for managing subscription plan definitions
-- Replaces hardcoded plan limits from lib/plans.ts - single source of truth in DB
-- Plans: guest, free, pro, team, unlimited

CREATE TABLE IF NOT EXISTS plans (
  plan_id VARCHAR(32) PRIMARY KEY CHECK (plan_id IN ('guest', 'free', 'pro', 'team', 'unlimited')),
  label VARCHAR(64) NOT NULL,
  -- Quotas (null = unlimited)
  max_projects INTEGER,
  max_frames_total INTEGER,
  max_index_size_bytes BIGINT,
  retention_days INTEGER,
  -- Rate limits (null = no limit)
  max_uploads_per_day INTEGER,
  max_uploads_per_month INTEGER,
  max_frames_per_month INTEGER,
  max_indexes_per_day INTEGER,
  -- Credits (DEPRECATED: use subscription model; null = unlimited)
  credits_per_month INTEGER,
  -- Metadata
  is_subscribable BOOLEAN DEFAULT FALSE,  -- Can users subscribe to this plan? (pro, team)
  sort_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plans_enabled ON plans(enabled);
CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON plans(sort_order);
CREATE INDEX IF NOT EXISTS idx_plans_is_subscribable ON plans(is_subscribable);

-- Update updated_at on change
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_plans_updated_at ON plans;
CREATE TRIGGER trigger_update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plans_updated_at();

-- Comments
COMMENT ON TABLE plans IS 'Plan definitions - limits and quotas for guest, free, pro, team, unlimited';
COMMENT ON COLUMN plans.max_projects IS 'Max files/projects (soft limit); null = unlimited';
COMMENT ON COLUMN plans.max_frames_total IS 'Max frames across all projects; null = unlimited';
COMMENT ON COLUMN plans.max_index_size_bytes IS 'Max index size in bytes; null = unlimited';
COMMENT ON COLUMN plans.retention_days IS 'Days to retain indexed data; null = unlimited';
COMMENT ON COLUMN plans.max_indexes_per_day IS 'Daily rate limit for new indexes; null = no limit';
COMMENT ON COLUMN plans.credits_per_month IS 'DEPRECATED: Monthly credits base; null = unlimited';
COMMENT ON COLUMN plans.is_subscribable IS 'Whether users can subscribe to this plan (pro, team)';

-- Insert default plans (matching lib/plans.ts)
INSERT INTO plans (
  plan_id,
  label,
  max_projects,
  max_frames_total,
  max_index_size_bytes,
  retention_days,
  max_uploads_per_day,
  max_uploads_per_month,
  max_frames_per_month,
  max_indexes_per_day,
  credits_per_month,
  is_subscribable,
  sort_order
) VALUES
  ('guest', 'Guest', 1, 50, 10485760, 7, NULL, NULL, NULL, 5, NULL, FALSE, 1),
  ('free', 'Free', 2, 300, 52428800, 30, NULL, NULL, 300, NULL, 100, FALSE, 2),
  ('pro', 'Pro', 10, 5000, 524288000, 180, NULL, NULL, NULL, 20, 1000, TRUE, 3),
  ('team', 'Team', 20, 15000, 1048576000, 365, NULL, NULL, NULL, 50, 2000, TRUE, 4),
  ('unlimited', 'Unlimited', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, 5)
ON CONFLICT (plan_id) DO UPDATE SET
  label = EXCLUDED.label,
  max_projects = EXCLUDED.max_projects,
  max_frames_total = EXCLUDED.max_frames_total,
  max_index_size_bytes = EXCLUDED.max_index_size_bytes,
  retention_days = EXCLUDED.retention_days,
  max_uploads_per_day = EXCLUDED.max_uploads_per_day,
  max_uploads_per_month = EXCLUDED.max_uploads_per_month,
  max_frames_per_month = EXCLUDED.max_frames_per_month,
  max_indexes_per_day = EXCLUDED.max_indexes_per_day,
  credits_per_month = EXCLUDED.credits_per_month,
  is_subscribable = EXCLUDED.is_subscribable,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
