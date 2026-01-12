-- Clean up duplicate push subscriptions
-- This will keep only the MOST RECENT subscription for each user

DELETE FROM push_subscriptions
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM push_subscriptions
    ORDER BY user_id, created_at DESC
);

-- Verify - you should see only 1 subscription per user
SELECT 
    user_id,
    COUNT(*) as subscription_count,
    MAX(created_at) as latest_subscription
FROM push_subscriptions
GROUP BY user_id;
