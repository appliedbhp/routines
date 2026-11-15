begin;
do $test$
declare actor uuid; person uuid:=gen_random_uuid(); report uuid; rev uuid; result jsonb; denied boolean:=false;
begin
 select user_id into actor from routines_admin_private.administrators limit 1;
 if actor is null then raise exception 'No administrator for verification.';end if;
 insert into auth.users(id,email,email_confirmed_at) values(person,'qa-feedback-'||person||'@example.invalid',now());
 insert into public.routine_account_grants(id,user_id,plan,expires_at,reason) values(gen_random_uuid(),person,'family',now()+interval '1 day','Rollback-only verification');
 result:=public.routine_beta_action(person,'bug','{"page":"/account/","description":"[Plan change request] Test downgrade for verification only","impact":"workaround","kind":"plan-change"}');
 report:=(result->>'id')::uuid;
 select revision into rev from public.routine_bug_reports where id=report;
 begin perform public.routine_beta_action(person,'bugs','{}');exception when others then if sqlerrm='Administrator access required.' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'Non-admin accessed feedback.';end if;
 perform public.routine_beta_action(actor,'bug-update',jsonb_build_object('id',report,'revision',rev,'priority',2,'status','triaged','notes','Verification','followupStatus','waiting-on-us','followupOn','2026-11-20'));
 select revision into rev from public.routine_bug_reports where id=report;
 result:=public.routine_beta_action(actor,'bugs',jsonb_build_object('search',report::text,'kind','plan-change','filter','all'));
 if result->'reports'->0->>'account_email' is null then raise exception 'Reporter join missing.';end if;
 perform public.routine_beta_action(actor,'plan-approve-free',jsonb_build_object('id',report,'revision',rev,'confirmed',true));
 if routines_private.beta_access(person)->>'plan'<>'free' then raise exception 'Downgrade did not apply.';end if;
 if not exists(select 1 from public.routine_account_grants where user_id=person and revoked_at is null) then raise exception 'Grant history changed.';end if;
 perform public.routine_beta_action(actor,'plan-restore',jsonb_build_object('userId',person,'confirmed',true));
 if routines_private.beta_access(person)->>'plan'<>'family' then raise exception 'Restore did not apply.';end if;
 if has_function_privilege('authenticated','public.routine_beta_action(uuid,text,jsonb)','EXECUTE') or has_table_privilege('authenticated','public.routine_feedback_activity','SELECT') then raise exception 'Unexpected browser privileges.';end if;
end;$test$;
rollback;
select 'Feedback permissions, reporter lookup, review, restore and history verified; test data rolled back' as verification;
