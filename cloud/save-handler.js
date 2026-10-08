/* Pure request handling, shared with tests. Authentication and persistence are injected. */
(function(root){
 function createHandler({settings,authenticate,insert,replace,allowedOrigins}){
  return async req=>{
   const origin=req.headers.get('Origin')||'';
   const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
   if(allowedOrigins.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'});
   const reply=(status,message)=>new Response(JSON.stringify(message),{status,headers});
   if(origin&&!allowedOrigins.includes(origin))return reply(403,{error:'Origin not allowed.'});
   if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(req.method!=='POST')return reply(405,{error:'Use POST.'});
   try{
    const user=await authenticate(req.headers.get('Authorization')||'');
    if(!user||user.is_anonymous||!user.email_confirmed_at)return reply(401,{error:'Sign in with a verified email first.'});
    // Bounded streaming read: Content-Length alone is not trustworthy.
    const reader=req.body?.getReader();if(!reader)return reply(400,{error:'Missing board.'});
    let size=0,raw='',decoder=new TextDecoder();
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072){await reader.cancel();return reply(413,{error:'Board too large.'});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
    const body=JSON.parse(raw);
    if(body.attested!==true||body.attestationVersion!==settings.VERSION)return reply(400,{error:'Confirm the privacy statement before every save.'});
    if(![1,2].includes(body.slot))return reply(400,{error:'Free accounts have two board slots.'});
    const payload=settings.clean(body.payload);
    if(body.revision!==null&&!(typeof body.revision==='string'&&/^[0-9a-f-]{36}$/i.test(body.revision)))return reply(400,{error:'Refresh your cloud boards and try again.'});
    const row={user_id:user.id,slot:body.slot,payload,attestation_version:settings.VERSION,attested_at:new Date().toISOString(),updated_at:new Date().toISOString(),revision:crypto.randomUUID()};
    const result=body.revision===null?await insert(row):await replace(row,body.revision);
    if(!result)return reply(409,{error:'This slot changed on another device. Refresh and review before saving again.'});
    return reply(200,{board:result});
   }catch(error){
    // Do not log request bodies or return database internals.
    if(error instanceof SyntaxError)return reply(400,{error:'Invalid board.'});
    return reply(400,{error:'Could not save this board. Check its settings and try again.'});
   }
  };
 }
 if(typeof module!=='undefined')module.exports={createHandler};else root.CloudBoardHandler={createHandler};
})(globalThis);
