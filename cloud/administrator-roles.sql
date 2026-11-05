begin;
create schema if not exists routines_admin_private;
revoke all on schema routines_admin_private from public, anon, authenticated;
create table if not exists routines_admin_private.administrators (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
alter table routines_admin_private.administrators enable row level security;
revoke all on routines_admin_private.administrators from public, anon, authenticated;
commit;
