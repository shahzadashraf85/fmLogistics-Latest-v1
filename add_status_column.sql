-- Add status column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Optional: Create an index if we query by status often
-- CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
