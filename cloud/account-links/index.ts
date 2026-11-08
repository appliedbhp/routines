import './symbol-library.js';
import './board-settings.js';
import {readBody} from './model.mjs';
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const origin='https://routines.getadhd.care';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
async function mail(to:string,subject:string,html:string){const key=Deno.env.get('RESEND_API_KEY');if(!key)return false;try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Routines by ABHP <noreply@auth.getadhd.care>',to:[to],subject,html})});return r.ok;}catch{return false;}}
Deno.serve(async req=>{
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return respond({error:'Origin not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return respond({error:'Use POST.'},405);
 try{
 if(Number(req.headers.get('content-length')||0)>131072)return respond({error:'Request too large.'},413);
 const jwt=req.headers.get('Authorization')?.replace(/^Bearer /i,'');if(!jwt)return respond({error:'Sign in first.'},401);
 const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error}=await service.auth.getUser(jwt);if(error||!auth.user)return respond({error:'Sign in again.'},401);
 const {data:rate,error:rateError}=await service.rpc('routine_beta_action',{caller:null,action:'limit',args:{bucket:'account-links:'+auth.user.id,max:150,seconds:600}});if(rateError||!rate?.allowed)return respond({error:'Too many requests. Try again in ten minutes.'},429);
 const raw=await readBody(req,131072);const body=JSON.parse(raw),action=body.action,args={...(body.args||{})};
 if(!['state','preview','accept','invite','revoke','unlink','share','session','board-open','board-edit','resources','values-save','goal-save','goal-delete','educator-request','educator-list','educator-review','link-exception'].includes(action))return respond({error:'Unknown action.'},400);
 let code='';if(action==='invite'){const bytes=crypto.getRandomValues(new Uint8Array(10)),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';code=Array.from(bytes,b=>alphabet[b%32]).join('');args.hash=await hash(code);}
 if(action==='preview'||action==='accept'){code=String(args.code||'').toUpperCase().replace(/[\s-]/g,'');args.hash=await hash(code);delete args.code;}
 if(action==='board-edit'){if(args.attested!==true)return respond({error:'Confirm that this board contains no personal information.'},400);args.payload=(globalThis as any).CloudBoardSettings.clean(args.payload);}
 let sessionURL:URL|undefined;if(action==='session'){const {data:access,error:accessError}=await service.rpc('routine_two_device_access',{caller:auth.user.id});if(accessError)throw accessError;if(!access)return respond({error:'Two-device self-monitoring requires a paid plan.'},403);try{sessionURL=new URL(args.url);if(sessionURL.origin!==origin||!['/join/','/self-monitor/join/'].includes(sessionURL.pathname)||!sessionURL.hash||sessionURL.href.length>2500)throw Error();}catch{return respond({error:'Create a session QR code before inviting your linked person.'},400);}}
 const {data,error:rpcError}=await service.rpc(['resources','values-save','goal-save','goal-delete','educator-request','educator-list','educator-review','link-exception'].includes(action)?'routine_plan_action':'routine_links_action',{caller:auth.user.id,action,args});if(rpcError)return respond({error:rpcError.message},400);if(data?.error)return respond(data,400);
 if(action==='invite'){const url=origin+'/link/#'+code;const sent=args.email?await mail(args.email.trim().toLowerCase(),'Invitation to link Routines accounts',`<p>You have been invited to link Routines accounts.</p><p>Review the invitation and choose whether to agree. Linking shares your account email addresses. Nothing else is shared until you select individual boards, dates, goals, or values. Each account uses a link slot; one replacement per calendar month is allowed (Pacific Time).</p><p><a href="${url}">Review invitation</a></p><p>Or visit ${origin}/link and enter <strong>${code}</strong>. This single-use invitation expires in 24 hours.</p>`):false;return respond({...data,code,url,emailSent:sent});}
 if(action==='session'){const sent=await mail(data.email,'Join a Routines self-monitor session',`<p>A linked account has invited you to join their self-monitor session.</p><p><a href="${escape(sessionURL!.href)}">Join session</a></p><p>Keep the session screen open. This private link gives access to this session only; do not forward it. If the link expires, ask for a new invitation.</p>`);return respond({emailSent:sent});}
 return respond(data);
 }catch{return respond({error:'Could not complete that request. Please try again.'},500);}
});
