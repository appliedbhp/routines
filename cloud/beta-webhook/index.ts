import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@23.0.0';
import {payment,readBody} from './model.mjs';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'missing',{apiVersion:'2026-09-30.endive'});
async function rpc(action:string,args:any={}){const {data,error}=await admin.rpc('routine_beta_payment',{action,args});if(error)throw Error('Payment update failed');return data;}
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Use POST',{status:405});let event:any;
 try{const {secret}=await rpc('secret');if(!secret)return new Response('Not configured',{status:503});event=await stripe.webhooks.constructEventAsync(await readBody(req,262144),req.headers.get('stripe-signature')||'',secret,undefined,Stripe.createSubtleCryptoProvider());}catch{return new Response('Invalid signature',{status:400});}
 if(!event.livemode)return new Response('Ignored');
 try{
  const obj=event.data.object;
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&obj.metadata?.app==='routines_beta'&&obj.payment_status==='paid'){
   const {data:order,error}=await admin.from('routine_beta_orders').select().eq('id',obj.metadata.orderId).single();if(error||!order)throw Error('Order unavailable');
   // Retrieve current state: never grant access from a success redirect or an unverified amount.
   const session=await stripe.checkout.sessions.retrieve(obj.id,{expand:['line_items','payment_intent.latest_charge']});
   const result=payment(session,order,session.line_items?.data[0]?.price?.id);if(result){await rpc('paid',result);const charge:any=(session.payment_intent as any)?.latest_charge;if(charge&&(charge.refunded||charge.amount_refunded>0))await rpc('risk',{paymentIntent:result.paymentIntent,refunded:charge.amount_refunded>0,eventTime:event.created});}
  }else if(obj.metadata?.app==='routines_beta'&&event.type==='checkout.session.completed'&&obj.payment_status==='unpaid'){await rpc('processing',{sessionId:obj.id});
  }else if(obj.metadata?.app==='routines_beta'&&event.type==='checkout.session.async_payment_failed'){await rpc('failed',{sessionId:obj.id});
  }else if(['charge.refunded','charge.dispute.created','charge.dispute.closed'].includes(event.type)){
   const charge:any=event.type==='charge.refunded'?await stripe.charges.retrieve(obj.id):await stripe.charges.retrieve(typeof obj.charge==='string'?obj.charge:obj.charge.id);
   if(charge.metadata?.app==='routines_beta')await rpc('risk',{orderId:charge.metadata.orderId,paymentIntent:typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id,refunded:charge.amount_refunded>0,disputed:event.type==='charge.dispute.closed'?obj.status!=='won':!!charge.disputed,eventTime:event.created});
  }
  return new Response('OK');
 }catch{return new Response('Retry payment update',{status:500});}
});
