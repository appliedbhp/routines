create table public.routine_sidequest_profiles(user_id uuid primary key references auth.users(id) on delete cascade,name text not null unique,avatar text check(avatar is null or (length(avatar)<=120000 and avatar ~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$')));
create table public.routine_sidequest_scores(user_id uuid references public.routine_sidequest_profiles(user_id) on delete cascade,level integer not null check(level between 1 and 10),points integer not null check(points>=0),updated_at timestamptz not null default now(),primary key(user_id,level));
alter table public.routine_sidequest_profiles enable row level security;
alter table public.routine_sidequest_scores enable row level security;
revoke all on public.routine_sidequest_profiles,public.routine_sidequest_scores from public,anon,authenticated;
grant all on public.routine_sidequest_profiles,public.routine_sidequest_scores to service_role;
create index routine_sidequest_rank on public.routine_sidequest_scores(level,points desc,updated_at);
create function public.routine_sidequest_profile(who uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb; result jsonb;
begin
 a:=routines_private.beta_access(who);if not(coalesce((a->>'isAdministrator')::boolean,false) or a->>'plan' in ('family','classroom')) then raise exception 'Paid access required';end if;
 insert into public.routine_sidequest_profiles(user_id,name) values(who,(array['Brave','Curious','Bright','Gentle','Swift','Sunny','Clever','Calm'])[1+floor(random()*8)::int]||' '||(array['Otter','Fox','Owl','Panda','Falcon','Badger','Koala','Dolphin'])[1+floor(random()*8)::int]||' '||left(replace(gen_random_uuid()::text,'-',''),8)) on conflict(user_id) do nothing;
 select jsonb_build_object('name',name,'avatar',avatar) into result from public.routine_sidequest_profiles where user_id=who;return result;
end $$;
revoke all on function public.routine_sidequest_profile(uuid) from public,anon,authenticated;
grant execute on function public.routine_sidequest_profile(uuid) to service_role;
create function public.routine_sidequest_submit(who uuid,p_level integer,p_points integer,p_avatar text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.routine_sidequest_profile(who);
 if p_level not between 1 and 10 or p_points not between 0 and 6000000 then raise exception 'Invalid score';end if;
 update public.routine_sidequest_profiles set avatar=p_avatar where user_id=who;
 insert into public.routine_sidequest_scores(user_id,level,points) values(who,p_level,p_points) on conflict(user_id,level) do update set points=greatest(public.routine_sidequest_scores.points,excluded.points),updated_at=case when excluded.points>public.routine_sidequest_scores.points then now() else public.routine_sidequest_scores.updated_at end;
 return public.routine_sidequest_profile(who);
end $$;
revoke all on function public.routine_sidequest_submit(uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.routine_sidequest_submit(uuid,integer,integer,text) to service_role;
