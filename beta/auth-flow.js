// Authentication proves email ownership; beta confirmation alone never unlocks account access.
export function confirmationParts(hash){const p=new URLSearchParams(hash.replace(/^#/,''));return {login:p.get('login')||'',requestId:p.get('request')||'',legacy:p.get('confirm')||''};}
export async function confirmAccess(client,request,{email,code,tokenHash,requestId}={}){
 const credentials=tokenHash?{token_hash:tokenHash,type:'email'}:{email:String(email||'').trim().toLowerCase(),token:String(code||'').trim(),type:'email'};
 if(!tokenHash&&(!credentials.email||!/^\d{6,10}$/.test(credentials.token)))throw Error('Enter your email and the code from the newest email.');
 const {data,error}=await client.auth.verifyOtp(credentials);
 if(error||!data?.session)throw Error('That code or link has expired or was already used. Request a new code and use only the newest email.');
 const result=await request('confirm-account',requestId?{requestId}:{});
 return {...result,email:data.user?.email||data.session.user?.email||credentials.email};
}
export function offerState(plan,offer){
 if(!plan)return {disabled:true,label:'Sign in to purchase'};
 if(plan.lifetimeTier)return {disabled:true,label:'Lifetime plan already purchased'};
 if(offer==='tier2'&&!plan.educatorApproved)return {disabled:true,label:'Educator approval required'};
 if(!plan.checkoutReady)return {disabled:true,label:'Checkout is being prepared'};
 return {disabled:false,label:'Buy '+(offer==='tier2'?'Classroom':'Family')+' · $15 lifetime'};
}
