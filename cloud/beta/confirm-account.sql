-- Both code and link confirmation use Supabase Auth's verified session.
-- Browser roles cannot choose a caller; only the authenticated Edge handler invokes this.
create function routines_private.confirm_beta_account(caller uuid,request_id uuid,referral_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare addr text; canonical text; req public.routine_beta_requests; member public.routine_beta_members;
begin
 select lower(email) into addr from auth.users where id=caller and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 if addr is null then raise exception 'Sign in with the code or link in your email first.';end if;
 canonical:=routines_private.beta_email(addr);
 select * into member from public.routine_beta_members where email=canonical;
 if member.email is not null then
  if member.user_id is not null and member.user_id<>caller then raise exception 'This beta signup belongs to a different account. Sign in with your original account email.';end if;
  perform routines_private.beta_action(caller,'state','{}');
  return jsonb_build_object('alreadyMember',true,'friends','[]'::jsonb);
 end if;
 select * into req from public.routine_beta_requests where email=canonical and not used and expires_at>now() and (request_id is null or id=request_id) order by created_at desc limit 1;
 if req.id is null then return jsonb_build_object('noPendingSignup',true,'friends','[]'::jsonb);end if;
 -- beta_action atomically consumes the request and applies a referral only once.
 return routines_private.beta_action(null,'verify',jsonb_build_object('hash',req.token_hash,'referralCode',referral_code));
end;$$;
revoke all on function routines_private.confirm_beta_account(uuid,uuid,text) from public,anon,authenticated;
grant execute on function routines_private.confirm_beta_account(uuid,uuid,text) to service_role;
create function public.routine_confirm_beta_account(caller uuid,request_id uuid default null,referral_code text default null) returns jsonb language sql security invoker set search_path='' as $$ select routines_private.confirm_beta_account(caller,request_id,referral_code) $$;
revoke all on function public.routine_confirm_beta_account(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.routine_confirm_beta_account(uuid,uuid,text) to service_role;
