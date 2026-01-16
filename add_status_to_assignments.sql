-- Add status column to job_assignments to track individual user progress
ALTER TABLE public.job_assignments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update existing assignments to match the parent job status (best effort backfill)
-- This ensures existing dashboard views don't break immediately
UPDATE public.job_assignments ja
SET status = j.status
FROM public.jobs j
WHERE ja.job_id = j.id;
