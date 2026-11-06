begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();d uuid:=gen_random_uuid();gid uuid;cid uuid;did uuid;result jsonb;failed boolean;
begin
 insert into auth.users(id,email,email_confirmed_at) values(a,'link-test-a@example.invalid',now()),(b,'link-test-b@example.invalid',now()),(c,'link-test-c@example.invalid',now()),(d,'link-test-d@example.invalid',now());
 gid:=(public.routine_links_action(a,'plan','{"kind":"family"}')->>'id')::uuid;
 perform public.routine_links_action(a,'invite',jsonb_build_object('groupId',gid,'hash','test-code-one','email','link-test-b@example.invalid'));
 result:=public.routine_links_action(c,'preview','{"hash":"test-code-one"}');if not(result?'error') then raise exception 'Wrong-email preview succeeded';end if;
 result:=public.routine_links_action(b,'accept','{"hash":"test-code-one"}');if result->>'linked'<>'true' then raise exception 'Accept failed: %',result;end if;
 failed:=false;begin perform public.routine_links_action(a,'invite',jsonb_build_object('groupId',gid,'hash','full'));exception when others then failed:=true;end;if not failed then raise exception 'Family capacity not enforced';end if;
 result:=public.routine_links_action(c,'state');if jsonb_array_length(result->'groups')<>0 then raise exception 'Unrelated group exposed';end if;
 insert into public.routine_saved_dates(user_id,slot,label,event_date) values(a,1,'Shared example','2026-11-20') returning id into did;
 perform public.routine_links_action(a,'date',jsonb_build_object('groupId',gid,'dateId',did,'share',true));
 result:=public.routine_links_action(b,'state');if jsonb_array_length(result->'dates')<>1 then raise exception 'Shared date missing';end if;
 failed:=false;begin perform public.routine_links_action(b,'date',jsonb_build_object('groupId',gid,'dateId',did,'share',true));exception when others then failed:=true;end;if not failed then raise exception 'Another members date reshared';end if;
 perform public.routine_links_action(a,'value',jsonb_build_object('groupId',gid,'value','Kindness','share',true));
 result:=public.routine_links_action(b,'state');if result->'groups'->0->'values'->0->>'value'<>'Kindness' then raise exception 'Shared value missing';end if;
 perform public.routine_links_action(b,'unlink',jsonb_build_object('groupId',gid,'userId',b));result:=public.routine_links_action(b,'state');if jsonb_array_length(result->'dates')<>0 or jsonb_array_length(result->'groups')<>0 then raise exception 'Unlink retained access';end if;
 cid:=(public.routine_links_action(c,'plan','{"kind":"classroom"}')->>'id')::uuid;
 perform public.routine_links_action(c,'invite',jsonb_build_object('groupId',cid,'hash','class-one'));
 perform public.routine_links_action(a,'accept','{"hash":"class-one"}');
 result:=public.routine_links_action(d,'accept','{"hash":"class-one"}');if not(result?'error') then raise exception 'Code reused';end if;
 perform public.routine_links_action(c,'invite',jsonb_build_object('groupId',cid,'hash','class-two'));perform public.routine_links_action(d,'accept','{"hash":"class-two"}');
 failed:=false;begin perform public.routine_links_action(c,'plan','{"kind":"family"}');exception when others then failed:=true;end;if not failed then raise exception 'Over-capacity downgrade succeeded';end if;
 result:=public.routine_links_action(a,'teacher',jsonb_build_object('groupId',cid));if result->>'email'<>'link-test-c@example.invalid' then raise exception 'Wrong teacher';end if;
 if has_function_privilege('authenticated','public.routine_links_action(uuid,text,jsonb)','EXECUTE') or has_function_privilege('anon','routines_private.routine_links_action(uuid,text,jsonb)','EXECUTE') then raise exception 'Browser privilege leak';end if;
 raise notice 'Link tests passed: consent, capacities, target email, code reuse, sharing, unlink, teacher selection, browser privileges';
end $$;
rollback;
