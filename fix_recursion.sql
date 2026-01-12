-- FIX INFINITE RECURSION IN PROFILES
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. DROP BAD POLICIES
DROP POLICY IF EXISTS "Enable all access" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2. CREATE NON-RECURSIVE POLICIES

-- READ: Allow any logged in user to read ALL profiles
-- (This is necessary so you can select users to assign jobs to)
CREATE POLICY "Allow read all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- UPDATE: Only allow updating your OWN profile
CREATE POLICY "Allow update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- INSERT: Only allow inserting your OWN profile
CREATE POLICY "Allow insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
