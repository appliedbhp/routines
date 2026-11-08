-- Verified educator email domains. Private allowlist; no client write access.
create table if not exists routines_private.educator_domains (
 domain text primary key, district text not null, district_subdomains boolean not null default false, source_url text not null
);
alter table routines_private.educator_domains enable row level security;
revoke all on routines_private.educator_domains from public, anon, authenticated;
insert into routines_private.educator_domains(domain,district,district_subdomains,source_url) values
('sandi.net','San Diego Unified',false,'https://staff.sandiegounified.org/common/pages/DisplayFile.aspx?itemId=29999176'),
('powayusd.com','Poway Unified',false,'https://www.cde.ca.gov/schooldirectory/details?cdscode=37682960000000'),
('carlsbadusd.net','Carlsbad Unified',false,'https://www.carlsbadusd.net/personnel-staff'),
('k12.ma.us','Massachusetts public-school district domains',true,'https://www.newton.k12.ma.us/district-at-a-glance/public-records-requests'),
('smusd.org','San Marcos Unified',false,'https://www.smusd.org/welcome'),
('oside.us','Oceanside Unified',false,'https://www.oside.us/family-community'),
('sduhsd.net','San Dieguito Union High',false,'https://www.sduhsd.net/Parents--Students/Contact-Us/index.html'),
('sweetwaterschools.org','Sweetwater Union High',false,'https://hr.sweetwaterschools.org/'),
('vistausd.org','Vista Unified',false,'https://vhs.vistausd.org/link-1')
on conflict(domain) do update set district=excluded.district,district_subdomains=excluded.district_subdomains,source_url=excluded.source_url;

create or replace function routines_private.verified_educator_domain(addr text)
returns boolean language sql stable set search_path='' as $$
 select coalesce(addr ~ '^[^@[:space:]]+@[^@[:space:]]+$' and exists(
 select 1 from routines_private.educator_domains d
 where lower(split_part(addr,'@',2))=d.domain
 or (d.district_subdomains and lower(split_part(addr,'@',2)) ~ ('^[a-z0-9-]+[.]' || replace(d.domain,'.','[.]') || '$'))
 ),false);
$$;
revoke all on function routines_private.verified_educator_domain(text) from public,anon,authenticated;

create or replace function routines_private.approve_school_email()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='pending' then
  if TG_OP='UPDATE' then
   if old.status='declined' and lower(old.email)=lower(new.email) then
    new.status:='declined';new.reviewed_at:=old.reviewed_at;new.reviewed_by:=old.reviewed_by;
    return new;
   end if;
  end if;
  if routines_private.verified_educator_domain(new.email) and exists(
   select 1 from auth.users u where u.id=new.user_id and lower(u.email)=lower(new.email)
   and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
  ) then
   new.status:='approved';new.reviewed_at:=now();new.reviewed_by:=null;
  end if;
 end if;
 return new;
end;$$;
revoke all on function routines_private.approve_school_email() from public,anon,authenticated;
drop trigger if exists approve_school_email on public.routine_educators;
create trigger approve_school_email before insert or update on public.routine_educators
for each row execute function routines_private.approve_school_email();

create or replace function routines_private.start_approved_educator_beta()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='approved' then
  update public.routine_beta_members set access_started_at=coalesce(access_started_at,now())
  where user_id=new.user_id and plan_kind='classroom';
 end if;
 return new;
end;$$;
revoke all on function routines_private.start_approved_educator_beta() from public,anon,authenticated;
drop trigger if exists start_approved_educator_beta on public.routine_educators;
create trigger start_approved_educator_beta after insert or update on public.routine_educators
for each row execute function routines_private.start_approved_educator_beta();

-- Re-evaluate pending requests only; confirmed-current-email checks run in the trigger.
update public.routine_educators set status='pending'
where status='pending' and routines_private.verified_educator_domain(email);
