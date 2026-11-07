create table public.routine_tips (
 session_id text primary key,
 payment_intent text,
 amount integer not null check(amount between 100 and 50000),
 currency text not null check(currency='usd'),
 status text not null check(status in ('pending','paid','failed','expired')),
 refunded_amount integer not null default 0 check(refunded_amount>=0),
 disputed boolean not null default false,
 created_at timestamptz not null
);
create index routine_tips_created on public.routine_tips(created_at desc);
create index routine_tips_payment on public.routine_tips(payment_intent);
alter table public.routine_tips enable row level security;
revoke all on public.routine_tips from public,anon,authenticated;
grant select,insert,update on public.routine_tips to service_role;
