-- Add last_updated_by column to jobs table to track who changed the status
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id);

-- Policy to allow authenticated users to update this column (if not already covered)
-- Using existing policies usually covers all columns, but good to be safe.
