begin;
create table public.routine_account_links(low_id uuid references auth.users(id) on delete cascade,high_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(low_id,high_id),check(low_id<high_id));
create table public.routine_account_link_slots(user_id uuid references auth.users(id) on delete cascade,slot smallint check(slot between 1 and 15),partner_id uuid references auth.users(id) on delete set null,active boolean not null default true,primary key(user_id,slot));
create table public.routine_link_replacements(user_id uuid references auth.users(id) on delete cascade,month date,used int not null default 0,primary key(user_id,month));
create table public.routine_account_invitations(id uuid primary key default gen_random_uuid(),sender_id uuid not null references auth.users(id) on delete cascade,recipient text,code_hash text unique not null,expires_at timestamptz not null default now()+interval '24 hours',accepted_at timestamptz,created_at timestamptz not null default now());
create table public.routine_item_shares(owner_id uuid references auth.users(id) on delete cascade,recipient_id uuid references auth.users(id) on delete cascade,kind text check(kind in ('board','goal','date','value')),resource_id text not null,permission text not null default 'view' check(permission in ('view','edit')),resource_revision uuid,primary key(owner_id,recipient_id,kind,resource_id),check(owner_id<>recipient_id));
alter table public.routine_account_links enable row level security;alter table public.routine_account_link_slots enable row level security;alter table public.routine_link_replacements enable row level security;alter table public.routine_account_invitations enable row level security;alter table public.routine_item_shares enable row level security;
revoke all on public.routine_account_links,public.routine_account_link_slots,public.routine_link_replacements,public.routine_account_invitations,public.routine_item_shares from public,anon,authenticated;
grant all on public.routine_account_links,public.routine_account_link_slots,public.routine_link_replacements,public.routine_account_invitations,public.routine_item_shares to service_role;
create index routine_links_high on public.routine_account_links(high_id);
create index routine_item_shares_recipient on public.routine_item_shares(recipient_id);
create index routine_invitations_sender on public.routine_account_invitations(sender_id);
-- Tombstones survive disconnects; deleting and re-creating a link never resets the monthly allowance.
create function routines_private.allocate_link(who uuid,partner uuid) returns void language plpgsql security definer set search_path='' as $$
declare cap int; chosen int; replacement boolean:=false; period date:=date_trunc('month',now() at time zone 'America/Los_Angeles')::date;
begin
 cap:=(routines_private.beta_access(who)->>'linkLimit')::int;
 if(select count(*) from public.routine_account_link_slots where user_id=who and active)>=cap then raise exception 'One of these accounts has reached its link limit.';end if;
 select slot into chosen from public.routine_account_link_slots where user_id=who and partner_id=partner and not active and slot<=cap order by slot limit 1;
 if chosen is not null then replacement:=true;else
 select n into chosen from generate_series(1,cap) n where not exists(select 1 from public.routine_account_link_slots where user_id=who and slot=n) order by n limit 1;
 if chosen is null then select slot into chosen from public.routine_account_link_slots where user_id=who and not active and slot<=cap order by slot limit 1;replacement:=true;end if;
 end if;
 if chosen is null then raise exception 'No link slot available.';end if;
 if replacement then
 insert into public.routine_link_replacements(user_id,month,used) values(who,period,1) on conflict(user_id,month) do update set used=routine_link_replacements.used+1 returning used into cap;
 if cap>1 then raise exception 'One of these accounts has used its linked-account replacement for this month. Try again on the first of next month (Pacific Time).';end if;
 end if;
 insert into public.routine_account_link_slots(user_id,slot,partner_id,active) values(who,chosen,partner,true) on conflict(user_id,slot) do update set partner_id=excluded.partner_id,active=true;
