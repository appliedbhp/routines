import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createVisualHandler} from './handler.js';
const url=Deno.env.get('SUPABASE_URL')!;
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')!;
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createVisualHandler({
 githubToken:Deno.env.get('VISUALS_GITHUB_TOKEN'),
 openaiKey:Deno.env.get('ROUTINES_OPENAI_KEY'),
 imageModel:Deno.env.get('ROUTINES_IMAGE_MODEL')||'gpt-image-1.5',
 authenticate:async(header:string)=>{
  if(!header.startsWith('Bearer '))return false;
  const {data,error}=await service.auth.getUser(header.slice(7));
  if(error||!data.user||data.user.is_anonymous)return false;
  const scoped=createClient(url,publicKey,{global:{headers:{Authorization:header}},auth:{persistSession:false,autoRefreshToken:false}});
  const result=await scoped.rpc('routines_is_administrator');
  return !result.error&&result.data===true;
 }
}));
