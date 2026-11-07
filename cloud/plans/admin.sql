create or replace view routines_admin_private.accounts as
select u.id,u.email,u.created_at,u.last_sign_in_at,u.email_confirmed_at,
 u.raw_user_meta_data->>'routines_age_group' as age_group,
 (select count(*) from public.routine_cloud_boards b where b.user_id=u.id) as board_count,
 coalesce((select max(o.tier) from public.routine_beta_orders o where o.user_id=u.id and o.paid_at is not null and not o.refunded and not o.disputed),0) as lifetime_tier,
 m.joined_at as beta_joined_at,m.referral_months,
 ((m.access_started_at at time zone 'America/Los_Angeles')+make_interval(months=>2+coalesce(m.referral_months,0))) at time zone 'America/Los_Angeles' as beta_expires_at,
 coalesce(c.opted_in and c.consent_email=u.email,false) as email_opt_in, routines_private.beta_access(u.id) as plan_access
from auth.users u left join public.routine_beta_members m on m.user_id=u.id
left join public.routine_admin_contacts c on c.user_id=u.id
where not coalesce(u.is_anonymous,false) and (
 u.raw_user_meta_data ? 'routines_age_group' or u.raw_user_meta_data ? 'routines_account' or m.user_id is not null
 or exists(select 1 from public.routine_cloud_boards b where b.user_id=u.id)
 or exists(select 1 from public.routine_beta_orders o where o.user_id=u.id)
 or exists(select 1 from public.routine_saved_dates d where d.user_id=u.id)
 or exists(select 1 from public.routine_account_link_slots g where g.user_id=u.id)
 or exists(select 1 from public.routine_cloud_goals g where g.user_id=u.id)
 or exists(select 1 from public.routine_cloud_values v where v.user_id=u.id)
 or exists(select 1 from public.routine_educators e where e.user_id=u.id)
 or exists(select 1 from routines_admin_private.administrators a where a.user_id=u.id));
revoke all on routines_admin_private.accounts from public,anon,authenticated;
