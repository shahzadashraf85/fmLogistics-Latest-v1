
-- 1. Enable Realtime for the jobs table
-- This adds the table to the publication that Supabase listens to.
alter publication supabase_realtime add table public.jobs;

-- 2. Enable FULL Replica Identity
-- This is CRITICAL. Without this, the 'UPDATE' event will NOT contain the 'old' record,
-- so your code "payload.old.status" will always fail/be empty.
alter table public.jobs replica identity full;
