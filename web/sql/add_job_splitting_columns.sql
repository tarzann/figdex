-- Add columns for job splitting support
ALTER TABLE index_jobs
ADD COLUMN IF NOT EXISTS parent_job_id UUID REFERENCES index_jobs(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS job_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_jobs INTEGER DEFAULT 1;

-- Create index for parent_job_id to speed up queries
CREATE INDEX IF NOT EXISTS idx_index_jobs_parent_job_id ON index_jobs(parent_job_id);

-- Create index for finding all jobs in a split group
CREATE INDEX IF NOT EXISTS idx_index_jobs_parent_and_index ON index_jobs(parent_job_id, job_index);



