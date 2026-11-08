begin;
do $$
declare who uuid:=gen_random_uuid(); address text; order_id uuid;
begin
 address:='two-device-check-'||who||'@example.invalid';
 insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_app_meta_data,raw_user_meta_data) values(who,address,now(),false,'{}','{}');
 if public.routine_two_device_access(who) then raise exception 'Free account admitted';end if;
 insert into public.routine_beta_members(email,delivery_email,user_id,referral_code,plan_kind,access_started_at) values(address,address,who,replace(who::text,'-',''),'family',now());
 if not public.routine_two_device_access(who) then raise exception 'Active Family beta denied';end if;
 update public.routine_beta_members set plan_kind='classroom' where user_id=who;
 if public.routine_two_device_access(who) then raise exception 'Unapproved Classroom beta admitted';end if;
 insert into public.routine_educators(user_id,email,status) values(who,address,'approved');
 if not public.routine_two_device_access(who) then raise exception 'Approved Classroom beta denied';end if;
 update public.routine_beta_members set access_started_at=now()-interval '1 year' where user_id=who;
 if public.routine_two_device_access(who) then raise exception 'Expired beta admitted';end if;
 insert into public.routine_beta_orders(user_id,offer,tier,amount,paid_at) values(who,'tier1',1,1500,now()) returning id into order_id;
 if not public.routine_two_device_access(who) then raise exception 'Paid Family denied';end if;
 update public.routine_beta_orders set tier=2 where id=order_id;
 if not public.routine_two_device_access(who) then raise exception 'Paid Classroom denied';end if;
 update public.routine_beta_orders set refunded=true where id=order_id;
 if public.routine_two_device_access(who) then raise exception 'Refunded plan admitted';end if;
end;$$;
rollback;
