-- Create credits_transactions table for tracking all credit operations
CREATE TABLE IF NOT EXISTS credits_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR NOT NULL, -- 'purchase', 'usage', 'admin_grant', 'reset'
  amount INTEGER NOT NULL, -- positive for additions, negative for usage
  balance_before INTEGER NOT NULL, -- balance before transaction
  balance_after INTEGER NOT NULL, -- balance after transaction
  description TEXT, -- description (e.g., "Index creation", "Admin grant", "Monthly reset")
  reference_id UUID, -- ID of job/index/etc. related to the transaction
  reference_type VARCHAR, -- 'job', 'index', 'admin', 'reset', 'purchase'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb -- additional information (e.g., job details, package details)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_credits_transactions_user_id ON credits_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_created_at ON credits_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_type ON credits_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_reference ON credits_transactions(reference_type, reference_id);

-- Enable Row Level Security
ALTER TABLE credits_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (using service role, so we check user_id manually in API)
-- Service role can do everything (we check user_id in API endpoints)
CREATE POLICY "Service role can manage all credit transactions" ON credits_transactions
  FOR ALL USING (true);

-- Add comment to table
COMMENT ON TABLE credits_transactions IS 'Tracks all credit transactions (usage, purchases, grants, resets)';
COMMENT ON COLUMN credits_transactions.transaction_type IS 'Type: purchase, usage, admin_grant, reset';
COMMENT ON COLUMN credits_transactions.amount IS 'Positive for additions, negative for deductions';
COMMENT ON COLUMN credits_transactions.reference_type IS 'Type of related entity: job, index, admin, reset, purchase';

