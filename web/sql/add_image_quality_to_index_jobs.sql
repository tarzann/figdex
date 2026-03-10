-- Add image_quality column to index_jobs table
-- This stores the image quality scale (0.3 for low, 0.7 for medium, 1.0 for high)

ALTER TABLE index_jobs
ADD COLUMN IF NOT EXISTS image_quality NUMERIC(3, 1) DEFAULT 0.7;

-- Add comment to document the column
COMMENT ON COLUMN index_jobs.image_quality IS 'Image quality scale: 0.3 (low 30%), 0.7 (medium 70%), 1.0 (high 100%). Default is 0.7.';



