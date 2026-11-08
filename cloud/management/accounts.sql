create table public.routine_account_grants(id uuid primary key,user_id uuid not null references auth.users(id),plan text not null check(plan in ('family','classroom')),expires_at timestamptz not null,reason text not null,created_at timestamptz not null default now(),revoked_at timestamptz);
create table public.routine_account_discounts(id uuid primary key,user_id uuid not null references auth.users(id),coupon_id text not null unique,percent_off int not null check(percent_off between 1 and 99),expires_at timestamptz not null,created_at timestamptz not null default now());
alter table public.routine_account_grants enable row level security;
alter table public.routine_account_discounts enable row level security;
revoke all on public.routine_account_grants,public.routine_account_discounts from public,anon,authenticated;
grant all on public.routine_account_grants,public.routine_account_discounts to service_role;
create index on public.routine_account_grants(user_id);
create index on public.routine_account_discounts(user_id);
create or replace function public.routines_admin_account(caller uuid,target uuid,action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; end_at timestamptz; ident uuid; kind text;
begin
 if not exists(select 1 from routines_admin_private.administrators where user_id=caller) then raise exception 'Administrator access required.';end if;
 if not exists(select 1 from routines_admin_private.accounts where id=target) then raise exception 'Account not found.';end if;
 if action='detail' then
 return jsonb_build_object('account',(select to_jsonb(a) from routines_admin_private.accounts a where id=target),'grants',(select coalesce(jsonb_agg(to_jsonb(g) order by created_at desc),'[]') from public.routine_account_grants g where user_id=target),'discounts',(select coalesce(jsonb_agg(to_jsonb(d) order by created_at desc),'[]') from public.routine_account_discounts d where user_id=target),'purchases',(select coalesce(jsonb_agg(to_jsonb(o) order by created_at desc),'[]') from public.routine_beta_orders o where user_id=target),'activity',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select logs.created_at,logs.action,logs.detail from public.routine_admin_audit logs where logs.detail->>'userId'=target::text order by logs.created_at desc limit 50)a));
 elsif action='grant' then
 ident:=(args->>'id')::uuid;kind:=args->>'plan';
 if kind not in ('family','classroom') or length(trim(coalesce(args->>'reason',''))) not between 3 and 500 then raise exception 'Choose a plan and enter a reason.';end if;
 if kind='classroom' and not coalesce((routines_private.beta_access(target)->>'educatorApproved')::boolean,false) then raise exception 'Approve the educator account before granting Classroom access.';end if;
 perform pg_advisory_xact_lock(hashtextextended(target::text,994));
 if exists(select 1 from public.routine_account_grants where id=ident and user_id=target) then return '{}'::jsonb;end if;
 select greatest(now(),max(expires_at),(routines_private.beta_access(target)->>'expiresAt')::timestamptz) into end_at from public.routine_account_grants where user_id=target and plan=kind and revoked_at is null;
 end_at:=end_at+interval '1 month';
 insert into public.routine_account_grants(id,user_id,plan,expires_at,reason) values(ident,target,kind,end_at,trim(args->>'reason'));
 insert into public.routine_admin_audit(actor,action,detail) values(caller,'account-free-month',jsonb_build_object('userId',target,'grantId',ident,'plan',kind,'expiresAt',end_at,'reason',trim(args->>'reason')));
 return jsonb_build_object('expiresAt',end_at);
 elsif action='revoke-grant' then
 update public.routine_account_grants set revoked_at=now() where id=(args->>'id')::uuid and user_id=target and revoked_at is null;
 if found then insert into public.routine_admin_audit(actor,action,detail) values(caller,'account-revoke-grant',jsonb_build_object('userId',target,'grantId',args->>'id'));end if;
 return '{}'::jsonb;
 end if;
 raise exception 'Unknown account action.';
end;$$;
revoke all on function public.routines_admin_account(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.routines_admin_account(uuid,uuid,text,jsonb) to service_role;

create or replace function routines_private.beta_access(who uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare member public.routine_beta_members; until_at timestamptz; lifetime int; active boolean; approved boolean; n int; label text; is_admin boolean; gifted int; gift_until timestamptz;
begin
 select exists(select 1 from routines_admin_private.administrators where user_id=who) into is_admin;
 select * into member from public.routine_beta_members where user_id=who;
 select exists(select 1 from public.routine_educators e join auth.users u on u.id=e.user_id where e.user_id=who and e.status='approved' and lower(e.email)=lower(u.email) and u.email_confirmed_at is not null) into approved;
 until_at:=((member.access_started_at at time zone 'America/Los_Angeles')+make_interval(months=>2+member.referral_months)) at time zone 'America/Los_Angeles';
 active:=coalesce(until_at>now(),false) and (member.plan_kind='family' or approved);
 select coalesce(max(tier),0) into lifetime from public.routine_beta_orders where user_id=who and paid_at is not null and not refunded and not disputed;
 select coalesce(max(case plan when 'classroom' then 2 else 1 end),0),max(expires_at) into gifted,gift_until from public.routine_account_grants where user_id=who and revoked_at is null and expires_at>now() and (plan='family' or approved);
 n:=greatest(gifted,case when is_admin then 2 else 0 end,lifetime,case when active then case member.plan_kind when 'classroom' then 2 else 1 end else 0 end);
 label:=case n when 2 then 'classroom' when 1 then 'family' else 'free' end;
 n:=case n when 2 then 15 when 1 then 5 else 2 end;
 return jsonb_build_object('beta',member.email is not null,'betaActive',active,'betaPlan',member.plan_kind,'expiresAt',until_at,'joinedAt',member.joined_at,'referralCode',member.referral_code,'referralMonths',coalesce(member.referral_months,0),'lifetimeTier',lifetime,'tier',case label when 'classroom' then 2 when 'family' then 1 else 0 end,'plan',label,'boardLimit',n,'goalLimit',n,'dateLimit',n,'valueLimit',n,'linkLimit',n,'extendedLibrary',n>2,'educatorApproved',approved,'educatorStatus',(select e.status from public.routine_educators e where e.user_id=who),'complimentaryUntil',gift_until,'fullFeatures',active or is_admin or gifted>0,'isAdministrator',is_admin,'twoDevice',n>2,'checkoutReady',coalesce((select (value->>'enabled')::boolean from public.routine_beta_config where key='billing'),false));
end;$$;
