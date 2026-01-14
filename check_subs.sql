-- Count all push subscriptions
select count(*) as total_subscriptions from push_subscriptions;

-- Show subscriptions for specific user (replace ID if you know it, or just show all with user emails if joined)
select 
    ps.user_id, 
    p.email, 
    ps.created_at, 
    ps.user_agent 
from push_subscriptions ps
left join profiles p on ps.user_id = p.id;
