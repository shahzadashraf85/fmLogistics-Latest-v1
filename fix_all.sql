-- CRITICAL FIX SCRIPT
-- Run this in Supabase SQL Editor to fix Import and Assignment errors

-- 1. Add missing 'address' column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Ensure Schema is correct
ALTER TABLE public.jobs ALTER COLUMN job_date TYPE DATE USING job_date::DATE;

-- 3. Fix Permissions (Solves 500 Errors)
-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access" ON public.profiles;
CREATE POLICY "Enable all access" ON public.profiles FOR ALL USING (true);

-- Jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access" ON public.jobs;
CREATE POLICY "Enable all access" ON public.jobs FOR ALL USING (true);

-- Assignments
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access" ON public.job_assignments;
CREATE POLICY "Enable all access" ON public.job_assignments FOR ALL USING (true);

-- 4. Ensure created_by foreign key doesn't block inserts
ALTER TABLE public.jobs 
  ALTER COLUMN created_by DROP NOT NULL;
