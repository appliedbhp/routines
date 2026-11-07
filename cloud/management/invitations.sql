create table public.routine_admin_invitations (
 id uuid primary key,
 created_by uuid not null references auth.users(id),
 kind text not null check (kind in ('beta','free')),
 recipients jsonb not null check (jsonb_typeof(recipients)='array' and jsonb_array_length(recipients) between 1 and 50),
 subject text not null,
 body text not null,
 status text not null default 'pending' check (status in ('pending','accepted','uncertain')),
 provider_ids jsonb,
 error text,
 created_at timestamptz not null default now(),
 accepted_at timestamptz
);
create index routine_admin_invitations_created on public.routine_admin_invitations(created_at desc);
create index routine_admin_invitations_actor on public.routine_admin_invitations(created_by);
alter table public.routine_admin_invitations enable row level security;
revoke all on public.routine_admin_invitations from public,anon,authenticated;
grant select,insert,update on public.routine_admin_invitations to service_role;
