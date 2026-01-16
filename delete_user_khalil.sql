-- Delete User: khalilkhan.brampton@gmail.com
-- WARNING: This action is irreversible.

-- Delete from the Authentication table (Master record)
-- This usually triggers a CASCADE delete to 'public.profiles', 'push_subscriptions', and 'job_assignments'
DELETE FROM auth.users 
WHERE email = 'khalilkhan.brampton@gmail.com';

-- Verify deletion (Should return 0 rows)
SELECT id, email FROM auth.users WHERE email = 'khalilkhan.brampton@gmail.com';
