-- Dedicated secret is generated inside Vault and never returned to a client.
do $$begin
 if not exists(select 1 from vault.secrets where name='routines_admin_worker') then
  perform vault.create_secret(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'routines_admin_worker');
 end if;
end$$;
select cron.schedule('routines-admin-email-worker','*/5 * * * *',$job$
 select net.http_post(
  url:='https://soartoaobktpscnnbclq.supabase.co/functions/v1/routines-management',
  headers:=jsonb_build_object('Content-Type','application/json','x-routines-worker',(select decrypted_secret from vault.decrypted_secrets where name='routines_admin_worker')),
  body:='{"action":"worker"}'::jsonb,
  timeout_milliseconds:=60000);
$job$);
