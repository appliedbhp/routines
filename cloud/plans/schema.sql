begin;
create table public.routine_educators(user_id uuid primary key references auth.users(id) on delete cascade,email text not null,status text not null default 'pending' check(status in ('pending','approved','declined')),requested_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references auth.users(id));
create table public.routine_cloud_values(user_id uuid references auth.users(id) on delete cascade,value text check(length(value) between 1 and 80),primary key(user_id,value));
create table public.routine_cloud_goals(user_id uuid references auth.users(id) on delete cascade,id uuid not null default gen_random_uuid(),title text not null check(length(title) between 1 and 120),statement text not null default '' check(length(statement)<=2000),revision uuid not null default gen_random_uuid(),updated_at timestamptz not null default now(),primary key(user_id,id));
alter table public.routine_educators enable row level security;alter table public.routine_cloud_values enable row level security;alter table public.routine_cloud_goals enable row level security;
revoke all on public.routine_educators,public.routine_cloud_values,public.routine_cloud_goals from public,anon,authenticated;
grant all on public.routine_educators,public.routine_cloud_values,public.routine_cloud_goals to service_role;
insert into public.routine_cloud_values select u.id,v.value from auth.users u cross join lateral jsonb_array_elements_text(case when jsonb_typeof(u.raw_user_meta_data->'routines_values')='array' then u.raw_user_meta_data->'routines_values' else '[]'::jsonb end) v(value) where length(v.value) between 1 and 80 on conflict do nothing;
alter table public.routine_beta_requests add column plan_kind text not null default 'family' check(plan_kind in ('family','classroom'));
alter table public.routine_beta_members add column plan_kind text not null default 'family' check(plan_kind in ('family','classroom'));
alter table public.routine_beta_members add column access_started_at timestamptz;
update public.routine_beta_members set access_started_at=joined_at;
alter table public.routine_beta_orders add column price_id text;
update public.routine_beta_orders set price_id=case offer when 'early' then 'price_1UYx47IiI1uuEHpt7F6yglje' when 'tier1' then 'price_1UYx4BIiI1uuEHptZCmvyACH' else 'price_1UYx4EIiI1uuEHptq5jRSgfY' end;

create or replace function routines_private.beta_access(who uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare member public.routine_beta_members; until_at timestamptz; lifetime int; active boolean; approved boolean; n int; label text;
begin
 select * into member from public.routine_beta_members where user_id=who;
 select exists(select 1 from public.routine_educators e join auth.users u on u.id=e.user_id where e.user_id=who and e.status='approved' and lower(e.email)=lower(u.email) and u.email_confirmed_at is not null) into approved;
 until_at:=((member.access_started_at at time zone 'America/Los_Angeles')+make_interval(months=>2+member.referral_months)) at time zone 'America/Los_Angeles';
 active:=coalesce(until_at>now(),false) and (member.plan_kind='family' or approved);
 select coalesce(max(tier),0) into lifetime from public.routine_beta_orders where user_id=who and paid_at is not null and not refunded and not disputed;
 n:=greatest(lifetime,case when active then case member.plan_kind when 'classroom' then 2 else 1 end else 0 end);
 label:=case n when 2 then 'classroom' when 1 then 'family' else 'free' end;
 n:=case n when 2 then 15 when 1 then 5 else 2 end;
 return jsonb_build_object('beta',member.email is not null,'betaActive',active,'betaPlan',member.plan_kind,'expiresAt',until_at,'joinedAt',member.joined_at,'referralCode',member.referral_code,'referralMonths',coalesce(member.referral_months,0),'lifetimeTier',lifetime,'tier',case label when 'classroom' then 2 when 'family' then 1 else 0 end,'plan',label,'boardLimit',n,'goalLimit',n,'dateLimit',n,'valueLimit',n,'linkLimit',n,'extendedLibrary',n>2,'educatorApproved',approved,'educatorStatus',(select e.status from public.routine_educators e where e.user_id=who),'fullFeatures',active,'checkoutReady',coalesce((select (value->>'enabled')::boolean from public.routine_beta_config where key='billing'),false));
end;$$;

alter table public.routine_saved_dates drop constraint routine_saved_dates_slot_check;
alter table public.routine_saved_dates add constraint routine_saved_dates_slot_check check(slot between 1 and 15);
create function routines_private.enforce_date_limit() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.id<>old.id or new.slot<>old.slot) then raise exception 'Saved date identity cannot change';end if;
 if tg_op='INSERT' and new.slot>(routines_private.beta_access(new.user_id)->>'dateLimit')::int then raise exception 'Your plan has no available date slots.';end if;
 return new;end;$$;
revoke all on function routines_private.enforce_date_limit() from public,anon,authenticated;
create trigger routine_date_plan_limit before insert or update on public.routine_saved_dates for each row execute function routines_private.enforce_date_limit();

