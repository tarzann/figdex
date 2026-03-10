-- Create saved_connections table
CREATE TABLE IF NOT EXISTS saved_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  figma_token TEXT NOT NULL,
  pages JSONB DEFAULT '[]'::jsonb,
  image_quality TEXT NOT NULL DEFAULT 'med',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_connections_user_id ON saved_connections(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_saved_connections_created_at ON saved_connections(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_connections ENABLE ROW LEVEL SECURITY;

-- Create policies (using service role, so we check user_id manually in API)
-- Service role can do everything (we check user_id in API endpoints)
CREATE POLICY "Service role can manage all connections" ON saved_connections
  FOR ALL USING (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_connections_updated_at
  BEFORE UPDATE ON saved_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

