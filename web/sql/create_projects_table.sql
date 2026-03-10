-- Create projects table for managing user projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial_number SERIAL, -- Auto-incrementing serial number
  figma_link TEXT,
  jira_link TEXT,
  description TEXT NOT NULL, -- Only description is required
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  people TEXT[], -- Array of people names
  status TEXT DEFAULT 'To Do', -- To Do, In Progress, Waiting, Completed, Canceled, Archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Create index on date for filtering
CREATE INDEX IF NOT EXISTS idx_projects_date ON projects(date);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies (using service role, so we check user_id manually in API)
-- Service role can do everything (we check user_id in API endpoints)
CREATE POLICY "Service role can manage all projects" ON projects
  FOR ALL USING (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

