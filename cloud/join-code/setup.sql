-- Temporary pairing only. No ratings, names, or encouragement stored here.
create table if not exists public.routine_join_codes (
 code text primary key check(code ~ '^[A-HJ-NP-Z2-9]{6}$'),
 invitation text not null,
 owner_hash text not null,
 claim_hash text,
 expires_at timestamptz not null
);
alter table public.routine_join_codes enable row level security;
revoke all on public.routine_join_codes from anon, authenticated;
grant all on public.routine_join_codes to service_role;
create table if not exists public.routine_join_limits (
 bucket text primary key, hits integer not null, expires_at timestamptz not null
);
alter table public.routine_join_limits enable row level security;
revoke all on public.routine_join_limits from anon, authenticated;
grant all on public.routine_join_limits to service_role;
create or replace function public.routine_join_limit(p_bucket text, p_expires timestamptz)
returns integer language sql security invoker set search_path = '' as $$
 insert into public.routine_join_limits(bucket,hits,expires_at) values(p_bucket,1,p_expires)
 on conflict(bucket) do update set hits=public.routine_join_limits.hits+1 returning hits;
$$;
revoke all on function public.routine_join_limit(text,timestamptz) from public,anon,authenticated;
grant execute on function public.routine_join_limit(text,timestamptz) to service_role;
create or replace function public.routine_join_claim(p_code text,p_claim text)
returns text language sql security invoker set search_path = '' as $$
 update public.routine_join_codes set claim_hash=p_claim
 where code=p_code and expires_at>now() and (claim_hash is null or claim_hash=p_claim)
 returning invitation;
$$;
revoke all on function public.routine_join_claim(text,text) from public,anon,authenticated;
grant execute on function public.routine_join_claim(text,text) to service_role;
select cron.schedule('routine-join-cleanup','*/10 * * * *', $job$
 delete from public.routine_join_codes where expires_at < now();
 delete from public.routine_join_limits where expires_at < now();
$job$);
