begin;
-- Operational records contain no saved-board payloads or student/session results.
create table if not exists public.routine_admin_contacts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 opted_in boolean not null default false, consent_at timestamptz,
 consent_email text, consent_source text not null default 'account-settings',
 unsubscribe_token uuid not null unique default gen_random_uuid(), updated_at timestamptz not null default now()
);
create table if not exists public.routine_admin_sequences (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 steps jsonb not null, status text not null default 'draft' check(status in ('draft','active','paused')),
 revision uuid not null default gen_random_uuid(), created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.routine_admin_deliveries (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null, sequence_id uuid references public.routine_admin_sequences(id),
 user_id uuid not null references auth.users(id) on delete cascade, recipient_email text not null, position int not null,
 subject text not null, body text not null, due_at timestamptz not null,
 status text not null default 'queued' check(status in ('queued','sending','sent','failed','cancelled')),
 attempts int not null default 0, first_attempt_at timestamptz, claimed_at timestamptz, sent_at timestamptz, provider_id text, error text,
 unique(batch_id,user_id,position)
);
create index if not exists routine_admin_deliveries_due on public.routine_admin_deliveries(status,due_at);
create table if not exists public.routine_admin_audit (
 id uuid primary key default gen_random_uuid(), actor uuid references auth.users(id), action text not null,
 detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.routine_admin_discounts (
 id uuid primary key, code text not null unique, coupon_id text not null, promotion_id text not null unique,
 percent_off numeric, amount_off int, max_redemptions int not null, expires_at timestamptz not null,
 active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.routine_beta_orders add column if not exists paid_amount int;
alter table public.routine_beta_orders add column if not exists discount_amount int not null default 0;
update public.routine_beta_orders set paid_amount=amount where paid_at is not null and paid_amount is null;
alter table public.routine_admin_contacts enable row level security;
alter table public.routine_admin_sequences enable row level security;
alter table public.routine_admin_deliveries enable row level security;
alter table public.routine_admin_audit enable row level security;
alter table public.routine_admin_discounts enable row level security;
revoke all on public.routine_admin_contacts,public.routine_admin_sequences,public.routine_admin_deliveries,public.routine_admin_audit,public.routine_admin_discounts from public,anon,authenticated;
grant all on public.routine_admin_contacts,public.routine_admin_sequences,public.routine_admin_deliveries,public.routine_admin_audit,public.routine_admin_discounts to service_role;

create or replace view routines_admin_private.accounts as
select u.id,u.email,u.created_at,u.last_sign_in_at,u.email_confirmed_at,
 u.raw_user_meta_data->>'routines_age_group' as age_group,
 (select count(*) from public.routine_cloud_boards b where b.user_id=u.id) as board_count,
 coalesce((select max(o.tier) from public.routine_beta_orders o where o.user_id=u.id and o.paid_at is not null and not o.refunded and not o.disputed),0) as lifetime_tier,
 m.joined_at as beta_joined_at,m.referral_months,
 ((m.joined_at at time zone 'America/Los_Angeles')+make_interval(months=>2+coalesce(m.referral_months,0))) at time zone 'America/Los_Angeles' as beta_expires_at,
 coalesce(c.opted_in and c.consent_email=u.email,false) as email_opt_in
from auth.users u left join public.routine_beta_members m on m.user_id=u.id
left join public.routine_admin_contacts c on c.user_id=u.id
where not coalesce(u.is_anonymous,false) and (
 u.raw_user_meta_data ? 'routines_age_group' or u.raw_user_meta_data ? 'routines_account' or m.user_id is not null
 or exists(select 1 from public.routine_cloud_boards b where b.user_id=u.id)
 or exists(select 1 from public.routine_beta_orders o where o.user_id=u.id)
 or exists(select 1 from public.routine_saved_dates d where d.user_id=u.id)
 or exists(select 1 from public.routine_link_members g where g.user_id=u.id)
 or exists(select 1 from routines_admin_private.administrators a where a.user_id=u.id));
revoke all on routines_admin_private.accounts from public,anon,authenticated;

create or replace function routines_admin_private.snapshot(section text,search text,skip int) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not routines_admin_private.is_administrator() then raise exception 'Administrator access required' using errcode='42501';end if;
 if section='accounts' then
 select jsonb_build_object('total',(select count(*) from routines_admin_private.accounts where strpos(lower(email),lower(left(coalesce(search,''),254)))>0),'rows',coalesce(jsonb_agg(to_jsonb(a)),'[]')) into result from (select * from routines_admin_private.accounts where strpos(lower(email),lower(left(coalesce(search,''),254)))>0 order by created_at desc,id limit 50 offset greatest(0,least(coalesce(skip,0),100000))) a;
 elsif section='purchases' then
 select jsonb_build_object('total',(select count(*) from public.routine_beta_orders o join auth.users u on u.id=o.user_id where strpos(lower(u.email),lower(left(coalesce(search,''),254)))>0),'rows',coalesce(jsonb_agg(to_jsonb(x)),'[]')) into result from (select o.id,u.email,o.offer,o.tier,o.amount,o.paid_amount,o.discount_amount,o.created_at,o.paid_at,o.payment_state,o.expires_at,o.refunded,o.disputed,o.session_id,o.payment_intent from public.routine_beta_orders o join auth.users u on u.id=o.user_id where strpos(lower(u.email),lower(left(coalesce(search,''),254)))>0 order by o.created_at desc,o.id limit 50 offset greatest(0,least(coalesce(skip,0),100000))) x;
 else
 select jsonb_build_object('accounts',count(*),'new30',count(*) filter(where created_at>=now()-interval '30 days'),'signedIn30',count(*) filter(where last_sign_in_at>=now()-interval '30 days'),'withBoards',count(*) filter(where board_count>0),'boards',coalesce(sum(board_count),0),'paidAccounts',count(*) filter(where lifetime_tier>0),'emailOptIns',count(*) filter(where email_opt_in)) into result from routines_admin_private.accounts;
 result:=result||jsonb_build_object('betaMembers',(select count(*) from public.routine_beta_members),'referredMembers',(select count(*) from public.routine_beta_members where referrer is not null),'openBugs',(select count(*) from public.routine_bug_reports where status not in ('fixed','closed')),'grossPaid',(select coalesce(sum(paid_amount),0) from public.routine_beta_orders where paid_at is not null),'unflaggedPaid',(select coalesce(sum(paid_amount),0) from public.routine_beta_orders where paid_at is not null and not refunded and not disputed),'flaggedPurchases',(select count(*) from public.routine_beta_orders where refunded or disputed),'signups',coalesce((select jsonb_agg(to_jsonb(d)) from (select date_trunc('month',created_at)::date as month,count(*) as count from routines_admin_private.accounts where created_at>=date_trunc('month',now())-interval '5 months' group by 1 order by 1)d),'[]'::jsonb));
 end if;return result;
end;$$;
revoke all on function routines_admin_private.snapshot(text,text,int) from public,anon;
grant execute on function routines_admin_private.snapshot(text,text,int) to authenticated;
create or replace function public.routines_admin_snapshot(section text default 'overview',search text default '',skip int default 0) returns jsonb language sql security invoker set search_path='' as $$select routines_admin_private.snapshot(section,search,skip)$$;
revoke all on function public.routines_admin_snapshot(text,text,int) from public,anon;
grant execute on function public.routines_admin_snapshot(text,text,int) to authenticated;

-- An atomic queue claim prevents concurrent workers from sending the same row.
create or replace function public.routines_admin_claim_mail() returns setof public.routine_admin_deliveries language plpgsql security invoker set search_path='' as $$
begin
 update public.routine_admin_deliveries set status='cancelled',error='Recipient opted out or email changed.' where status in ('queued','sending') and not exists(select 1 from public.routine_admin_contacts c where c.user_id=routine_admin_deliveries.user_id and c.opted_in);
 update public.routine_admin_deliveries set status='failed',error='Delivery status uncertain; review in Resend before resending.' where status='sending' and first_attempt_at<now()-interval '23 hours';
 return query with due as (select d.id from public.routine_admin_deliveries d where (d.status='queued' or (d.status='sending' and d.claimed_at<now()-interval '10 minutes')) and d.due_at<=now() and d.attempts<5 and (d.sequence_id is null or exists(select 1 from public.routine_admin_sequences s where s.id=d.sequence_id and s.status='active')) order by d.due_at for update skip locked limit 10)
 update public.routine_admin_deliveries d set status='sending',claimed_at=now(),first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1 from due where d.id=due.id returning d.*;
end;$$;
revoke all on function public.routines_admin_claim_mail() from public,anon,authenticated;
grant execute on function public.routines_admin_claim_mail() to service_role;

create or replace function public.routines_admin_worker_auth(secret text) returns boolean language sql security definer set search_path='' as $$select length($1)>40 and exists(select 1 from vault.decrypted_secrets where name='routines_admin_worker' and decrypted_secret=$1)$$;
revoke all on function public.routines_admin_worker_auth(text) from public,anon,authenticated;
grant execute on function public.routines_admin_worker_auth(text) to service_role;

create or replace function routines_private.beta_payment(action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.routine_beta_orders;
begin
 if action='paid' then
 select * into o from public.routine_beta_orders where id=(args->>'orderId')::uuid for update;
 if o.id is null then raise exception 'Unknown order';end if;
 if o.session_id is distinct from args->>'sessionId' or o.user_id::text is distinct from args->>'userId' or o.amount is distinct from (args->>'amount')::int or args->>'currency'<>'usd' then raise exception 'Payment details do not match';end if;
 if (args->>'paidAmount')::int <= 0 or (args->>'discountAmount')::int < 0 or (args->>'paidAmount')::int+(args->>'discountAmount')::int <> o.amount then raise exception 'Discounted payment does not match';end if;
 update public.routine_beta_orders set paid_amount=coalesce((args->>'paidAmount')::int,o.amount),discount_amount=coalesce((args->>'discountAmount')::int,0),paid_at=coalesce(paid_at,now()),payment_state='paid',payment_intent=args->>'paymentIntent' where id=o.id;
 elsif action in ('processing','failed') then
 update public.routine_beta_orders set payment_state=action,expires_at=case when action='failed' then now() else expires_at end where session_id=args->>'sessionId' and paid_at is null;
 elsif action='risk' then
 update public.routine_beta_orders set refunded=refunded or coalesce((args->>'refunded')::boolean,false),disputed=case when (args->>'eventTime')::bigint>=dispute_updated and args ? 'disputed' then (args->>'disputed')::boolean else disputed end,dispute_updated=greatest(dispute_updated,coalesce((args->>'eventTime')::bigint,0)) where payment_intent=args->>'paymentIntent' or id=nullif(args->>'orderId','')::uuid;
 elsif action='secret' then return jsonb_build_object('secret',(select decrypted_secret from vault.decrypted_secrets where name='routines_beta_stripe_webhook' limit 1));
 else raise exception 'Unknown payment action';end if;
 return '{}'::jsonb;
end;$$;

commit;
