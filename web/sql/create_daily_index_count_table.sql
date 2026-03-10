-- Create daily_index_count table for rate limiting
-- Tracks number of indexes created per user per day

CREATE TABLE IF NOT EXISTS daily_index_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- YYYY-MM-DD (UTC)
  count INTEGER DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_index_count_user_date ON daily_index_count(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_index_count_date ON daily_index_count(date);

-- Update updated_at on update
CREATE OR REPLACE FUNCTION update_daily_index_count_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_index_count_updated_at
  BEFORE UPDATE ON daily_index_count
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_index_count_updated_at();

-- Function to increment daily count (for atomic updates)
CREATE OR REPLACE FUNCTION increment_daily_index_count(
  p_user_id UUID,
  p_date DATE
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO daily_index_count (user_id, date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    count = daily_index_count.count + 1,
    updated_at = NOW()
  RETURNING count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE daily_index_count IS 'Daily index count per user for rate limiting';
COMMENT ON COLUMN daily_index_count.date IS 'Date in YYYY-MM-DD format (UTC)';
COMMENT ON COLUMN daily_index_count.count IS 'Number of indexes created on this date';

