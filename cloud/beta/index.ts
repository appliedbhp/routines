import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@23.0.0';
import {SITE,PRICES,signup,bug,readBody,email} from './model.mjs';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const stripe=new Stripe(Deno.env.get('ROUTINES_API_KEY')||Deno.env.get('STRIPE_SECRET_KEY')||'missing',{apiVersion:'2026-09-30.endive',stripeContext:'acct_1UIYQeIiI1uuEHpt'});
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const token=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
async function rpc(caller:string|null,action:string,args:any={}){const {data,error}=await admin.rpc('routine_beta_action',{caller,action,args});if(error)throw Error(error.message);return data;}
async function limit(bucket:string,max:number,seconds=3600){if(!(await rpc(null,'limit',{bucket,max,seconds})).allowed)throw Error('Please wait before trying again.');}
async function mail(to:string,subject:string,text:string,id:string){const key=Deno.env.get('RESEND_API_KEY');if(!key)throw Error('Email is temporarily unavailable.');const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:'Routines by ABHP <noreply@auth.getadhd.care>',to:[to],subject,text})});if(!r.ok)throw Error('Email could not be delivered. Please try again later.');}
async function sendAccessEmail(address:string,requestId?:string){
 const {data,error}=await admin.auth.admin.generateLink({type:'magiclink',email:address,options:{redirectTo:SITE+'/beta/',data:{routines_account:true}}});
 if(error||!data.properties?.hashed_token||!data.properties?.email_otp)throw Error('Email sign-in could not be prepared. Please try again.');
 const query=new URLSearchParams({login:data.properties.hashed_token});if(requestId)query.set('request',requestId);
 await mail(address,'Your Routines sign-in code and confirmation link',`Use this one-time code to confirm your email and sign in:\n\n${data.properties.email_otp}\n\nEnter it at ${SITE}/beta/ using this email address. Or open this link on the device where you want to use Routines:\n\n${SITE}/beta/#${query}\n\nUse the code OR the link, not both. Only the newest email works. If it expires, request a fresh code on the beta page. Never share this code or link. No payment is made by signing in. If you did not request this email, ignore it.`, 'routines-access-'+crypto.randomUUID());
}
async function inviteFriends(result:any){let failed=0;
 for(const friend of result.friends||[]){try{await limit('invite-email:'+await digest(friend),3,86400);await mail(friend,'You’re invited to try Routines',`A friend invited you to Routines by Applied Behavioral Health Practice: practical tools for planning, learning, and everyday routines.\n\nJoin the beta before December 1, 2026 (Pacific Time) for two free months of Family or Classroom access (educator approval required for Classroom). No payment required.\n\n${SITE}/beta/?ref=${result.referralCode}\n\nIf you join through this link, your friend earns an extra free month. If this invitation isn’t for you, simply ignore it; you have not been subscribed to a mailing list.`, 'beta-friend-'+result.referralCode+'-'+await digest(friend));}catch{failed++;}}
 return failed;
}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};if(origin===SITE)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const reply=(status:number,data:any)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&origin!==SITE)return reply(403,{error:'Origin not allowed.'});if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 try{
  const body=JSON.parse(await readBody(req));const action=body.action;
  const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'');let user:any=null;
  if(bearer){const r=await admin.auth.getUser(bearer);if(!r.error&&!r.data.user?.is_anonymous&&r.data.user?.email_confirmed_at)user=r.data.user;}
  const ip=await digest((req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown')+(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''));
  if(action==='health'){
   if(!(Deno.env.get('ROUTINES_API_KEY')||Deno.env.get('STRIPE_SECRET_KEY')))return reply(503,{ready:false,emailConfigured:!!Deno.env.get('RESEND_API_KEY'),reason:'Payment connection is not configured.'});
   await limit('health:'+ip,10);
   const paymentKey=Deno.env.get('ROUTINES_API_KEY')||Deno.env.get('STRIPE_SECRET_KEY')||'';
   if(paymentKey.startsWith('pk_'))return reply(503,{ready:false,reason:'This is a publishable key. Checkout needs a restricted or secret server key.'});
   if(/^(rk|sk)_test_/.test(paymentKey))return reply(503,{ready:false,reason:'This is a test-mode key. The configured offers belong to the live Stripe account.'});
   try{const prices=await Promise.all(Object.values(PRICES).map(id=>stripe.prices.retrieve(id)));
   const ready=prices.every((p,i)=>p.active&&p.livemode&&p.currency==='usd'&&p.unit_amount===1500)&&!!Deno.env.get('RESEND_API_KEY');
   return reply(ready?200:503,{ready,reason:ready?undefined:'Check the configured prices and email connection.'});
   }catch(e){return reply(503,{ready:false,reason:e?.type==='StripeAuthenticationError'?'Stripe did not accept this key.':String(e?.message||'Stripe connection could not be verified.').replaceAll(paymentKey,'[redacted]').replace(/(['"]).*?\1/g,'[redacted]').replace(/\b(?:sk|rk|pk|whsec)_[^\s]+/g,'[redacted]').slice(0,400),code:typeof e?.code==='string'&&/^[a-z_]+$/.test(e.code)?e.code:undefined,param:typeof e?.param==='string'&&/^[a-z_]+$/.test(e.param)?e.param:undefined,category:['StripeAuthenticationError','StripePermissionError','StripeConnectionError','StripeInvalidRequestError'].includes(e?.type)?e.type:'other'});}
  }
  if(action==='signup'){
   const data=signup(body);await limit('signup-ip:'+ip,6);await limit('signup-email:'+await digest(data.email),3);await limit('signup-global',300);
   const secret=token();const result=await rpc(null,'request',{...data,hash:await digest(secret)});
   await sendAccessEmail(data.email,result.id);
   return reply(200,{requestId:result.id,message:'Check your email. Open the confirmation link or enter the code below to confirm and sign in.'});
  }
  if(action==='signin'){
   const address=email(body.email);await limit('access-ip:'+ip,6);await limit('access-email:'+await digest(address),3);await limit('access-global',300);
   await sendAccessEmail(address);
   return reply(200,{message:'Check your email for a sign-in code and link. Use only the newest email.'});
  }
  if(action==='verify'){
   await limit('verify:'+ip,30);if(!/^[a-f0-9]{64}$/.test(body.token||''))throw Error('Invalid confirmation link.');
   const result=await rpc(null,'verify',{hash:await digest(body.token),referralCode:token().slice(0,24)});
   return reply(200,{alreadyMember:!!result.alreadyMember,email:result.email,failedInvites:await inviteFriends(result)});
  }
  if(action==='bug'){await limit('bug:'+ip,8);return reply(200,await rpc(user?.id||null,'bug',bug(body)));}
  if(!user)return reply(401,{error:'Sign in with a confirmed email first.'});
  if(action==='confirm-account'){
   await limit('confirm-account:'+user.id,20);
   if(body.requestId&&!/^[a-f0-9-]{36}$/i.test(body.requestId))throw Error('Choose a valid confirmation request.');
   const {data:result,error}=await admin.rpc('routine_confirm_beta_account',{caller:user.id,request_id:body.requestId||null,referral_code:token().slice(0,24)});if(error)throw Error(error.message);
   return reply(200,{alreadyMember:!!result.alreadyMember,noPendingSignup:!!result.noPendingSignup,failedInvites:await inviteFriends(result)});
  }
  if(['state','bugs','bug-update'].includes(action))return reply(200,await rpc(user.id,action,body));
  if(action==='checkout'){
   await limit('checkout:'+user.id,12);
   const order=await rpc(user.id,'checkout',{offer:body.offer});if(order.url)return reply(200,{url:order.url});
   const metadata={app:'routines_beta',orderId:order.id,userId:user.id};
   const session=await stripe.checkout.sessions.create({mode:'payment',allow_promotion_codes:true,line_items:[{price:order.price_id||PRICES[order.offer],quantity:1}],customer_email:user.email,client_reference_id:user.id,metadata,payment_intent_data:{metadata},success_url:SITE+'/beta/?checkout=success',cancel_url:SITE+'/beta/?checkout=cancelled',expires_at:Math.floor(Date.now()/1000)+1800,integration_identifier:'routines_beta_bhfpmqaz',custom_text:{submit:{message:'One-time payment. Lifetime means the lifetime of the Routines service. No recurring charges.'}}},{idempotencyKey:'routines-beta-'+order.id});
   await rpc(user.id,'attach',{orderId:order.id,sessionId:session.id,url:session.url});return reply(200,{url:session.url});
  }
  return reply(400,{error:'Unknown request.'});
 }catch(error){const message=error instanceof Error?error.message:'';const safe=!(error&&typeof error==='object'&&'type' in error)&&/^(Enter |Invite |Please |Confirm |Describe |Invalid confirmation link\.|Invalid page\.|This |These |Choose |Use your |The \$15|You already|Sign in|Beta enrollment|Checkout is|Classroom requires|Email |Administrator|Your )/.test(message);return reply(400,{error:safe?message:'Unable to complete this request. Please try again.'});}
});
