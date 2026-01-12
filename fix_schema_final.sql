-- FINAL SCHEMA FIX
-- Run this in Supabase SQL Editor to fix ALL missing columns

-- 1. Ensure 'jobs' table exists with all columns
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

-- 2. Add all potentially missing columns
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS job_date DATE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS lot_number TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS assets TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS contact_detail TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. Fix Permissions (Open up for now to solve 500s)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access" ON public.jobs;
CREATE POLICY "Enable all access" ON public.jobs FOR ALL USING (true);

-- 4. Fix Assignments Table
CREATE TABLE IF NOT EXISTS public.job_assignments (
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (job_id, user_id)
);

ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access" ON public.job_assignments;
CREATE POLICY "Enable all access" ON public.job_assignments FOR ALL USING (true);
