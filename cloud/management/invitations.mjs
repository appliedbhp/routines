import {SITE,MAIL_ADDRESS,uuid} from './model.mjs';
export const BETA_CLOSE=Date.parse('2026-12-01T08:00:00Z');
export function invitation(body,now=Date.now()){
 if(!['beta','free'].includes(body.kind))throw Error('Choose Beta or Free.');
 const emails=[...new Set(String(body.emails||'').trim().toLowerCase().split(/[\s,;]+/).filter(Boolean))].sort();
 if(!emails.length||emails.length>50)throw Error('Enter 1–50 email addresses.');
 if(emails.some(e=>e.length>254||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(e)))throw Error('Enter valid email addresses only, separated by commas, spaces, or new lines.');
 if(body.kind==='beta'&&now>=BETA_CLOSE)throw Error('Choose Free: beta enrollment closed December 1, 2026.');
 const url=SITE+(body.kind==='beta'?'/beta/':'/account/');
 const subject=body.kind==='beta'?'You’re invited to the Routines beta':'You’re invited to Routines';
 const text='You’re invited to try Routines by Applied Behavioral Health Practice: tools for planning, learning, and everyday routines.\n\n'+(body.kind==='beta'?'Join before December 1, 2026 (Pacific Time) for two free months of Family or Classroom access. Classroom requires educator approval. No payment is required; you can continue on the regular Free plan when the trial ends.':'Create a free account to save boards to the cloud and use Routines across devices. Saving and storing files on your own computer is always free.')+'\n\n'+(body.kind==='beta'?'Join the beta: ':'Create your free account: ')+url+'\n\nOpen the link, enter your email, and follow the confirmation instructions. This invitation does not create an account or sign you up for an email sequence. If it isn’t for you, you can ignore it.\n\nRoutines by Applied Behavioral Health Practice\n'+MAIL_ADDRESS;
 return {kind:body.kind,emails,url,subject,text};
}
// Authentication is enforced by the management endpoint before entering this service.
// Immutable batches + provider idempotency make retries safe after interrupted responses.
export async function sendInvitationBatch(body,actor,{store,apiKey,fetcher=fetch,now=Date.now()}){
 if(body.confirmed!==true)throw Error('Review the invitation before sending.');
 const id=uuid(body.id),value=invitation(body,now);
 if(!apiKey)throw Error('Email delivery is not configured.');
 let row=await store.get(id);
 if(!row){await store.create({id,created_by:actor,kind:value.kind,recipients:value.emails,subject:value.subject,body:value.text,status:'pending',created_at:new Date(now).toISOString()});row=await store.get(id);}
 if(!row||row.created_by!==actor||row.kind!==value.kind||JSON.stringify(row.recipients)!==JSON.stringify(value.emails))throw Error('This invitation batch changed. Review a new batch.');
 if(row.status==='accepted')return {id,accepted:row.recipients.length,replayed:true};
 // Resend retains idempotency keys for 24 hours; do not retry an uncertain older batch.
 if(now-Date.parse(row.created_at)>=23*3600000)throw Error('This batch is too old to retry safely. Check its delivery in Resend before creating a new invitation.');
 const messages=row.recipients.map(email=>({from:'Routines by ABHP <noreply@auth.getadhd.care>',to:[email],subject:row.subject,text:row.body}));
 try{
  const response=await fetcher('https://api.resend.com/emails/batch',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'routines-invitations-'+id},body:JSON.stringify(messages),signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok||!Array.isArray(result.data)||result.data.length!==messages.length||result.data.some(r=>!r.id))throw Error('Email provider did not confirm the complete batch.');
  await store.update(id,{status:'accepted',provider_ids:result.data.map(r=>r.id),accepted_at:new Date(now).toISOString(),error:null});
  return {id,accepted:messages.length};
 }catch{
  await store.update(id,{status:'uncertain',error:'Delivery not confirmed. Retry this same batch within 23 hours, or check Resend before creating a new batch.'});
  throw Error('Email delivery is not confirmed. Retry this same batch; do not create a new one yet.');
 }
}
