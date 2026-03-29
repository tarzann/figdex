ALTER TABLE users
ADD COLUMN IF NOT EXISTS bypass_indexing_limits BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.bypass_indexing_limits IS 'When true, skip indexing cooldown and plan-related indexing guardrails for this user.';

CREATE INDEX IF NOT EXISTS idx_users_bypass_indexing_limits
ON users(bypass_indexing_limits)
WHERE bypass_indexing_limits = TRUE;
