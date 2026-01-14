-- Unassign all jobs for a specific date (e.g., 2026-01-13)

-- 1. Identify the jobs first (Safety check - SELECT before DELETE)
/*
SELECT j.id, j.job_date, j.company_name 
FROM jobs j
WHERE j.job_date = '2026-01-13';
*/

-- 2. Delete assignments linked to those jobs
DELETE FROM job_assignments
WHERE job_id IN (
    SELECT id 
    FROM jobs 
    WHERE job_date = '2026-01-13'
);

-- Output result
SELECT 'Successfully unassigned jobs for 2026-01-13' as result;