end;$$;
revoke all on function routines_private.allocate_link(uuid,uuid) from public,anon,authenticated;
create or replace function routines_private.routine_links_action(caller uuid,action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; inv public.routine_account_invitations; addr text; output jsonb; amount int; access jsonb; resource text; resource_kind text; board public.routine_cloud_boards; grant_row public.routine_item_shares; revised uuid;
begin
 select lower(email) into addr from auth.users where id=caller and email_confirmed_at is not null and not coalesce(is_anonymous,false);if addr is null then raise exception 'Sign in with a confirmed email first.';end if;
 insert into public.routine_link_limits(user_id,bucket) values(caller,'requests') on conflict(user_id,bucket) do update set hits=case when routine_link_limits.starts_at<now()-interval '10 minutes' then 1 else routine_link_limits.hits+1 end,starts_at=case when routine_link_limits.starts_at<now()-interval '10 minutes' then now() else routine_link_limits.starts_at end returning hits into amount;
 if amount>120 then raise exception 'Too many requests. Try again in ten minutes.';end if;
 access:=routines_private.beta_access(caller);
 if action='state' then
 return jsonb_build_object('plan',access,'groups','[]'::jsonb,'links',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email)),'[]') from public.routine_account_links l join auth.users u on u.id=case when l.low_id=caller then l.high_id else l.low_id end where caller in(l.low_id,l.high_id)),
 'replacementsUsed',coalesce((select used from public.routine_link_replacements where user_id=caller and month=date_trunc('month',now() at time zone 'America/Los_Angeles')::date),0),
 'invites',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'recipient',recipient,'expires',expires_at)),'[]') from public.routine_account_invitations where sender_id=caller and accepted_at is null and expires_at>now()),
 'shares',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.routine_item_shares s where owner_id=caller),
 'boards',(select coalesce(jsonb_agg(jsonb_build_object('slot',slot,'title',coalesce(payload#>>'{board,title}',payload#>>'{routine,name}',payload#>>'{chart,name}','Board'),'revision',revision)),'[]') from public.routine_cloud_boards where user_id=caller),
 'sharedBoards',(select coalesce(jsonb_agg(jsonb_build_object('ownerId',s.owner_id,'ownerEmail',u.email,'slot',b.slot,'title',coalesce(b.payload#>>'{board,title}',b.payload#>>'{routine,name}',b.payload#>>'{chart,name}','Board'),'permission',s.permission)),'[]') from public.routine_item_shares s join public.routine_cloud_boards b on b.user_id=s.owner_id and b.slot::text=s.resource_id and b.revision=s.resource_revision join auth.users u on u.id=s.owner_id where s.recipient_id=caller and s.kind='board' and exists(select 1 from public.routine_account_links l where l.low_id=least(caller,s.owner_id) and l.high_id=greatest(caller,s.owner_id))),
 'dates',(select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('shared',true,'ownerEmail',u.email,'groupKind','linked')),'[]') from public.routine_item_shares s join public.routine_saved_dates d on d.user_id=s.owner_id and d.id::text=s.resource_id join auth.users u on u.id=s.owner_id where s.recipient_id=caller and s.kind='date'),
 'values',(select coalesce(jsonb_agg(jsonb_build_object('value',v.value,'ownerEmail',u.email)),'[]') from public.routine_item_shares s join public.routine_cloud_values v on v.user_id=s.owner_id and v.value=s.resource_id join auth.users u on u.id=s.owner_id where s.recipient_id=caller and s.kind='value'),
 'sharedGoals',(select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('ownerEmail',u.email)),'[]') from public.routine_item_shares s join public.routine_cloud_goals g on g.user_id=s.owner_id and g.id::text=s.resource_id join auth.users u on u.id=s.owner_id where s.recipient_id=caller and s.kind='goal'));
 elsif action='invite' then
 if(select count(*) from public.routine_account_link_slots where user_id=caller and active)>=(access->>'linkLimit')::int then raise exception 'Your plan has no available links.';end if;
 if(select count(*) from public.routine_account_invitations where sender_id=caller and created_at>now()-interval '1 day')>=10 then raise exception 'Invitation limit reached. Try again tomorrow.';end if;
 addr:=nullif(lower(trim(args->>'email')),'');if addr is not null and (length(addr)>254 or addr !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Enter a valid email address.';end if;
 insert into public.routine_account_invitations(sender_id,recipient,code_hash) values(caller,addr,args->>'hash') returning id into target;return jsonb_build_object('id',target);
 elsif action='revoke' then delete from public.routine_account_invitations where sender_id=caller and id=(args->>'inviteId')::uuid;return '{}'::jsonb;
 elsif action in ('preview','accept') then
 insert into public.routine_link_limits(user_id,bucket) values(caller,'codes') on conflict(user_id,bucket) do update set hits=case when routine_link_limits.starts_at<now()-interval '10 minutes' then 1 else routine_link_limits.hits+1 end,starts_at=case when routine_link_limits.starts_at<now()-interval '10 minutes' then now() else routine_link_limits.starts_at end returning hits into amount;
 if amount>20 then raise exception 'Too many code attempts. Try again in ten minutes.';end if;
 select * into inv from public.routine_account_invitations where code_hash=args->>'hash' and accepted_at is null and expires_at>now();
 if inv.id is null or inv.sender_id=caller or (inv.recipient is not null and inv.recipient<>addr) then raise exception 'This invitation is expired, unavailable, or belongs to another email address.';end if;
 target:=inv.sender_id;
 -- Lock both accounts in a stable order to make capacity and replacement checks atomic.
 perform id from auth.users where id in(caller,target) order by id for update;
 if exists(select 1 from public.routine_account_links where low_id=least(caller,target) and high_id=greatest(caller,target)) then raise exception 'These accounts are already linked.';end if;
 if action='preview' then return jsonb_build_object('inviter',(select email from auth.users where id=target),'capacity',(access->>'linkLimit')::int,'kind','linked');end if;
 update public.routine_account_invitations set accepted_at=now() where id=inv.id and accepted_at is null and expires_at>now();if not found then raise exception 'This invitation has already been used.';end if;
 perform routines_private.allocate_link(caller,target);perform routines_private.allocate_link(target,caller);
 insert into public.routine_account_links values(least(caller,target),greatest(caller,target),now());return jsonb_build_object('linked',true);
 end if;
 target:=(args->>'userId')::uuid;
 perform id from auth.users where id in(caller,target) order by id for update;
 if not exists(select 1 from public.routine_account_links where low_id=least(caller,target) and high_id=greatest(caller,target)) then raise exception 'This account is not linked.';end if;
 if action='unlink' then
 delete from public.routine_item_shares where (owner_id=caller and recipient_id=target) or (owner_id=target and recipient_id=caller);
 delete from public.routine_account_links where low_id=least(caller,target) and high_id=greatest(caller,target);
 update public.routine_account_link_slots set active=false where (user_id=caller and partner_id=target) or (user_id=target and partner_id=caller);
 return '{}'::jsonb;
 elsif action='session' then
 insert into public.routine_link_limits(user_id,bucket) values(caller,'session-mail') on conflict(user_id,bucket) do update set hits=case when routine_link_limits.starts_at<now()-interval '1 hour' then 1 else routine_link_limits.hits+1 end,starts_at=case when routine_link_limits.starts_at<now()-interval '1 hour' then now() else routine_link_limits.starts_at end returning hits into amount;
 if amount>5 then raise exception 'Five session invitations have already been sent this hour.';end if;
 return jsonb_build_object('email',(select email from auth.users where id=target and email_confirmed_at is not null));
 elsif action='share' then
 resource:=args->>'resourceId';resource_kind:=args->>'kind';
 if not coalesce((args->>'share')::boolean,false) then delete from public.routine_item_shares where owner_id=caller and recipient_id=target and routine_item_shares.kind=resource_kind and resource_id=resource;return '{}'::jsonb;end if;
 if resource_kind='board' then select * into board from public.routine_cloud_boards where user_id=caller and slot::text=resource;if board.user_id is null then raise exception 'Save this board to your cloud before sharing.';end if;
 elsif resource_kind='date' then if not exists(select 1 from public.routine_saved_dates where user_id=caller and id::text=resource) then raise exception 'Save this date first.';end if;
 elsif resource_kind='value' then if not exists(select 1 from public.routine_cloud_values where user_id=caller and value=resource) then raise exception 'Save this value first.';end if;
 elsif resource_kind='goal' then if not exists(select 1 from public.routine_cloud_goals where user_id=caller and id::text=resource) then raise exception 'Save this goal first.';end if;
 else raise exception 'Choose a board, date, value, or goal.';end if;
 insert into public.routine_item_shares(owner_id,recipient_id,kind,resource_id,permission,resource_revision) values(caller,target,resource_kind,resource,case when resource_kind='board' and args->>'permission'='edit' then 'edit' else 'view' end,board.revision) on conflict(owner_id,recipient_id,kind,resource_id) do update set permission=excluded.permission,resource_revision=excluded.resource_revision;
 return '{}'::jsonb;
 elsif action in ('board-open','board-edit') then
 select * into grant_row from public.routine_item_shares where owner_id=target and recipient_id=caller and routine_item_shares.kind='board' and resource_id=args->>'slot';
 select * into board from public.routine_cloud_boards where user_id=target and slot::text=args->>'slot' for update;
 if grant_row.owner_id is null or board.user_id is null or grant_row.resource_revision is distinct from board.revision then raise exception 'This board is no longer shared. Ask the owner to share its latest version.';end if;
 if action='board-open' then return jsonb_build_object('payload',board.payload,'revision',board.revision,'permission',grant_row.permission,'ownerId',target);end if;
 if grant_row.permission<>'edit' then raise exception 'The owner has not allowed shared edits.';end if;
 if not coalesce((args->>'attested')::boolean,false) or args->>'revision' is distinct from board.revision::text then raise exception 'Review the privacy statement and reopen the latest shared board before saving.';end if;
 revised:=gen_random_uuid();update public.routine_cloud_boards set payload=args->'payload',revision=revised,attested_at=now(),updated_at=now() where user_id=target and slot=board.slot;
 update public.routine_item_shares set resource_revision=revised where owner_id=target and routine_item_shares.kind='board' and resource_id=board.slot::text and resource_revision=board.revision;
 return jsonb_build_object('revision',revised);
 end if;raise exception 'Unknown account-link action.';
end;$$;
commit;
