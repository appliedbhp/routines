begin;
grant usage on schema routines_admin_private to authenticated;
create function routines_admin_private.is_administrator()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from routines_admin_private.administrators where user_id = (select auth.uid()))
   and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false);
$$;
revoke all on function routines_admin_private.is_administrator() from public, anon;
grant execute on function routines_admin_private.is_administrator() to authenticated;

create function routines_admin_private.find_account(email_address text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not routines_admin_private.is_administrator() then
  raise exception 'Administrator access required' using errcode = '42501';
 end if;
 if email_address is null or char_length(btrim(email_address)) not between 3 and 254 then return null; end if;
 select jsonb_build_object('email', email, 'confirmed', email_confirmed_at is not null)
 into result from auth.users
 where lower(email) = lower(btrim(email_address)) and not is_anonymous
 limit 1;
 return result;
end;
$$;
revoke all on function routines_admin_private.find_account(text) from public, anon;
grant execute on function routines_admin_private.find_account(text) to authenticated;

create function public.routines_is_administrator()
returns boolean language sql stable security invoker set search_path = '' as $$
 select routines_admin_private.is_administrator();
$$;
create function public.routines_admin_find_account(email_address text)
returns jsonb language sql stable security invoker set search_path = '' as $$
 select routines_admin_private.find_account(email_address);
$$;
revoke all on function public.routines_is_administrator() from public, anon;
revoke all on function public.routines_admin_find_account(text) from public, anon;
grant execute on function public.routines_is_administrator() to authenticated;
grant execute on function public.routines_admin_find_account(text) to authenticated;
commit;
