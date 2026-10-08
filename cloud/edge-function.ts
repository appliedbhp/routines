// Deployment bundles these three local files together, retaining their names.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import './board-settings.js';
import './save-handler.js';
const url=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const handler=globalThis.CloudBoardHandler.createHandler({
 settings:globalThis.CloudBoardSettings,
 allowedOrigins:['https://routines.getadhd.care'],
 authenticate:async(header:string)=>{
  if(!header.startsWith('Bearer '))return null;
  const {data,error}=await admin.auth.getUser(header.slice(7));
  return error?null:data.user;
 },
 insert:async(row:unknown)=>{
  const {data,error}=await admin.from('routine_cloud_boards').insert(row).select().single();
  if(error?.code==='23505')return null;if(error)throw error;return data;
 },
 replace:async(row:any,revision:string)=>{
  const {data,error}=await admin.from('routine_cloud_boards').update(row).eq('user_id',row.user_id).eq('slot',row.slot).eq('revision',revision).select().maybeSingle();
  if(error)throw error;return data;
 }
});
Deno.serve(handler);
