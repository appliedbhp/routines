begin;
create or replace function routines_private.beta_action(caller uuid,action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.routine_beta_requests;m public.routine_beta_members;o public.routine_beta_orders;v_email text;delivery text;ref text;hits int;access jsonb;amount int;tier int;out jsonb;rid uuid;is_admin boolean;
begin
 if action='limit' then
 insert into public.routine_beta_limits(bucket) values(args->>'bucket') on conflict(bucket) do update set hits=case when routine_beta_limits.starts_at<now()-make_interval(secs=>(args->>'seconds')::int) then 1 else routine_beta_limits.hits+1 end,starts_at=case when routine_beta_limits.starts_at<now()-make_interval(secs=>(args->>'seconds')::int) then now() else routine_beta_limits.starts_at end returning routine_beta_limits.hits into hits;
 return jsonb_build_object('allowed',hits<=(args->>'max')::int);
 elsif action='request' then
 if now()>='2026-12-01 00:00:00 America/Los_Angeles'::timestamptz then raise exception 'Beta enrollment closed on December 1, 2026.';end if;
 v_email:=routines_private.beta_email(args->>'email');
 insert into public.routine_beta_requests(email,delivery_email,token_hash,friends,referral,plan_kind) values(v_email,args->>'email',args->>'hash',array(select jsonb_array_elements_text(coalesce(args->'friends','[]'))),nullif(args->>'referral',''),case when args->>'plan'='classroom' then 'classroom' else 'family' end) returning id into rid;
 return jsonb_build_object('id',rid);
 elsif action='verify' then
 select * into req from public.routine_beta_requests where token_hash=args->>'hash' for update;
 if req.id is null or req.used or req.expires_at<=now() then raise exception 'This confirmation link is expired or already used. Sign in to view your beta status.';end if;
 if now()>='2026-12-01 00:00:00 America/Los_Angeles'::timestamptz then raise exception 'Beta enrollment is closed. You can still use the free plan.';end if;
 select b.email into ref from public.routine_beta_members b where b.referral_code=req.referral and b.email<>req.email;
 insert into public.routine_beta_members(email,delivery_email,referral_code,referrer,plan_kind,access_started_at) values(req.email,req.delivery_email,args->>'referralCode',ref,req.plan_kind,case when req.plan_kind='family' then now() end) on conflict(email) do nothing returning * into m;
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
 update public.routine_beta_members b set access_started_at=now() where b.user_id=caller and b.plan_kind='classroom' and b.access_started_at is null and exists(select 1 from public.routine_educators e where e.user_id=caller and e.status='approved' and e.email=delivery);
 access:=routines_private.beta_access(caller);
 select * into o from public.routine_beta_orders where user_id=caller order by created_at desc limit 1;
 access:=access||jsonb_build_object('paymentState',o.payment_state);
 if action='state' then return access;
 elsif action='checkout' then
 if not(access->>'checkoutReady')::boolean then raise exception 'Checkout is being prepared. Please try again soon.';end if;
 perform pg_advisory_xact_lock(hashtextextended(caller::text,77));
 tier:=case args->>'offer' when 'early' then 1 when 'tier1' then 1 when 'tier2' then 2 else null end;
 if tier is null then raise exception 'Choose a valid offer.';end if;
 if (access->>'lifetimeTier')::int>0 then raise exception 'You already have lifetime access. Contact ABHP about changing tiers.';end if;
 if tier=2 and not coalesce((access->>'educatorApproved')::boolean,false) then raise exception 'Classroom requires an approved educator email. Request approval in Settings.';end if;
 select * into o from public.routine_beta_orders where user_id=caller and paid_at is null and (expires_at>now() or payment_state='processing') and not refunded and not disputed order by created_at desc limit 1;
 if o.id is not null then if o.payment_state='processing' then raise exception 'Your payment is still processing. Wait for confirmation before purchasing again.';end if;if o.offer<>args->>'offer' then raise exception 'You already opened checkout for a different tier. Finish that checkout or wait 30 minutes before changing tiers.';end if;return to_jsonb(o);end if;
 amount:=1500;
 insert into public.routine_beta_orders(user_id,offer,tier,amount,price_id) values(caller,args->>'offer',tier,amount,(select value#>>array['prices',args->>'offer'] from public.routine_beta_config where key='billing')) returning * into o;return to_jsonb(o);
 elsif action='attach' then
 update public.routine_beta_orders set session_id=args->>'sessionId',url=args->>'url' where id=(args->>'orderId')::uuid and user_id=caller and (session_id is null or session_id=args->>'sessionId');return '{}'::jsonb;
 elsif action in ('bugs','bug-update') then
 select exists(select 1 from routines_admin_private.administrators where user_id=caller) into is_admin;if not is_admin then raise exception 'Administrator access required.';end if;
 if action='bug-update' then update public.routine_bug_reports set priority=(args->>'priority')::smallint,status=args->>'status',notes=coalesce(args->>'notes',''),revision=gen_random_uuid(),updated_at=now() where id=(args->>'id')::uuid and revision=(args->>'revision')::uuid;if not found then raise exception 'This report changed. Refresh the log before saving.';end if;return '{}'::jsonb;end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into out from (select * from public.routine_bug_reports where coalesce(args->>'filter','open')='all' or (args->>'filter'='closed' and status in ('fixed','closed')) or (coalesce(args->>'filter','open')='open' and status not in ('fixed','closed')) order by priority,created_at limit 100 offset least(greatest(coalesce((args->>'offset')::int,0),0),10000)) x;return jsonb_build_object('reports',out);
 end if;raise exception 'Unknown action.';
end;$$;

update public.routine_beta_config set value=jsonb_set(value,'{prices}','{"early":"price_1UZ0uaIiI1uuEHptwAaCOmr0","tier1":"price_1UZ0uaIiI1uuEHptwAaCOmr0","tier2":"price_1UZ0ucIiI1uuEHptKqXXBbjp"}') where key='billing';
commit;
