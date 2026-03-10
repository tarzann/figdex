-- Update projects table status default value
-- This script updates the default status from 'active' to 'To Do'

-- Update existing projects with 'active' status to 'To Do' (optional)
UPDATE projects SET status = 'To Do' WHERE status = 'active';

-- Change the default value for new projects
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'To Do';

