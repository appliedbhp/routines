create table public.routine_beta_requests(id uuid primary key default gen_random_uuid(),email text not null,delivery_email text not null,token_hash text unique not null,friends text[] not null default '{}',referral text,expires_at timestamptz not null default now()+interval '1 day',used boolean not null default false,created_at timestamptz not null default now());
create index routine_beta_requests_email on public.routine_beta_requests(email,created_at);
create table public.routine_beta_members(email text primary key,delivery_email text not null,user_id uuid unique references auth.users(id) on delete set null,joined_at timestamptz not null default now(),referral_code text unique not null,referrer text references public.routine_beta_members(email),referral_months int not null default 0 check(referral_months>=0),terms_version text not null default 'beta-2026-v1');
create table public.routine_beta_orders(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,offer text not null,tier smallint not null check(tier in (1,2)),amount int not null check(amount in (1500,2700,4700)),session_id text unique,url text,payment_intent text,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes',paid_at timestamptz,payment_state text not null default 'open',refunded boolean not null default false,disputed boolean not null default false,dispute_updated bigint not null default 0);
create index routine_beta_orders_user on public.routine_beta_orders(user_id);
create table public.routine_beta_limits(bucket text primary key,hits int not null default 1,starts_at timestamptz not null default now());
create table public.routine_beta_config(key text primary key,value jsonb not null);
insert into public.routine_beta_config values('billing','{"enabled":false,"account":"acct_1UIYQeIiI1uuEHpt","prices":{"early":"price_1UYx47IiI1uuEHpt7F6yglje","tier1":"price_1UYx4BIiI1uuEHptZCmvyACH","tier2":"price_1UYx4EIiI1uuEHptq5jRSgfY"}}');
create table public.routine_bug_reports(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,page text not null check(length(page)<=250),description text not null check(length(description) between 10 and 4000),impact text not null check(impact in ('blocked','workaround','cosmetic')),priority smallint not null check(priority between 0 and 3),status text not null default 'new' check(status in ('new','triaged','in-progress','fixed','closed')),notes text not null default '' check(length(notes)<=4000),revision uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index routine_bug_reports_triage on public.routine_bug_reports(status,priority,created_at);
alter table public.routine_beta_requests enable row level security;
alter table public.routine_beta_members enable row level security;
alter table public.routine_beta_orders enable row level security;
alter table public.routine_beta_limits enable row level security;
alter table public.routine_beta_config enable row level security;
alter table public.routine_bug_reports enable row level security;
revoke all on public.routine_beta_requests,public.routine_beta_members,public.routine_beta_orders,public.routine_beta_limits,public.routine_beta_config,public.routine_bug_reports from public,anon,authenticated;
grant all on public.routine_beta_requests,public.routine_beta_members,public.routine_beta_orders,public.routine_beta_limits,public.routine_beta_config,public.routine_bug_reports to service_role;
create function routines_private.beta_email(value text) returns text language sql immutable set search_path='' as $$select case when split_part(lower(trim(value)),'@',2) in ('gmail.com','googlemail.com') then replace(split_part(split_part(lower(trim(value)),'@',1),'+',1),'.','')||'@gmail.com' else lower(trim(value)) end$$;
create function routines_private.beta_access(who uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare member public.routine_beta_members; until_at timestamptz; lifetime int; active boolean;
begin
 select * into member from public.routine_beta_members where user_id=who;
 until_at:=((member.joined_at at time zone 'America/Los_Angeles')+make_interval(months=>2+member.referral_months)) at time zone 'America/Los_Angeles';active:=coalesce(until_at>now(),false);
 select coalesce(max(tier),0) into lifetime from public.routine_beta_orders where user_id=who and paid_at is not null and not refunded and not disputed;
 return jsonb_build_object('beta',member.email is not null,'betaActive',active,'expiresAt',until_at,'joinedAt',member.joined_at,'referralCode',member.referral_code,'referralMonths',coalesce(member.referral_months,0),'lifetimeTier',lifetime,'tier',greatest(lifetime,case when active then 2 else 0 end),'boardLimit',case when active or lifetime=2 then 15 when lifetime=1 then 5 else 2 end,'fullFeatures',active,'checkoutReady',coalesce((select (value->>'enabled')::boolean from public.routine_beta_config where key='billing'),false));
end;$$;
revoke all on function routines_private.beta_access(uuid),routines_private.beta_email(text) from public,anon,authenticated;
grant execute on function routines_private.beta_access(uuid),routines_private.beta_email(text) to service_role;
-- Authenticated users may read their own entitlement only through this wrapper.
create function routines_private.my_beta_access() returns jsonb language plpgsql security definer set search_path='' as $$begin if auth.uid() is null then raise exception 'Sign in first';end if;return routines_private.beta_access(auth.uid());end;$$;
revoke all on function routines_private.my_beta_access() from public,anon;grant usage on schema routines_private to authenticated;grant execute on function routines_private.my_beta_access() to authenticated;
create function public.routines_account_entitlements() returns jsonb language sql security invoker set search_path='' as $$select routines_private.my_beta_access()$$;
revoke all on function public.routines_account_entitlements() from public,anon;grant execute on function public.routines_account_entitlements() to authenticated,service_role;
create function routines_private.beta_action(caller uuid,action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.routine_beta_requests;m public.routine_beta_members;o public.routine_beta_orders;v_email text;delivery text;ref text;hits int;access jsonb;amount int;tier int;out jsonb;rid uuid;is_admin boolean;
begin
 if action='limit' then
 insert into public.routine_beta_limits(bucket) values(args->>'bucket') on conflict(bucket) do update set hits=case when routine_beta_limits.starts_at<now()-make_interval(secs=>(args->>'seconds')::int) then 1 else routine_beta_limits.hits+1 end,starts_at=case when routine_beta_limits.starts_at<now()-make_interval(secs=>(args->>'seconds')::int) then now() else routine_beta_limits.starts_at end returning routine_beta_limits.hits into hits;
 return jsonb_build_object('allowed',hits<=(args->>'max')::int);
 elsif action='request' then
 if now()>='2026-12-01 00:00:00 America/Los_Angeles'::timestamptz then raise exception 'Beta enrollment closed on December 1, 2026.';end if;
 v_email:=routines_private.beta_email(args->>'email');
 insert into public.routine_beta_requests(email,delivery_email,token_hash,friends,referral) values(v_email,args->>'email',args->>'hash',array(select jsonb_array_elements_text(coalesce(args->'friends','[]'))),nullif(args->>'referral','')) returning id into rid;
 return jsonb_build_object('id',rid);
 elsif action='verify' then
 select * into req from public.routine_beta_requests where token_hash=args->>'hash' for update;
 if req.id is null or req.used or req.expires_at<=now() then raise exception 'This confirmation link is expired or already used. Sign in to view your beta status.';end if;
 if now()>='2026-12-01 00:00:00 America/Los_Angeles'::timestamptz then raise exception 'Beta enrollment is closed. You can still use the free plan.';end if;
 select b.email into ref from public.routine_beta_members b where b.referral_code=req.referral and b.email<>req.email;
 insert into public.routine_beta_members(email,delivery_email,referral_code,referrer) values(req.email,req.delivery_email,args->>'referralCode',ref) on conflict(email) do nothing returning * into m;
 update public.routine_beta_requests set used=true where id=req.id;
 if m.email is null then return jsonb_build_object('alreadyMember',true,'friends','[]'::jsonb);end if;
 if ref is not null then update public.routine_beta_members set referral_months=referral_months+1 where routine_beta_members.email=ref;end if;
 return jsonb_build_object('referralCode',m.referral_code,'friends',to_jsonb(req.friends),'email',m.delivery_email,'expiresAt',((m.joined_at at time zone 'America/Los_Angeles')+interval '2 months') at time zone 'America/Los_Angeles');
 elsif action='bug' then
 insert into public.routine_bug_reports(user_id,page,description,impact,priority) values(caller,args->>'page',args->>'description',args->>'impact',case args->>'impact' when 'blocked' then 1 when 'workaround' then 2 else 3 end) returning id into rid;return jsonb_build_object('id',rid);
 end if;
 if caller is null then raise exception 'Sign in first.';end if;
 select lower(u.email) into delivery from auth.users u where u.id=caller and u.email_confirmed_at is not null;
 if delivery is null then raise exception 'Confirm your account email first.';end if;
 v_email:=routines_private.beta_email(delivery);
 update public.routine_beta_members set user_id=caller where routine_beta_members.email=v_email and (user_id is null or user_id=caller);
 access:=routines_private.beta_access(caller);
 select * into o from public.routine_beta_orders where user_id=caller order by created_at desc limit 1;
 access:=access||jsonb_build_object('paymentState',o.payment_state);
 if action='state' then return access;
 elsif action='checkout' then
 if not (access->>'beta')::boolean then raise exception 'These offers are for confirmed beta members.';end if;
 if not(access->>'checkoutReady')::boolean then raise exception 'Checkout is being prepared. Please try again soon.';end if;
 perform pg_advisory_xact_lock(hashtextextended(caller::text,77));
 tier:=case args->>'offer' when 'early' then 1 when 'tier1' then 1 when 'tier2' then 2 else null end;
 if tier is null then raise exception 'Choose a valid offer.';end if;
 if (access->>'lifetimeTier')::int>0 then raise exception 'You already have lifetime access. Contact ABHP about changing tiers.';end if;
 if (access->>'betaActive')::boolean and args->>'offer'<>'early' then raise exception 'Use your $15 Tier 1 offer while your free access is active.';end if;
 if not(access->>'betaActive')::boolean and args->>'offer'='early' then raise exception 'The $15 window has ended. Choose a lifetime tier below.';end if;
 select * into o from public.routine_beta_orders where user_id=caller and paid_at is null and (expires_at>now() or payment_state='processing') and not refunded and not disputed order by created_at desc limit 1;
 if o.id is not null then if o.payment_state='processing' then raise exception 'Your payment is still processing. Wait for confirmation before purchasing again.';end if;if o.offer<>args->>'offer' then raise exception 'You already opened checkout for a different tier. Finish that checkout or wait 30 minutes before changing tiers.';end if;return to_jsonb(o);end if;
 amount:=case args->>'offer' when 'early' then 1500 when 'tier1' then 2700 else 4700 end;
 insert into public.routine_beta_orders(user_id,offer,tier,amount) values(caller,args->>'offer',tier,amount) returning * into o;return to_jsonb(o);
 elsif action='attach' then
 update public.routine_beta_orders set session_id=args->>'sessionId',url=args->>'url' where id=(args->>'orderId')::uuid and user_id=caller and (session_id is null or session_id=args->>'sessionId');return '{}'::jsonb;
 elsif action in ('bugs','bug-update') then
 select exists(select 1 from routines_admin_private.administrators where user_id=caller) into is_admin;if not is_admin then raise exception 'Administrator access required.';end if;
 if action='bug-update' then update public.routine_bug_reports set priority=(args->>'priority')::smallint,status=args->>'status',notes=coalesce(args->>'notes',''),revision=gen_random_uuid(),updated_at=now() where id=(args->>'id')::uuid and revision=(args->>'revision')::uuid;if not found then raise exception 'This report changed. Refresh the log before saving.';end if;return '{}'::jsonb;end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into out from (select * from public.routine_bug_reports where coalesce(args->>'filter','open')='all' or (args->>'filter'='closed' and status in ('fixed','closed')) or (coalesce(args->>'filter','open')='open' and status not in ('fixed','closed')) order by priority,created_at limit 100 offset least(greatest(coalesce((args->>'offset')::int,0),0),10000)) x;return jsonb_build_object('reports',out);
 end if;raise exception 'Unknown action.';
end;$$;
revoke all on function routines_private.beta_action(uuid,text,jsonb) from public,anon,authenticated;grant execute on function routines_private.beta_action(uuid,text,jsonb) to service_role;
create function public.routine_beta_action(caller uuid,action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select routines_private.beta_action(caller,action,args)$$;
revoke all on function public.routine_beta_action(uuid,text,jsonb) from public,anon,authenticated;grant execute on function public.routine_beta_action(uuid,text,jsonb) to service_role;
-- Keep all saved files available for reading/export after expiry. Enforce current limits on writes.
alter table public.routine_cloud_boards drop constraint routine_cloud_boards_slot_check;
alter table public.routine_cloud_boards add constraint routine_cloud_boards_slot_check check(slot between 1 and 15);

-- Cloud writes are checked in the database as well as the API; expiry never deletes files.
create function routines_private.enforce_board_limit() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.slot>(routines_private.beta_access(new.user_id)->>'boardLimit')::int then raise exception 'This slot exceeds your current plan. You can still open or export existing files.';end if;return new;end;$$;
revoke all on function routines_private.enforce_board_limit() from public,anon,authenticated;
create trigger routine_board_plan_limit before insert or update on public.routine_cloud_boards for each row execute function routines_private.enforce_board_limit();
-- Payment fulfillment is callable only by the verified webhook service.
create function routines_private.beta_payment(action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.routine_beta_orders;
begin
 if action='paid' then
 select * into o from public.routine_beta_orders where id=(args->>'orderId')::uuid for update;
 if o.id is null then raise exception 'Unknown order';end if;
 if o.session_id is distinct from args->>'sessionId' or o.user_id::text is distinct from args->>'userId' or o.amount is distinct from (args->>'amount')::int or args->>'currency'<>'usd' then raise exception 'Payment details do not match';end if;
 update public.routine_beta_orders set paid_at=coalesce(paid_at,now()),payment_state='paid',payment_intent=args->>'paymentIntent' where id=o.id;
 elsif action in ('processing','failed') then
 update public.routine_beta_orders set payment_state=action,expires_at=case when action='failed' then now() else expires_at end where session_id=args->>'sessionId' and paid_at is null;
 elsif action='risk' then
 update public.routine_beta_orders set refunded=refunded or coalesce((args->>'refunded')::boolean,false),disputed=case when (args->>'eventTime')::bigint>=dispute_updated and args ? 'disputed' then (args->>'disputed')::boolean else disputed end,dispute_updated=greatest(dispute_updated,coalesce((args->>'eventTime')::bigint,0)) where payment_intent=args->>'paymentIntent' or id=nullif(args->>'orderId','')::uuid;
 elsif action='secret' then return jsonb_build_object('secret',(select decrypted_secret from vault.decrypted_secrets where name='routines_beta_stripe_webhook' limit 1));
 else raise exception 'Unknown payment action';end if;
 return '{}'::jsonb;
end;$$;
revoke all on function routines_private.beta_payment(text,jsonb) from public,anon,authenticated;grant execute on function routines_private.beta_payment(text,jsonb) to service_role;
create function public.routine_beta_payment(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select routines_private.beta_payment(action,args)$$;
revoke all on function public.routine_beta_payment(text,jsonb) from public,anon,authenticated;grant execute on function public.routine_beta_payment(text,jsonb) to service_role;
