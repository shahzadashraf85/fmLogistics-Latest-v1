-- SAFE REPAIR SCRIPT

-- 1. Ensure profiles has no recursive policies causing 500s
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

-- Simple non-recursive policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow reading all profiles for now to fix the dropdown assignment list (avoiding complex recursion)
CREATE POLICY "Authenticated users can read all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Ensure Jobs table has correct columns
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_date DATE,
  lot_number TEXT,
  company_name TEXT,
  assets TEXT,
  address TEXT,
  comments TEXT,
  contact_name TEXT,
  contact_detail TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix permissions for jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.jobs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.jobs;

CREATE POLICY "Enable read access for all users" ON public.jobs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.jobs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.jobs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Ensure Job Assignments table
CREATE TABLE IF NOT EXISTS public.job_assignments (
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (job_id, user_id)
);

ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to assignments" ON public.job_assignments;

CREATE POLICY "Allow full access to assignments" ON public.job_assignments
    FOR ALL USING (auth.role() = 'authenticated');

