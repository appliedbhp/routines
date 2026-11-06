-- Account linking is served exclusively by the authenticated Edge Function.
-- No browser role can query these tables or invoke the service RPC.
create table public.routine_link_groups (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id) on delete cascade,
 kind text not null check(kind in ('family','classroom')), created_at timestamptz not null default now()
);
create table public.routine_link_members (
 group_id uuid references public.routine_link_groups(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,
 primary key(group_id,user_id),joined_at timestamptz not null default now()
);
create index routine_link_members_user on public.routine_link_members(user_id);
create table public.routine_link_invites (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.routine_link_groups(id) on delete cascade,
 code_hash text not null unique, recipient text, expires_at timestamptz not null default now()+interval '24 hours',
 accepted_at timestamptz,created_at timestamptz not null default now()
);
create index routine_link_invites_group on public.routine_link_invites(group_id);
create table public.routine_link_dates (
 group_id uuid references public.routine_link_groups(id) on delete cascade,user_id uuid not null,date_id uuid not null,
 primary key(group_id,user_id,date_id),foreign key(user_id,date_id) references public.routine_saved_dates(user_id,id) on delete cascade
);
create table public.routine_link_values (
 group_id uuid references public.routine_link_groups(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,
 value text not null check(char_length(value) between 1 and 80),primary key(group_id,user_id,value)
);
create table public.routine_link_limits (
 user_id uuid references auth.users(id) on delete cascade, bucket text, starts_at timestamptz not null default now(),hits int not null default 1,
 primary key(user_id,bucket)
);
create table public.routine_link_mail (
 id uuid primary key default gen_random_uuid(),sender_id uuid references auth.users(id) on delete cascade,
 group_id uuid references public.routine_link_groups(id) on delete cascade,created_at timestamptz not null default now()
);
alter table public.routine_link_groups enable row level security;
alter table public.routine_link_members enable row level security;
alter table public.routine_link_invites enable row level security;
alter table public.routine_link_dates enable row level security;
alter table public.routine_link_values enable row level security;
alter table public.routine_link_limits enable row level security;
alter table public.routine_link_mail enable row level security;
revoke all on public.routine_link_groups,public.routine_link_members,public.routine_link_invites,public.routine_link_dates,public.routine_link_values,public.routine_link_limits,public.routine_link_mail from public,anon,authenticated;
grant all on public.routine_link_groups,public.routine_link_members,public.routine_link_invites,public.routine_link_dates,public.routine_link_values,public.routine_link_limits,public.routine_link_mail to service_role;
create function public.routine_links_action(caller uuid, action text, args jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare g public.routine_link_groups; inv public.routine_link_invites; gid uuid; target uuid; email text; amount int; cap int; output jsonb; code text;
begin
 if caller is null or not exists(select 1 from auth.users where id=caller and email_confirmed_at is not null) then raise exception 'Sign in with a confirmed email first.';end if;
 -- All operations are rate limited; the service supplies the verified caller.
 insert into public.routine_link_limits(user_id,bucket) values(caller,'requests') on conflict(user_id,bucket) do update set hits=case when routine_link_limits.starts_at<now()-interval '10 minutes' then 1 else routine_link_limits.hits+1 end,starts_at=case when routine_link_limits.starts_at<now()-interval '10 minutes' then now() else routine_link_limits.starts_at end returning hits into amount;
 if amount>120 then return jsonb_build_object('error','Too many requests. Try again in ten minutes.');end if;
 if action='state' then
 select jsonb_build_object('groups',coalesce(jsonb_agg(jsonb_build_object('id',x.id,'kind',x.kind,'owner',x.owner_id=caller,'ownerId',x.owner_id,'capacity',case x.kind when 'family' then 2 else 3 end,'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'email',u.email,'owner',m.user_id=x.owner_id)) from public.routine_link_members m join auth.users u on u.id=m.user_id where m.group_id=x.id),'values',(select coalesce(jsonb_agg(jsonb_build_object('value',v.value,'userId',v.user_id)),'[]') from public.routine_link_values v where v.group_id=x.id),'dateIds',(select coalesce(jsonb_agg(d.date_id),'[]') from public.routine_link_dates d where d.group_id=x.id and d.user_id=caller),'invites',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'recipient',i.recipient,'expires',i.expires_at)),'[]') from public.routine_link_invites i where i.group_id=x.id and x.owner_id=caller and i.accepted_at is null and i.expires_at>now()))),'[]')) into output from public.routine_link_groups x join public.routine_link_members mm on mm.group_id=x.id where mm.user_id=caller;
 return output||jsonb_build_object('dates',(select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('shared',true,'groupKind',gr.kind,'groupId',gr.id)),'[]') from public.routine_link_dates sh join public.routine_saved_dates d on d.user_id=sh.user_id and d.id=sh.date_id join public.routine_link_groups gr on gr.id=sh.group_id join public.routine_link_members me on me.group_id=sh.group_id and me.user_id=caller where d.user_id<>caller));
 elsif action='plan' then
 if args->>'kind' not in ('family','classroom') then raise exception 'Choose Family or Educator.';end if;
 select * into g from public.routine_link_groups where owner_id=caller for update;
 if g.id is not null and args->>'kind'='family' and (select count(*) from public.routine_link_members where group_id=g.id)>2 then raise exception 'Remove a linked account before switching to the family plan.';end if;
 insert into public.routine_link_groups(owner_id,kind) values(caller,args->>'kind') on conflict(owner_id) do update set kind=excluded.kind returning id into gid;
 insert into public.routine_link_members values(gid,caller,now()) on conflict do nothing;return jsonb_build_object('id',gid);
 elsif action in ('preview','accept') then
 insert into public.routine_link_limits(user_id,bucket) values(caller,'codes') on conflict(user_id,bucket) do update set hits=case when routine_link_limits.starts_at<now()-interval '10 minutes' then 1 else routine_link_limits.hits+1 end,starts_at=case when routine_link_limits.starts_at<now()-interval '10 minutes' then now() else routine_link_limits.starts_at end returning hits into amount;
 if amount>20 then return jsonb_build_object('error','Too many code attempts. Try again in ten minutes.');end if;
 select * into inv from public.routine_link_invites where code_hash=args->>'hash' and expires_at>now() and accepted_at is null;
 select lower(u.email) into email from auth.users u where u.id=caller;
 if inv.id is null or (inv.recipient is not null and inv.recipient<>email) then return jsonb_build_object('error','This invitation is expired, unavailable, or belongs to another email address.');end if;
 select * into g from public.routine_link_groups where id=inv.group_id for update;
 if exists(select 1 from public.routine_link_members where group_id=g.id and user_id=caller) then return jsonb_build_object('error','You already belong to this group.');end if;
 cap:=case g.kind when 'family' then 2 else 3 end;
 if (select count(*) from public.routine_link_members where group_id=g.id)>=cap then return jsonb_build_object('error','This group is full.');end if;
 if action='preview' then return jsonb_build_object('kind',g.kind,'inviter',(select u.email from auth.users u where u.id=g.owner_id),'capacity',cap);end if;
 -- Recheck after taking group lock: a code can only be used once.
 update public.routine_link_invites set accepted_at=now() where id=inv.id and accepted_at is null and expires_at>now();
 if not found then return jsonb_build_object('error','This invitation has already been used.');end if;
 if (select count(*) from public.routine_link_members where user_id=caller)>=10 then raise exception 'Leave an unused group before joining another.';end if;
 insert into public.routine_link_members(group_id,user_id) values(g.id,caller);return jsonb_build_object('linked',true);
 end if;
 gid:=(args->>'groupId')::uuid;select * into g from public.routine_link_groups where id=gid for update;
 if g.id is null or not exists(select 1 from public.routine_link_members where group_id=gid and user_id=caller) then raise exception 'This linked group is unavailable.';end if;
 if action='invite' then
 if g.owner_id<>caller then raise exception 'Only the group owner can invite accounts.';end if;
 cap:=case g.kind when 'family' then 2 else 3 end;
 if (select count(*) from public.routine_link_members where group_id=gid)>=cap then raise exception 'This group is full.';end if;
 if (select count(*) from public.routine_link_invites where group_id=gid and created_at>now()-interval '1 day')>=10 then raise exception 'Invitation limit reached. Try again tomorrow.';end if;
 email:=nullif(lower(trim(args->>'email')),'');
 if email is not null and (length(email)>254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Enter a valid email address.';end if;
 insert into public.routine_link_invites(group_id,code_hash,recipient) values(gid,args->>'hash',email) returning id into target;return jsonb_build_object('id',target);
 elsif action='revoke' then
 if g.owner_id<>caller then raise exception 'Only the owner can revoke invitations.';end if;
 delete from public.routine_link_invites where group_id=gid and id=(args->>'inviteId')::uuid;return '{}'::jsonb;
 elsif action='unlink' then
 target:=(args->>'userId')::uuid;
 if caller<>target and caller<>g.owner_id then raise exception 'You can only unlink your own account.';end if;
 if target=g.owner_id then
 if caller<>g.owner_id then raise exception 'Only the owner can close the group.';end if;
 delete from public.routine_link_groups where id=gid;
 else
 delete from public.routine_link_dates where group_id=gid and user_id=target;
 delete from public.routine_link_values where group_id=gid and user_id=target;
 delete from public.routine_link_members where group_id=gid and user_id=target;
 end if;return '{}'::jsonb;
 elsif action='date' then
 if coalesce((args->>'share')::boolean,false) then
 if not exists(select 1 from public.routine_saved_dates where user_id=caller and id=(args->>'dateId')::uuid) then raise exception 'Only your own saved dates can be shared.';end if;
 insert into public.routine_link_dates values(gid,caller,(args->>'dateId')::uuid) on conflict do nothing;
 else delete from public.routine_link_dates where group_id=gid and user_id=caller and date_id=(args->>'dateId')::uuid;end if;return '{}'::jsonb;
 elsif action='value' then
 if coalesce((args->>'share')::boolean,false) then
 if (select count(*) from public.routine_link_values where group_id=gid and user_id=caller)>=10 then raise exception 'You can share up to ten values per group.';end if;
 insert into public.routine_link_values values(gid,caller,args->>'value') on conflict do nothing;
 else delete from public.routine_link_values where group_id=gid and user_id=caller and value=args->>'value';end if;return '{}'::jsonb;
 elsif action='teacher' then
 if g.kind<>'classroom' or g.owner_id=caller then raise exception 'Choose a linked teacher.';end if;
 if (select count(*) from public.routine_link_mail where sender_id=caller and created_at>now()-interval '1 hour')>=5 then raise exception 'Five session invitations have already been sent this hour.';end if;
 insert into public.routine_link_mail(sender_id,group_id) values(caller,gid);
 return jsonb_build_object('email',(select u.email from auth.users u where u.id=g.owner_id));
 end if;
 raise exception 'Unknown account-link action.';
end;$$;
revoke all on function public.routine_links_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.routine_links_action(uuid,text,jsonb) to service_role;
-- The private definer is needed only to read confirmed Auth identities. It is
-- reachable solely through the service-role facade after Edge JWT verification.
create schema if not exists routines_private;
revoke all on schema routines_private from public,anon,authenticated;
grant usage on schema routines_private to service_role;
alter function public.routine_links_action(uuid,text,jsonb) set schema routines_private;
alter function routines_private.routine_links_action(uuid,text,jsonb) security definer;
revoke all on function routines_private.routine_links_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function routines_private.routine_links_action(uuid,text,jsonb) to service_role;
create function public.routine_links_action(caller uuid,action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select routines_private.routine_links_action(caller,action,args)$$;
revoke all on function public.routine_links_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.routine_links_action(uuid,text,jsonb) to service_role;
