-- View all push subscriptions
SELECT 
    id,
    user_id,
    LEFT(endpoint, 50) as endpoint_preview,
    user_agent,
    created_at
FROM push_subscriptions
ORDER BY created_at DESC;

-- To delete old/duplicate subscriptions, you can run:
-- DELETE FROM push_subscriptions WHERE id = 'subscription-id-here';

-- Or to keep only the most recent subscription per user:
-- DELETE FROM push_subscriptions
-- WHERE id NOT IN (
--     SELECT DISTINCT ON (user_id) id
--     FROM push_subscriptions
--     ORDER BY user_id, created_at DESC
-- );
