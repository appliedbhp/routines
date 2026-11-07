export const SITE='https://routines.getadhd.care';
export const PRODUCT='prod_VaSmBoOWRaRTMI';
export function tipAmount(value){
 const text=String(value??'').trim();
 if(!/^\d{1,3}(\.\d{1,2})?$/.test(text))throw Error('Enter an amount from $1 to $500, with up to two decimal places.');
 const cents=Math.round(Number(text)*100);
 if(cents<100||cents>50000)throw Error('Enter an amount from $1 to $500.');
 return cents;
}
export function checkout(body){
 const amount=tipAmount(body.amount);
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.id||''))throw Error('Refresh this page and try again.');
 const metadata={app:'routines_tips',amount:String(amount),requestId:body.id};
 return {params:{mode:'payment',line_items:[{price_data:{currency:'usd',unit_amount:amount,product:PRODUCT},quantity:1}],metadata,payment_intent_data:{metadata},success_url:SITE+'/support/?checkout=returned',cancel_url:SITE+'/support/?checkout=cancelled',integration_identifier:'routines_tips_qmvhtzra',custom_text:{submit:{message:'Optional one-time tip. No subscription or account upgrade. Your free access does not change.'}}},key:'routines-tip-'+body.id};
}
export function tipRecord(session){
 if(session.metadata?.app!=='routines_tips')return null;
 const amount=Number(session.metadata.amount),line=session.line_items?.data;
 if(!session.livemode||session.mode!=='payment'||session.currency!=='usd'||!Number.isInteger(amount)||amount<100||amount>50000||session.amount_total!==amount||line?.length!==1||line[0].quantity!==1||line[0].price?.product!==PRODUCT||line[0].price.unit_amount!==amount)throw Error('Tip payment mismatch');
 const pi=session.payment_intent,charge=typeof pi==='object'?pi?.latest_charge:null;
 const paymentIntent=typeof pi==='string'?pi:pi?.id;
 const status=session.payment_status==='paid'?'paid':session.status==='expired'?'expired':pi?.last_payment_error?'failed':'pending';
 return {session_id:session.id,payment_intent:paymentIntent||null,amount,currency:'usd',status,refunded_amount:typeof charge==='object'&&charge?charge.amount_refunded||0:0,disputed:typeof charge==='object'&&charge?!!charge.disputed:false,created_at:new Date(session.created*1000).toISOString()};
}
