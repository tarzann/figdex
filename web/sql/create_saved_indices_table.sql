-- Create saved_indices table
CREATE TABLE IF NOT EXISTS saved_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  selected_pages JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_frames INTEGER,
  current_frame_index INTEGER DEFAULT 0,
  index_id TEXT,
  error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_indices_user_id ON saved_indices(user_id);

-- Create index on job_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_indices_job_id ON saved_indices(job_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_saved_indices_status ON saved_indices(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_saved_indices_created_at ON saved_indices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_indices ENABLE ROW LEVEL SECURITY;

-- Create policies (using service role, so we check user_id manually in API)
-- Service role can do everything (we check user_id in API endpoints)
CREATE POLICY "Service role can manage all indices" ON saved_indices
  FOR ALL USING (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_indices_updated_at
  BEFORE UPDATE ON saved_indices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

