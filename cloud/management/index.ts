import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@23.0.0';
import {uuid,sequence,discount,emailText,SITE} from './model.mjs';
import {sendInvitationBatch} from './invitations.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const stripe=new Stripe(Deno.env.get('ROUTINES_API_KEY')||Deno.env.get('STRIPE_SECRET_KEY')||'missing',{apiVersion:'2026-09-30.endive',stripeContext:'acct_1UIYQeIiI1uuEHpt'});
const prices=['price_1UZ0uaIiI1uuEHptwAaCOmr0','price_1UZ0ucIiI1uuEHptKqXXBbjp'];
function checked(r:any){if(r.error)throw Error('Could not save or load this record. Refresh and try again.');return r.data;}
async function audit(actor:string,action:string,detail:any){checked(await db.from('routine_admin_audit').insert({actor,action,detail}));}
async function health(){let discounts=false;try{await stripe.coupons.list({limit:1});await stripe.promotionCodes.list({limit:1});discounts=true;}catch{}return {email:!!Deno.env.get('RESEND_API_KEY'),discounts};}
async function processMail(){
 if(!Deno.env.get('RESEND_API_KEY'))throw Error('Email delivery is not configured.');
 const rows=checked(await db.rpc('routines_admin_claim_mail'));let accepted=0;
 for(const row of rows){
  try{
   const contact=checked(await db.from('routine_admin_contacts').select().eq('user_id',row.user_id).single());
   const {data,error}=await db.auth.admin.getUserById(row.user_id);if(error)throw error;
   if(!contact.opted_in||!data.user.email_confirmed_at||data.user.email!==contact.consent_email||row.recipient_email!==contact.consent_email){checked(await db.from('routine_admin_deliveries').update({status:'cancelled',error:'Recipient is no longer eligible.'}).eq('id',row.id));continue;}
   const unsubscribe=Deno.env.get('SUPABASE_URL')+'/functions/v1/routines-management?unsubscribe='+contact.unsubscribe_token;
   const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+Deno.env.get('RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':'routines-admin-'+row.id},body:JSON.stringify({from:'Routines by ABHP <noreply@auth.getadhd.care>',to:[contact.consent_email],subject:row.subject,text:emailText(row.body,unsubscribe),headers:{'List-Unsubscribe':'<'+unsubscribe+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}})});
   const payload=await res.json();if(!res.ok)throw Error('Email provider did not accept the message.');
   checked(await db.from('routine_admin_deliveries').update({status:'sent',sent_at:new Date().toISOString(),provider_id:payload.id,error:null}).eq('id',row.id));accepted++;
  }catch{checked(await db.from('routine_admin_deliveries').update({status:row.attempts>=5?'failed':'sending',error:'Delivery failed or status uncertain. Check Resend before resending.'}).eq('id',row.id));}
 }
 return {processed:rows.length,accepted};
}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'',url=new URL(req.url);
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin===SITE)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'});
 const reply=(status:number,data:any)=>new Response(JSON.stringify(data),{status,headers});
 // Unsubscribe GET displays confirmation; email scanners must not opt users out.
 if(url.searchParams.has('unsubscribe')){
  const token=url.searchParams.get('unsubscribe');if(!/^[a-f0-9-]{36}$/.test(token||''))return new Response('Invalid link',{status:400});
  if(req.method==='POST'){
   const {error}=await db.from('routine_admin_contacts').update({opted_in:false,updated_at:new Date().toISOString()}).eq('unsubscribe_token',token);
   if(error)return new Response('Please try again.',{status:503});
   return new Response('You are unsubscribed from Routines promotional emails.',{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
  }
  if(req.method==='GET')return new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>Routines email preferences</title><main style="max-width:32rem;margin:15vh auto;padding:24px;font:18px system-ui"><h1>Unsubscribe from Routines</h1><p>Account and sign-in emails will continue.</p><form method="post"><button style="padding:14px">Unsubscribe</button></form></main>',{headers:{'Content-Type':'text/html','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
  return reply(405,{error:'Use GET or POST.'});
 }
 if(origin&&origin!==SITE)return reply(403,{error:'Origin not allowed.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 try{
  const reader=req.body?.getReader();let text='',size=0;const dec=new TextDecoder();if(!reader)return reply(400,{error:'Missing request.'});for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>100000){await reader.cancel();return reply(413,{error:'Request too large.'});}text+=dec.decode(value,{stream:true});}const body=JSON.parse(text+dec.decode());
  if(body.action==='worker'||body.action==='worker-health'){
   if(!checked(await db.rpc('routines_admin_worker_auth',{secret:req.headers.get('x-routines-worker')||''})))return reply(403,{error:'Not allowed.'});
   return reply(200,body.action==='worker-health'?await health():await processMail());
  }
  const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  const {data,error}=await db.auth.getUser(bearer);const user=data?.user;
  if(error||!user?.email_confirmed_at||user.is_anonymous)return reply(401,{error:'Sign in with a confirmed account.'});
  if(body.action==='email-preference'){
   if(typeof body.optedIn==='boolean'){
    checked(await db.from('routine_admin_contacts').upsert({user_id:user.id,opted_in:body.optedIn,consent_at:body.optedIn?new Date().toISOString():null,consent_email:user.email,consent_source:'account-settings',updated_at:new Date().toISOString()},{onConflict:'user_id'}));
    if(!body.optedIn)checked(await db.from('routine_admin_deliveries').update({status:'cancelled'}).eq('user_id',user.id).eq('status','queued'));
   }
   const contact=checked(await db.from('routine_admin_contacts').select('opted_in,consent_email').eq('user_id',user.id).maybeSingle());return reply(200,{optedIn:!!contact?.opted_in&&contact.consent_email===user.email});
  }
  const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+bearer}},auth:{persistSession:false,autoRefreshToken:false}});
  const allowed=await caller.rpc('routines_is_administrator');if(allowed.error||allowed.data!==true)return reply(403,{error:'Administrator access required.'});
  const limit=checked(await db.rpc('routine_beta_action',{caller:null,action:'limit',args:{bucket:'management:'+user.id,max:120,seconds:3600}}));if(!limit.allowed)return reply(429,{error:'Please wait before trying again.'});

  if(['account-detail','account-grant','account-revoke-grant','account-discount'].includes(body.action)){
   const target=uuid(body.userId);
   const detail=checked(await db.rpc('routines_admin_account',{caller:user.id,target,action:'detail',args:{}}));
   if(body.action==='account-detail')return reply(200,detail);
   if(body.confirmed!==true)throw Error('Review and confirm this account action first.');
   if(body.action==='account-grant'||body.action==='account-revoke-grant'){
    const result=checked(await db.rpc('routines_admin_account',{caller:user.id,target,action:body.action==='account-grant'?'grant':'revoke-grant',args:{id:uuid(body.id),plan:body.plan,reason:body.reason}}));return reply(200,result);
   }
   const id=uuid(body.id),percent=Number(body.percent);
   if(!Number.isInteger(percent)||percent<1||percent>99)throw Error('Choose a discount from 1 to 99 percent.');
   const existing=checked(await db.from('routine_account_discounts').select().eq('id',id).maybeSingle());
   if(existing){if(existing.user_id!==target)throw Error('Could not use this request.');return reply(200,existing);}
   const expires=Math.floor(new Date(body.expires).getTime()/1000);if(!Number.isFinite(expires)||expires<=Date.now()/1000||expires>Date.now()/1000+31*86400)throw Error('Choose a valid discount expiry.');
   const products=[...new Set(await Promise.all(prices.map(async p=>String((await stripe.prices.retrieve(p)).product))))];
   const coupon=await stripe.coupons.create({name:'Routines account discount',duration:'once',percent_off:percent,max_redemptions:1,redeem_by:expires,applies_to:{products},metadata:{app:'routines',userId:target,request:id}},{idempotencyKey:'routines-account-discount-'+id});
   const row={id,user_id:target,coupon_id:coupon.id,percent_off:percent,expires_at:new Date(expires*1000).toISOString()};
   checked(await db.from('routine_account_discounts').insert(row));
   await audit(user.id,'account-discount',{userId:target,id,percent,expiresAt:row.expires_at});
   return reply(200,row);
  }

  if(body.action==='invite-send'){
   const store={
    get:async(id:string)=>checked(await db.from('routine_admin_invitations').select().eq('id',id).maybeSingle()),
    create:async(row:any)=>{checked(await db.from('routine_admin_invitations').upsert(row,{onConflict:'id',ignoreDuplicates:true}));},
    update:async(id:string,patch:any)=>{checked(await db.from('routine_admin_invitations').update(patch).eq('id',id));}
   };
   const result=await sendInvitationBatch(body,user.id,{store,apiKey:Deno.env.get('RESEND_API_KEY')});
   return reply(200,result);
  }
  if(body.action==='list'){
   const tables:Record<string,string>={tips:'routine_tips',invitations:'routine_admin_invitations',sequences:'routine_admin_sequences',deliveries:'routine_admin_deliveries',discounts:'routine_admin_discounts',audit:'routine_admin_audit'};
   const table=tables[body.section];if(!table)throw Error('Choose a valid section.');
   const order=body.section==='deliveries'?'due_at':'created_at';let query=db.from(table).select('*',{count:'exact'}).order(order,{ascending:false}).range(Math.max(0,Number(body.skip)||0),Math.max(0,Number(body.skip)||0)+49);
   const result=await query;checked(result);return reply(200,{rows:result.data,total:result.count});
  }
  if(body.action==='sequence-save'){
   const value=sequence(body);let row;
   if(body.id){row=checked(await db.from('routine_admin_sequences').update({...value,revision:crypto.randomUUID(),updated_at:new Date().toISOString()}).eq('id',uuid(body.id)).eq('revision',uuid(body.revision)).select().maybeSingle());if(!row)throw Error('This sequence changed. Refresh before saving.');}
   else row=checked(await db.from('routine_admin_sequences').insert({...value,created_by:user.id}).select().single());
   await audit(user.id,'sequence-save',{id:row.id,name:row.name});return reply(200,row);
  }
  if(body.action==='sequence-status'){
   if(!['active','paused','draft'].includes(body.status))throw Error('Choose a valid status.');
   const row=checked(await db.from('routine_admin_sequences').update({status:body.status,revision:crypto.randomUUID(),updated_at:new Date().toISOString()}).eq('id',uuid(body.id)).eq('revision',uuid(body.revision)).select().maybeSingle());if(!row)throw Error('This sequence changed. Refresh before saving.');await audit(user.id,'sequence-'+body.status,{id:row.id});return reply(200,row);
  }
  if(body.action==='enroll'){
   if(body.confirmed!==true)throw Error('Review and confirm the emails first.');const id=uuid(body.id),batch=uuid(body.batch);
   const saved=checked(await db.from('routine_admin_sequences').select().eq('id',id).single());if(saved.status!=='active')throw Error('Activate the sequence before enrolling recipients.');
   const emails=[...new Set(String(body.emails||'').toLowerCase().split(/[\s,;]+/).filter(Boolean))];if(!emails.length||emails.length>50)throw Error('Choose 1–50 opted-in account email addresses.');
   const contacts=checked(await db.from('routine_admin_contacts').select('user_id,consent_email').eq('opted_in',true).in('consent_email',emails));if(contacts.length!==emails.length)throw Error('Every recipient must opt in through Account settings first. No messages were queued.');
   const steps=sequence(saved).steps,now=Date.now();const rows=contacts.flatMap((c:any)=>steps.map((s:any,i:number)=>({batch_id:batch,sequence_id:id,user_id:c.user_id,recipient_email:c.consent_email,position:i,subject:s.subject,body:s.body,due_at:new Date(now+s.day*86400000).toISOString()})));
   checked(await db.from('routine_admin_deliveries').upsert(rows,{onConflict:'batch_id,user_id,position',ignoreDuplicates:true}));await audit(user.id,'sequence-enroll',{id,recipients:contacts.length,batch});return reply(200,{queued:rows.length});
  }
  if(body.action==='cancel-delivery'){checked(await db.from('routine_admin_deliveries').update({status:'cancelled'}).eq('id',uuid(body.id)).eq('status','queued'));await audit(user.id,'cancel-delivery',{id:body.id});return reply(200,{ok:true});}
  if(body.action==='discount-create'){
   const id=uuid(body.id),d=discount(body);const existing=checked(await db.from('routine_admin_discounts').select().eq('id',id).maybeSingle());if(existing)return reply(200,existing);
   const products=[...new Set(await Promise.all(prices.map(async p=>{const price=await stripe.prices.retrieve(p);return String(price.product);})))];
   const coupon=await stripe.coupons.create({name:'Routines '+d.code,duration:'once',...(d.percent_off?{percent_off:d.percent_off}:{amount_off:d.amount_off,currency:'usd'}),max_redemptions:d.max_redemptions,redeem_by:d.expires_at,applies_to:{products},metadata:{app:'routines',request:id}},{idempotencyKey:'routines-coupon-'+id});
   const promo=await stripe.promotionCodes.create({promotion:{type:'coupon',coupon:coupon.id},code:d.code,max_redemptions:d.max_redemptions,expires_at:d.expires_at,metadata:{app:'routines',request:id}},{idempotencyKey:'routines-promo-'+id});
   const row={id,code:d.code,coupon_id:coupon.id,promotion_id:promo.id,percent_off:d.percent_off||null,amount_off:d.amount_off||null,max_redemptions:d.max_redemptions,expires_at:new Date(d.expires_at*1000).toISOString(),active:true};checked(await db.from('routine_admin_discounts').upsert(row));await audit(user.id,'discount-create',{id,code:d.code});return reply(200,row);
  }
  if(body.action==='discount-disable'){
   const row=checked(await db.from('routine_admin_discounts').select().eq('id',uuid(body.id)).single());await stripe.promotionCodes.update(row.promotion_id,{active:false});checked(await db.from('routine_admin_discounts').update({active:false}).eq('id',row.id));await audit(user.id,'discount-disable',{id:row.id});return reply(200,{ok:true});
  }
  if(body.action==='health')return reply(200,await health());
  return reply(400,{error:'Unknown request.'});
 }catch(e){if(e?.type?.startsWith('Stripe'))return reply(400,{error:e.type==='StripePermissionError'?'Stripe needs Coupons and Promotion codes read/write permissions for this action.':'Stripe could not complete this discount. Check that the code is unique and try again.'});return reply(400,{error:/^(Choose |Enter |Add |Use |Set |Each |This |Every |Activate |Review |Could not |Email )/.test(e?.message||'')?e.message:'Unable to complete this request. Refresh and try again.'});}
});
