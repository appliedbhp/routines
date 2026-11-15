begin;
create table if not exists public.routine_account_plan_restrictions(user_id uuid primary key references auth.users(id) on delete cascade,report_id uuid references public.routine_bug_reports(id),reviewed_by uuid references auth.users(id),created_at timestamptz not null default now(),restored_at timestamptz);
alter table public.routine_account_plan_restrictions enable row level security;
revoke all on public.routine_account_plan_restrictions from public,anon,authenticated;
grant all on public.routine_account_plan_restrictions to service_role;
-- Preserve the current access function and its OID/dependencies. Only add a reviewed Free restriction.
do $patch$
declare definition text;
begin
 definition:=pg_get_functiondef('routines_private.beta_access(uuid)'::regprocedure);
 if strpos(definition,'routine_account_plan_restrictions')=0 then
 if strpos(definition,' return jsonb_build_object(')=0 then raise exception 'Access function shape changed; review before patching.';end if;
 definition:=replace(definition,' return jsonb_build_object(',E' if not is_admin and exists(select 1 from public.routine_account_plan_restrictions where user_id=who and restored_at is null) then label:=\'free\';n:=2;active:=false;gifted:=0;end if;\n return jsonb_build_object(');
 definition:=replace(definition,'''beta'',member.email is not null', '''reviewedFree'',exists(select 1 from public.routine_account_plan_restrictions where user_id=who and restored_at is null) and not is_admin,''beta'',member.email is not null');
 execute definition;
 end if;
end;$patch$;
create or replace function routines_private.plan_review(caller uuid,action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.routine_bug_reports; target uuid; result jsonb;
begin
 if caller is null or not exists(select 1 from routines_admin_private.administrators where user_id=caller) then raise exception 'Administrator access required.';end if;
 if args->>'confirmed' is distinct from 'true' then raise exception 'Confirm this account change first.';end if;
 if action='plan-restore' then
 target:=(args->>'userId')::uuid;
 update public.routine_account_plan_restrictions set restored_at=now() where user_id=target and restored_at is null;
 if found then insert into public.routine_admin_audit(actor,action,detail) values(caller,'account-restore-purchased-access',jsonb_build_object('userId',target));end if;
 return jsonb_build_object('restored',true);
 end if;
 select * into r from public.routine_bug_reports where id=(args->>'id')::uuid for update;
 if r.id is null or r.revision is distinct from (args->>'revision')::uuid then raise exception 'This request changed. Refresh before reviewing.';end if;
 if r.kind<>'plan-change' or r.status in ('fixed','closed') or r.user_id is null then raise exception 'Choose an open account plan-change request.';end if;
 target:=r.user_id;
 if action='plan-approve-free' then
 if exists(select 1 from routines_admin_private.administrators where user_id=target) then raise exception 'Administrator accounts retain all features.';end if;
 insert into public.routine_account_plan_restrictions(user_id,report_id,reviewed_by) values(target,r.id,caller) on conflict(user_id) do update set report_id=excluded.report_id,reviewed_by=caller,created_at=now(),restored_at=null;
 elsif action<>'plan-decline' then raise exception 'Choose a valid plan review action.';end if;
 update public.routine_bug_reports set status='closed',revision=gen_random_uuid(),updated_at=now() where id=r.id;
 insert into public.routine_feedback_activity(report_id,actor,action,detail) values(r.id,caller,action,jsonb_build_object('notes',left(coalesce(args->>'reason',''),1000),'noRefund',true));
 insert into public.routine_admin_audit(actor,action,detail) values(caller,action,jsonb_build_object('userId',target,'reportId',r.id,'noRefund',true));
 return jsonb_build_object('reviewed',true,'plan',routines_private.beta_access(target)->>'plan');
end;$$;
revoke all on function routines_private.plan_review(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function routines_private.plan_review(uuid,text,jsonb) to service_role;
create or replace function public.routine_beta_action(caller uuid,action text,args jsonb default '{}') returns jsonb language sql set search_path='' as $$ select case when action in ('bug','bugs','bug-update') then routines_private.feedback_action(caller,action,args) when action in ('plan-approve-free','plan-decline','plan-restore') then routines_private.plan_review(caller,action,args) else routines_private.beta_action(caller,action,args) end $$;
revoke all on function public.routine_beta_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.routine_beta_action(uuid,text,jsonb) to service_role;
-- Future subscriptions: no recurring product, charge, or customer subscription is created here.
insert into public.routine_beta_config(key,value) values('plan_change_policy','{"subscriptionUpgradeTiming":"current_period_end","subscriptionDowngradeTiming":"current_period_end","proration":"none","lifetimeDowngrade":"administrator_review","recurringBillingEnabled":false}') on conflict(key) do update set value=excluded.value;
commit;
