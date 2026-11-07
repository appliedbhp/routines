import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@23.0.0';
import {SITE,checkout} from './model.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const stripe=new Stripe(Deno.env.get('ROUTINES_API_KEY')||Deno.env.get('STRIPE_SECRET_KEY')||'missing',{apiVersion:'2026-09-30.endive',stripeContext:'acct_1UIYQeIiI1uuEHpt'});
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin===SITE)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'});
 const reply=(status:number,data:any)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&origin!==SITE)return reply(403,{error:'Origin not allowed.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 try{
  const reader=req.body?.getReader();if(!reader)return reply(400,{error:'Missing request.'});let text='',size=0;const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply(413,{error:'Request too large.'});}text+=decoder.decode(value,{stream:true});}
  const body=JSON.parse(text+decoder.decode()),order=checkout(body);
  const ip=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode((req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown')+Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))))).map(b=>b.toString(16).padStart(2,'0')).join('');
  for(const [bucket,max]of [['tips:'+ip,10],['tips-global',300]]){const {data,error}=await db.rpc('routine_beta_action',{caller:null,action:'limit',args:{bucket,max,seconds:3600}});if(error||!data?.allowed)return reply(429,{error:'Please wait before opening another checkout.'});}
  const session=await stripe.checkout.sessions.create(order.params,{idempotencyKey:order.key});
  if(!session.url)throw Error('No checkout URL');
  return reply(200,{url:session.url});
 }catch(e){return reply(400,{error:/^(Enter |Refresh )/.test(e?.message||'')?e.message:'Tip checkout is unavailable right now. Please try again later. Your free access is unchanged.'});}
});
