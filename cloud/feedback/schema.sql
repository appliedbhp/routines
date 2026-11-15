begin;
alter table public.routine_bug_reports add column if not exists kind text not null default 'bug' check(kind in ('bug','feature','plan-change'));
alter table public.routine_bug_reports add column if not exists contact_name text not null default '' check(length(contact_name)<=100);
alter table public.routine_bug_reports add column if not exists contact_email text not null default '' check(length(contact_email)<=254);
alter table public.routine_bug_reports add column if not exists followup_status text not null default 'not-contacted' check(followup_status in ('not-contacted','waiting-on-us','waiting-on-reporter','followed-up','no-contact'));
alter table public.routine_bug_reports add column if not exists followup_on date;
alter table public.routine_bug_reports add column if not exists last_contacted_at timestamptz;
update public.routine_bug_reports set kind=case when description like '[Feature request]%' then 'feature' when description like '[Plan change request]%' then 'plan-change' else 'bug' end where kind='bug';
create table if not exists public.routine_feedback_activity(id uuid primary key default gen_random_uuid(),report_id uuid not null references public.routine_bug_reports(id) on delete cascade,actor uuid references auth.users(id) on delete set null,action text not null,detail jsonb not null default '{}',created_at timestamptz not null default now());
alter table public.routine_feedback_activity enable row level security;
revoke all on public.routine_feedback_activity from public,anon,authenticated;
grant all on public.routine_feedback_activity to service_role;
create index if not exists routine_feedback_activity_report on public.routine_feedback_activity(report_id,created_at desc);
create or replace function routines_private.feedback_action(caller uuid,action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.routine_bug_reports; ident uuid; kind text; result jsonb; v_name text; v_email text;
begin
 if action='bug' then
 kind:=case when args->>'kind' in ('bug','feature','plan-change') then args->>'kind' when args->>'description' like '[Feature request]%' then 'feature' when args->>'description' like '[Plan change request]%' then 'plan-change' else 'bug' end;
 if kind='plan-change' and caller is null then raise exception 'Sign in to request a plan change.';end if;
 v_name:=trim(coalesce(args->>'contactName',''));v_email:=lower(trim(coalesce(args->>'contactEmail','')));
 if length(v_name)>100 or length(v_email)>254 or (v_email<>'' and v_email!~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$') then raise exception 'Enter a valid contact email and name.';end if;
 if v_email<>'' and not coalesce((args->>'contactConsent')::boolean,false) then raise exception 'Please allow follow-up to the contact email.';end if;
 insert into public.routine_bug_reports(user_id,page,description,impact,priority,kind,contact_name,contact_email) values(caller,args->>'page',args->>'description',args->>'impact',case args->>'impact' when 'blocked' then 1 when 'workaround' then 2 else 3 end,kind,v_name,v_email) returning id into ident;
 return jsonb_build_object('id',ident);
 end if;
 if caller is null or not exists(select 1 from routines_admin_private.administrators where user_id=caller) then raise exception 'Administrator access required.';end if;
 if action='bugs' then
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
 select b.*,u.email as account_email,u.email_confirmed_at is not null as account_verified,coalesce(nullif(u.raw_user_meta_data->>'username',''),nullif(u.raw_user_meta_data->>'display_name',''),nullif(u.raw_user_meta_data->>'full_name','')) as account_name,
 case when u.id is not null then routines_private.beta_access(u.id)->>'plan' else null end as account_plan,
 (select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select a.action,a.detail,a.created_at,actor.email as actor_email from public.routine_feedback_activity a left join auth.users actor on actor.id=a.actor where a.report_id=b.id order by a.created_at desc limit 20)a) as activity
 from public.routine_bug_reports b left join auth.users u on u.id=b.user_id
 where (coalesce(args->>'kind','all')='all' or b.kind=args->>'kind') and
 (coalesce(args->>'filter','open')='all' or (args->>'filter'='closed' and b.status in ('fixed','closed')) or (coalesce(args->>'filter','open')='open' and b.status not in ('fixed','closed'))) and
 (coalesce(args->>'search','')='' or strpos(lower(concat_ws(' ',b.description,b.page,u.email,b.contact_email,b.contact_name,u.raw_user_meta_data->>'username',b.id::text)),lower(left(args->>'search',200)))>0) and
 (coalesce(args->>'followup','all')='all' or (args->>'followup'='due' and b.followup_on<=current_date and b.status not in ('fixed','closed')) or b.followup_status=args->>'followup')
 order by b.priority,b.created_at limit 100 offset least(greatest(coalesce((args->>'offset')::int,0),0),10000))x;
 return jsonb_build_object('reports',result);
 elsif action='bug-update' then
 select * into r from public.routine_bug_reports where id=(args->>'id')::uuid for update;
 if r.id is null or r.revision<>(args->>'revision')::uuid or args->>'revision' is null then raise exception 'This report changed. Refresh the log before saving.';end if;
 update public.routine_bug_reports set priority=(args->>'priority')::smallint,status=args->>'status',notes=coalesce(args->>'notes',''),
 followup_status=coalesce(args->>'followupStatus',r.followup_status),followup_on=case when args?'followupOn' then nullif(args->>'followupOn','')::date else r.followup_on end,
 last_contacted_at=case when args->>'markContacted'='true' then now() else r.last_contacted_at end,revision=gen_random_uuid(),updated_at=now() where id=r.id;
 insert into public.routine_feedback_activity(report_id,actor,action,detail) values(r.id,caller,case when args->>'markContacted'='true' then 'marked-contacted' else 'triage-updated' end,jsonb_build_object('status',args->>'status','priority',(args->>'priority')::int,'followupStatus',coalesce(args->>'followupStatus',r.followup_status),'followupOn',args->>'followupOn','notes',coalesce(args->>'notes','')));
 return jsonb_build_object('saved',true);
 end if;
 raise exception 'Unknown feedback action.';
end;$$;
revoke all on function routines_private.feedback_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function routines_private.feedback_action(uuid,text,jsonb) to service_role;
create or replace function public.routine_beta_action(caller uuid,action text,args jsonb default '{}') returns jsonb language sql set search_path='' as $$ select case when action in ('bug','bugs','bug-update') then routines_private.feedback_action(caller,action,args) else routines_private.beta_action(caller,action,args) end $$;
revoke all on function public.routine_beta_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.routine_beta_action(uuid,text,jsonb) to service_role;
commit;
