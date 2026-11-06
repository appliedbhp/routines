create table public.routine_saved_dates (
 user_id uuid not null references auth.users(id) on delete cascade,
 slot smallint not null check (slot between 1 and 5),
 id uuid not null default gen_random_uuid(),
 label text not null check (char_length(trim(label)) between 1 and 80),
 event_date date not null check (event_date between date '1900-01-01' and date '2200-12-31'),
 recurrence text not null default 'once' check (recurrence in ('once','weekly','monthly','yearly')),
 category text not null default 'Other' check (category in ('Birthday','Anniversary','Graduation','Payment','Subscription','Deadline','Other')),
 source_key text check (char_length(source_key) <= 120),
 primary key(user_id,slot),
 unique(user_id,id),
 unique(user_id,source_key)
);
alter table public.routine_saved_dates enable row level security;
revoke all on public.routine_saved_dates from anon, authenticated;
grant select,insert,update,delete on public.routine_saved_dates to authenticated;
create policy "Own saved dates" on public.routine_saved_dates for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
comment on table public.routine_saved_dates is 'Five date slots shared across planning and memory tools per account; no contact, payment credentials, notes, or session data.';
