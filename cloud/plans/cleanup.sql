begin;
-- Removing a resource also revokes sharing; later re-creating it never restores old access.
create function routines_private.remove_resource_shares() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='routine_cloud_values' then delete from public.routine_item_shares where owner_id=old.user_id and kind='value' and resource_id=old.value;
 elsif tg_table_name='routine_cloud_goals' then delete from public.routine_item_shares where owner_id=old.user_id and kind='goal' and resource_id=old.id::text;
 elsif tg_table_name='routine_saved_dates' then delete from public.routine_item_shares where owner_id=old.user_id and kind='date' and resource_id=old.id::text;
 elsif tg_table_name='routine_cloud_boards' then delete from public.routine_item_shares where owner_id=old.user_id and kind='board' and resource_id=old.slot::text;end if;
 return old;end;$$;
revoke all on function routines_private.remove_resource_shares() from public,anon,authenticated;
create trigger routine_value_share_cleanup after delete on public.routine_cloud_values for each row execute function routines_private.remove_resource_shares();
create trigger routine_goal_share_cleanup after delete on public.routine_cloud_goals for each row execute function routines_private.remove_resource_shares();
create trigger routine_date_share_cleanup after delete on public.routine_saved_dates for each row execute function routines_private.remove_resource_shares();
create trigger routine_board_share_cleanup after delete on public.routine_cloud_boards for each row execute function routines_private.remove_resource_shares();
commit;
