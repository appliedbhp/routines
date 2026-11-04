-- Apply to the Routines project before publishing the homework sharing UI.
begin;
create schema if not exists routines_homework_private;
revoke all on schema routines_homework_private from public;
grant usage on schema routines_homework_private to anon, authenticated;

create function routines_homework_private.valid_chart(subjects jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare subject jsonb; entry jsonb;
begin
 if jsonb_typeof(subjects) <> 'array' or octet_length(subjects::text) > 65536 then return false; end if;
 if jsonb_array_length(subjects) not between 1 and 8 then return false; end if;
 for subject in select value from jsonb_array_elements(subjects) loop
  if jsonb_typeof(subject) <> 'object' then return false; end if;
  if subject - array['name','entries'] <> '{}'::jsonb
     or jsonb_typeof(subject->'name') is distinct from 'string'
     or char_length(btrim(subject->>'name')) not between 1 and 60
     or jsonb_typeof(subject->'entries') is distinct from 'array' then return false; end if;
  if jsonb_array_length(subject->'entries') <> 7 then return false; end if;
  for entry in select value from jsonb_array_elements(subject->'entries') loop
   if jsonb_typeof(entry) <> 'object' then return false; end if;
   if entry - array['status','assignment','due'] <> '{}'::jsonb
      or coalesce(entry->>'status','') not in ('pending','none','assigned')
      or jsonb_typeof(entry->'assignment') is distinct from 'string'
      or jsonb_typeof(entry->'due') is distinct from 'string'
      or char_length(entry->>'assignment') > 500
      or entry->>'due' !~ '^([0-9]{4}-[0-9]{2}-[0-9]{2})?$'
      or (entry->>'due' <> '' and not pg_input_is_valid(entry->>'due','date'))
      or (entry->>'status' = 'assigned' and btrim(entry->>'assignment') = '')
      or (entry->>'status' <> 'assigned' and (entry->>'assignment' <> '' or entry->>'due' <> ''))
      then return false; end if;
  end loop;
 end loop;
 return true;
end;
$$;
revoke all on function routines_homework_private.valid_chart(jsonb) from public;
grant execute on function routines_homework_private.valid_chart(jsonb) to authenticated;

create table public.routine_homework_charts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 100),
 week date not null check (extract(isodow from week)=1 and week between '2000-01-01' and '2100-01-01'),
 weekends boolean not null default false,
 subjects jsonb not null check (routines_homework_private.valid_chart(subjects)),
 revision uuid not null default gen_random_uuid(),
 updated_at timestamptz not null default now()
);
create index routine_homework_charts_owner_idx on public.routine_homework_charts(owner_id, week desc);
alter table public.routine_homework_charts enable row level security;
revoke all on public.routine_homework_charts from public, anon, authenticated;
grant select, delete on public.routine_homework_charts to authenticated;
grant insert(title,week,weekends,subjects), update(title,weekends,subjects) on public.routine_homework_charts to authenticated;
create policy "Verified adults manage their own homework charts" on public.routine_homework_charts
 for all to authenticated
 using (owner_id=(select auth.uid()) and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false))
 with check (owner_id=(select auth.uid()) and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false));

create function routines_homework_private.touch_chart()
returns trigger language plpgsql set search_path = '' as $$
begin
 new.revision := gen_random_uuid();
 new.updated_at := clock_timestamp();
 return new;
end;
$$;
revoke all on function routines_homework_private.touch_chart() from public;
create trigger routine_homework_charts_touch before update on public.routine_homework_charts
 for each row execute function routines_homework_private.touch_chart();

-- The only family lookup requires the exact randomly generated link ID.
-- Return only the published fields, never the owner, account information, or revision.
create function routines_homework_private.chart_by_link(link_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('title', c.title, 'week', c.week, 'weekends', c.weekends,
                           'subjects', c.subjects, 'updated_at', c.updated_at)
 from public.routine_homework_charts c where c.id = link_id;
$$;
revoke all on function routines_homework_private.chart_by_link(uuid) from public;
grant execute on function routines_homework_private.chart_by_link(uuid) to anon, authenticated;
create function public.routine_homework_by_link(link_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
 select routines_homework_private.chart_by_link(link_id);
$$;
revoke all on function public.routine_homework_by_link(uuid) from public;
grant execute on function public.routine_homework_by_link(uuid) to anon, authenticated;
commit;