create function routines_private.plan_action(caller uuid,action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare access jsonb; addr text; total int; cap int; ident uuid; result jsonb; target uuid;
begin
 select email into addr from auth.users where id=caller and email_confirmed_at is not null and not coalesce(is_anonymous,false);if addr is null then raise exception 'Sign in with a confirmed email first.';end if;
 access:=routines_private.beta_access(caller);
 if action='educator-request' then
 insert into public.routine_educators(user_id,email) values(caller,lower(addr)) on conflict(user_id) do update set email=excluded.email,status=case when routine_educators.email=excluded.email and routine_educators.status='approved' then 'approved' else 'pending' end,requested_at=now();return '{}'::jsonb;
 elsif action in ('educator-list','educator-review','link-exception') then
 if not exists(select 1 from routines_admin_private.administrators where user_id=caller) then raise exception 'Administrator access required.';end if;
 if action='educator-list' then return jsonb_build_object('rows',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from (select * from public.routine_educators order by requested_at desc limit 100)e));end if;
 if action='link-exception' then
 select id into target from auth.users where lower(email)=lower(trim(args->>'email'));if target is null then raise exception 'Account not found.';end if;
 delete from public.routine_link_replacements where user_id=target and month=date_trunc('month',now() at time zone 'America/Los_Angeles')::date;
 insert into public.routine_admin_audit(actor,action,detail) values(caller,'link-replacement-exception',jsonb_build_object('userId',target));return '{}'::jsonb;
 end if;
 if args->>'status' not in ('approved','declined') then raise exception 'Choose approved or declined.';end if;
 target:=(args->>'userId')::uuid;
 update public.routine_educators e set status=args->>'status',reviewed_at=now(),reviewed_by=caller where e.user_id=target and e.email=(args->>'email') and exists(select 1 from auth.users u where u.id=target and lower(u.email)=e.email and u.email_confirmed_at is not null);
 if not found then raise exception 'Email changed. Ask the educator to request approval again.';end if;
 if args->>'status'='approved' then update public.routine_beta_members set access_started_at=coalesce(access_started_at,now()) where user_id=target and plan_kind='classroom';end if;
 insert into public.routine_admin_audit(actor,action,detail) values(caller,'educator-review',jsonb_build_object('userId',target,'status',args->>'status'));return '{}'::jsonb;
 elsif action='resources' then
 return jsonb_build_object('plan',access,'values',(select coalesce(jsonb_agg(value order by value),'[]') from public.routine_cloud_values where user_id=caller),'goals',(select coalesce(jsonb_agg(to_jsonb(g)),'[]') from public.routine_cloud_goals g where user_id=caller));
 elsif action='values-save' then
 perform pg_advisory_xact_lock(hashtextextended(caller::text,921));
 if jsonb_typeof(args->'values')<>'array' then raise exception 'Choose valid values.';end if;
 cap:=(access->>'valueLimit')::int;
 select count(*) into total from public.routine_cloud_values where user_id=caller;
 if jsonb_array_length(args->'values')>greatest(cap,total) or (jsonb_array_length(args->'values')>cap and exists(select 1 from jsonb_array_elements_text(args->'values') v where not exists(select 1 from public.routine_cloud_values c where c.user_id=caller and c.value=v.value))) then raise exception 'Your plan allows % cloud values. Keep existing values or choose fewer.',cap;end if;
 if exists(select 1 from jsonb_array_elements_text(args->'values') v where length(v.value) not between 1 and 80) then raise exception 'Choose valid values.';end if;
 delete from public.routine_cloud_values where user_id=caller and value not in(select jsonb_array_elements_text(args->'values'));
 insert into public.routine_cloud_values select caller,value from jsonb_array_elements_text(args->'values') on conflict do nothing;
 return '{}'::jsonb;
 elsif action='goal-save' then
 perform pg_advisory_xact_lock(hashtextextended(caller::text,922));
 ident:=coalesce(nullif(args->>'id','')::uuid,gen_random_uuid());
 if exists(select 1 from public.routine_cloud_goals where user_id=caller and id=ident) then
 update public.routine_cloud_goals set title=trim(args->>'title'),statement=coalesce(args->>'statement',''),updated_at=now(),revision=gen_random_uuid() where user_id=caller and id=ident and revision=(args->>'revision')::uuid;
 if not found then raise exception 'This goal changed. Refresh before saving.';end if;
 else
 cap:=(access->>'goalLimit')::int;if(select count(*) from public.routine_cloud_goals where user_id=caller)>=cap then raise exception 'Your plan allows % cloud goals.',cap;end if;
 insert into public.routine_cloud_goals(user_id,id,title,statement) values(caller,ident,trim(args->>'title'),coalesce(args->>'statement',''));
 end if;return jsonb_build_object('id',ident);
 elsif action='goal-delete' then delete from public.routine_cloud_goals where user_id=caller and id=(args->>'id')::uuid;return '{}'::jsonb;
 end if;raise exception 'Unknown plan action.';
end;$$;
revoke all on function routines_private.plan_action(uuid,text,jsonb) from public,anon,authenticated;grant execute on function routines_private.plan_action(uuid,text,jsonb) to service_role;
create function public.routine_plan_action(caller uuid,action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select routines_private.plan_action(caller,action,args)$$;
revoke all on function public.routine_plan_action(uuid,text,jsonb) from public,anon,authenticated;grant execute on function public.routine_plan_action(uuid,text,jsonb) to service_role;
commit;
