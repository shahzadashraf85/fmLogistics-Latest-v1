-- Delete all jobs for today (2026-01-14)

-- 1. Optional: Delete assignments first (safer)
DELETE FROM job_assignments 
WHERE job_id IN (
    SELECT id FROM jobs 
    WHERE job_date = '2026-01-14'
);

-- 2. Delete the jobs
DELETE FROM jobs 
WHERE job_date = '2026-01-14';
