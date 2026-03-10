-- Safe update script for projects table policies
-- This script updates RLS policies without dropping the table or data

-- First, drop the old policies if they exist (safe operation)
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Create the new service role policy (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Service role can manage all projects'
  ) THEN
    CREATE POLICY "Service role can manage all projects" ON projects
      FOR ALL USING (true);
  END IF;
END $$;

-- Update description column to be NOT NULL (only if it's currently nullable)
-- This is safe because we're only adding a constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'description' 
    AND is_nullable = 'YES'
  ) THEN
    -- First, set any NULL descriptions to empty string (if any exist)
    UPDATE projects SET description = '' WHERE description IS NULL;
    
    -- Then add the NOT NULL constraint
    ALTER TABLE projects ALTER COLUMN description SET NOT NULL;
  END IF;
END $$;

