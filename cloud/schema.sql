-- Apply to the selected Routines project only. Client writes go through the validated Edge Function.
begin;
create table public.routine_cloud_boards (
 user_id uuid not null references auth.users(id) on delete cascade,
 slot smallint not null check(slot in (1,2)),
 payload jsonb not null check (octet_length(payload::text)<=131072),
 revision uuid not null default gen_random_uuid(),
 attestation_version text not null check(attestation_version='no-personal-info-v1'),
 attested_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,slot)
);
alter table public.routine_cloud_boards enable row level security;
revoke all on public.routine_cloud_boards from anon,authenticated;
grant select,delete on public.routine_cloud_boards to authenticated;
grant all on public.routine_cloud_boards to service_role;
create policy "Read own boards" on public.routine_cloud_boards for select to authenticated
 using ((select auth.uid())=user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false));
create policy "Delete own boards" on public.routine_cloud_boards for delete to authenticated
 using ((select auth.uid())=user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false));
comment on table public.routine_cloud_boards is 'Two settings-only slots per adult account. No session data. Validated writes via cloud-board-save.';
commit;
