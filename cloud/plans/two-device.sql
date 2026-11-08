create or replace function routines_private.beta_access(who uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare member public.routine_beta_members; until_at timestamptz; lifetime int; active boolean; approved boolean; n int; label text; is_admin boolean;
begin
 select exists(select 1 from routines_admin_private.administrators where user_id=who) into is_admin;
 select * into member from public.routine_beta_members where user_id=who;
 select exists(select 1 from public.routine_educators e join auth.users u on u.id=e.user_id where e.user_id=who and e.status='approved' and lower(e.email)=lower(u.email) and u.email_confirmed_at is not null) into approved;
 until_at:=((member.access_started_at at time zone 'America/Los_Angeles')+make_interval(months=>2+member.referral_months)) at time zone 'America/Los_Angeles';
 active:=coalesce(until_at>now(),false) and (member.plan_kind='family' or approved);
 select coalesce(max(tier),0) into lifetime from public.routine_beta_orders where user_id=who and paid_at is not null and not refunded and not disputed;
 n:=greatest(case when is_admin then 2 else 0 end,lifetime,case when active then case member.plan_kind when 'classroom' then 2 else 1 end else 0 end);
 label:=case n when 2 then 'classroom' when 1 then 'family' else 'free' end;
 n:=case n when 2 then 15 when 1 then 5 else 2 end;
 return jsonb_build_object('beta',member.email is not null,'betaActive',active,'betaPlan',member.plan_kind,'expiresAt',until_at,'joinedAt',member.joined_at,'referralCode',member.referral_code,'referralMonths',coalesce(member.referral_months,0),'lifetimeTier',lifetime,'tier',case label when 'classroom' then 2 when 'family' then 1 else 0 end,'plan',label,'boardLimit',n,'goalLimit',n,'dateLimit',n,'valueLimit',n,'linkLimit',n,'extendedLibrary',n>2,'educatorApproved',approved,'educatorStatus',(select e.status from public.routine_educators e where e.user_id=who),'fullFeatures',active or is_admin,'isAdministrator',is_admin,'twoDevice',n>2,'checkoutReady',coalesce((select (value->>'enabled')::boolean from public.routine_beta_config where key='billing'),false));
end;$$;

create schema if not exists routines_live_private;
revoke all on schema routines_live_private from public;
grant usage on schema routines_live_private to anon,authenticated,service_role;
create table routines_live_private.sessions (
 topic text primary key check(topic ~ '^routine-live-[A-Za-z0-9_-]{43}$'),
 owner_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null
);
create index routine_live_sessions_expiry on routines_live_private.sessions(expires_at);
create index routine_live_sessions_owner on routines_live_private.sessions(owner_id);
alter table routines_live_private.sessions enable row level security;
revoke all on routines_live_private.sessions from public,anon,authenticated;
grant all on routines_live_private.sessions to service_role;

create function public.routine_two_device_access(caller uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((routines_private.beta_access(caller)->>'twoDevice')::boolean,false)
 and exists(select 1 from auth.users where id=caller and email_confirmed_at is not null and not coalesce(is_anonymous,false));
$$;
revoke all on function public.routine_two_device_access(uuid) from public,anon,authenticated;
grant execute on function public.routine_two_device_access(uuid) to service_role;

create function public.routine_live_authorize(caller uuid,p_topic text,p_expires timestamptz) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.routine_two_device_access(caller) then return false;end if;
 if p_topic is null or p_topic !~ '^routine-live-[A-Za-z0-9_-]{43}$' or p_expires is null or p_expires<=now() or p_expires>now()+interval '125 minutes' then raise exception 'Invalid pairing';end if;
 delete from routines_live_private.sessions where expires_at<now();
 insert into routines_live_private.sessions(topic,owner_id,expires_at) values(p_topic,caller,p_expires)
 on conflict(topic) do update set expires_at=least(routines_live_private.sessions.expires_at,excluded.expires_at) where routines_live_private.sessions.owner_id=caller;
 return exists(select 1 from routines_live_private.sessions where topic=p_topic and owner_id=caller and expires_at>now());
end;$$;
revoke all on function public.routine_live_authorize(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.routine_live_authorize(uuid,text,timestamptz) to service_role;

-- The unguessable topic is a guest capability. No sign-in is needed on the invited adult device.
-- Only the service can register a topic, after verifying the host's current paid/admin access.
create function routines_live_private.topic_allowed(topic_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from routines_live_private.sessions s where s.topic=topic_name and s.expires_at>now() and public.routine_two_device_access(s.owner_id));
$$;
revoke all on function routines_live_private.topic_allowed(text) from public;
grant execute on function routines_live_private.topic_allowed(text) to anon,authenticated,service_role;
create policy routine_live_paid_receive on realtime.messages for select to anon,authenticated
 using (extension='broadcast' and (select routines_live_private.topic_allowed((select realtime.topic()))));
create policy routine_live_paid_send on realtime.messages for insert to anon,authenticated
 with check (extension='broadcast' and (select routines_live_private.topic_allowed((select realtime.topic()))));
