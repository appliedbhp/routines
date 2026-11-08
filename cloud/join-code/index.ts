import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(Deno.env.get('SUPABASE_URL')!,secret,{auth:{persistSession:false}});
const bytes=new TextEncoder(),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',bytes.encode(secret)),'AES-GCM',false,['encrypt','decrypt']);
const encode=(a:Uint8Array)=>btoa(String.fromCharCode(...a));
const decode=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function seal(s:string){const iv=crypto.getRandomValues(new Uint8Array(12));return encode(iv)+'.'+encode(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes.encode(s))));}
async function open(s:string){const [iv,data]=s.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},key,decode(data)));}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const allowed=origin==='https://routines.getadhd.care'||/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed?origin:'https://routines.getadhd.care','Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed)return reply({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Use POST'},405);
 try{
  const raw=await req.text();if(raw.length>1200)return reply({error:'Request too large'},400);
  const b=JSON.parse(raw),window=Math.floor(Date.now()/600000);
  // Edge gateway provides the connection IP; retain only a window-specific salted hash.
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',').pop()!.trim();
  const bucket=await hash(secret+':'+window+':'+ip);
  const {data:hits,error:limitError}=await admin.rpc('routine_join_limit',{p_bucket:bucket,p_expires:new Date((window+2)*600000).toISOString()});
  if(limitError)throw limitError;if(hits>60)return reply({error:'Too many attempts. Please wait a few minutes.'},429);
  if(['access','authorize','create'].includes(b.action)){
   const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'')||'';
   const {data,error}=await admin.auth.getUser(token);const user=data?.user;
   if(error||!user?.email_confirmed_at||user.is_anonymous)return reply({error:'Sign in to a paid account to use two devices.',upgrade:true},401);
   const {data:access,error:accessError}=await admin.rpc('routine_two_device_access',{caller:user.id});
   if(accessError)throw accessError;
   if(!access)return reply({error:'Two-device self-monitoring requires a paid plan. One device is always free.',upgrade:true},403);
   if(b.action==='access')return reply({allowed:true});
   if(b.action==='authorize'){
    if(typeof b.topic!=='string'||!/^routine-live-[A-Za-z0-9_-]{43}$/.test(b.topic)||!Number.isFinite(b.expires))return reply({error:'Invalid pairing'},400);
    const {data:authorized,error:authorizeError}=await admin.rpc('routine_live_authorize',{caller:user.id,p_topic:b.topic,p_expires:new Date(b.expires).toISOString()});if(authorizeError)throw authorizeError;
    return authorized?reply({allowed:true}):reply({error:'Two-device access is unavailable.',upgrade:true},403);
   }
  }
  if(b.action==='create'){
   if(typeof b.invitation!=='string'||!/^1\.[\w-]{43}\.[\w-]{36}\.[a-z0-9]+\.[\w-]{87}$/.test(b.invitation)||!/^[-\w]{43}$/.test(b.owner))return reply({error:'Invalid invitation'},400);
   const expires=parseInt(b.invitation.split('.')[3],36);if(expires<=Date.now()||expires>Date.now()+7500000)return reply({error:'Invalid expiry'},400);
   const expires_at=new Date(Math.min(expires,Date.now()+15*60000)).toISOString(),invitation=await seal(b.invitation),owner_hash=await hash(b.owner);
   for(let i=0;i<8;i++){const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>alphabet[n%32]).join('');const {error}=await admin.from('routine_join_codes').insert({code,invitation,owner_hash,expires_at});if(!error)return reply({code,expires:Date.parse(expires_at)});if(error.code!=='23505')throw error;}
   throw Error('Code allocation failed');
  }
  const code=String(b.code||'').toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))return reply({error:'Enter the six-character code.'},400);
  if(b.action==='remove'){
   if(!/^[-\w]{43}$/.test(b.owner))return reply({error:'Invalid owner'},400);
   const {error}=await admin.from('routine_join_codes').delete().eq('code',code).eq('owner_hash',await hash(b.owner));if(error)throw error;return reply({ok:true});
  }
  if(b.action==='claim'&&/^[-\w]{36}$/.test(b.claim)){
   const {data,error}=await admin.rpc('routine_join_claim',{p_code:code,p_claim:await hash(b.claim)});if(error)throw error;
   if(!data)return reply({error:'Code expired, already used, or not found. Ask for a new QR code.'},404);
   return reply({invitation:await open(data)});
  }
  return reply({error:'Invalid request'},400);
 }catch{return reply({error:'Unable to connect right now. Please try again.'},503);}
});
