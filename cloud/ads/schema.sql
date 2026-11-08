create table public.routine_ads (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 1 and 100),
 body text not null default '' check(length(body)<=500),
 button text not null default 'Learn more' check(length(button) between 1 and 40),
 url text not null check(url ~ '^https://[^[:space:]]+$' and length(url)<=2000),
 ages text[] not null check(cardinality(ages)>0 and ages <@ array['all','young','child','teen','adult']),
 pages text[] not null check(cardinality(pages)>0 and cardinality(pages)<=50),
 placement text not null default 'bottom' check(placement in ('top','bottom')),
 active boolean not null default false,
 priority integer not null default 0 check(priority between 0 and 100),
 revision uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now()
);
alter table public.routine_ads enable row level security;
revoke all on public.routine_ads from anon,authenticated;
grant select on public.routine_ads to anon,authenticated;
grant insert,update,delete on public.routine_ads to authenticated;
grant all on public.routine_ads to service_role;
create policy ads_published on public.routine_ads for select to anon,authenticated using(active);
create policy ads_admin_read on public.routine_ads for select to authenticated using((select public.routines_is_administrator()));
create policy ads_admin_insert on public.routine_ads for insert to authenticated with check((select public.routines_is_administrator()));
create policy ads_admin_update on public.routine_ads for update to authenticated using((select public.routines_is_administrator())) with check((select public.routines_is_administrator()));
create policy ads_admin_delete on public.routine_ads for delete to authenticated using((select public.routines_is_administrator()));
