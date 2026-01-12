-- First, let's check if the table exists and see its structure
-- Run this to verify the profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
