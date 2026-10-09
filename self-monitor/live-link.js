/* Temporary, encrypted browser-to-browser messages. No database writes. */
const LiveLink=(()=>{
 const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 const decode=text=>Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 function invitation(now=Date.now()){return {v:1,key:encode(crypto.getRandomValues(new Uint8Array(32))),host:crypto.randomUUID(),expires:now+2*60*60*1000};}
 function parse(raw,now=Date.now()){const parts=typeof raw==='string'?raw.split('.'):[];const v=typeof raw==='string'?(parts[0]==='1'?{v:1,key:parts[1],host:parts[2],expires:parseInt(parts[3],36),publicKey:parts[4]||undefined}:JSON.parse(new TextDecoder().decode(decode(raw)))):raw;if(v?.v!==1||!/^[-\w]{43}$/.test(v.key)||!/^[-\w]{36}$/.test(v.host)||!Number.isFinite(v.expires)||v.expires<=now||v.expires>now+7500000)throw Error('This invitation has expired or is invalid. Ask the child’s device for a new QR code.');return {v:1,key:v.key,host:v.host,expires:v.expires,publicKey:v.publicKey};}
 const pack=v=>['1',v.key,v.host,v.expires.toString(36),v.publicKey||''].join('.');
 async function cipher(inv){return crypto.subtle.importKey('raw',decode(inv.key),'AES-GCM',false,['encrypt','decrypt']);}
 async function seal(key,value){const iv=crypto.getRandomValues(new Uint8Array(12));return {iv:encode(iv),data:encode(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)))))};}
 async function unseal(key,p){if(!p||typeof p.data!=='string'||p.data.length>64000||typeof p.iv!=='string'||p.iv.length!==16)throw Error('Invalid message');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(p.iv)},key,decode(p.data))));}
 async function connect(inv,role,onMessage,onStatus){
  inv=parse(inv);const key=await cipher(inv);
  const idKey='routines.live.identity.'+role+'.'+inv.host;let keys;
  try{const saved=JSON.parse(sessionStorage.getItem(idKey));keys={privateKey:await crypto.subtle.importKey('jwk',saved.privateKey,{name:'ECDH',namedCurve:'P-256'},true,['deriveKey']),publicKey:await crypto.subtle.importKey('jwk',saved.publicKey,{name:'ECDH',namedCurve:'P-256'},true,[])};}catch{keys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey']);try{sessionStorage.setItem(idKey,JSON.stringify({privateKey:await crypto.subtle.exportKey('jwk',keys.privateKey),publicKey:await crypto.subtle.exportKey('jwk',keys.publicKey)}));}catch{}}
  const publicKey=encode(new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey)));
  const fingerprint=async pub=>encode(new Uint8Array(await crypto.subtle.digest('SHA-256',decode(pub))));
  const sender=role==='child'?inv.host:await fingerprint(publicKey);let peerKey=null;
  async function setPeer(pub){if(typeof pub!=='string'||pub.length!==87)throw Error('Invalid pairing key');const peer=await crypto.subtle.importKey('raw',decode(pub),{name:'ECDH',namedCurve:'P-256'},false,[]);peerKey=await crypto.subtle.deriveKey({name:'ECDH',public:peer},keys.privateKey,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
  if(role==='adult')await setPeer(inv.publicKey);
  const digest=await crypto.subtle.digest('SHA-256',decode(inv.key));const topic='routine-live-'+encode(new Uint8Array(digest));
  const [{createClient},{cloudConfig}]=await Promise.all([import('https://esm.sh/@supabase/supabase-js@2.57.4'),import('../cloud/config.js')]);
  let open=false,closed=false,counter=0,lastRecovery=0,retryTimer=null,rebuilding=false,channelGeneration=0,channel;const seen=new Map();
  const client=createClient(cloudConfig.url,cloudConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{worker:typeof Worker!=='undefined',heartbeatCallback:status=>{console.debug('Self-monitor heartbeat:',status);if(status==='disconnected')recover();}}});
  function recover(){if(closed||Date.now()>=inv.expires||Date.now()-lastRecovery<1000)return;lastRecovery=Date.now();if(!open&&channel)rebuild();else client.realtime.connect();}
  const visible=()=>{if(typeof document==='undefined'||document.visibilityState==='visible')recover();};
  globalThis.addEventListener?.('online',recover);globalThis.addEventListener?.('focus',visible);globalThis.document?.addEventListener('visibilitychange',visible);

  function subscribe(){const generation=++channelGeneration;channel=client.channel(topic,{config:{broadcast:{ack:true,self:false}}});
  channel.on('broadcast',{event:'sealed'},async({payload})=>{try{if(closed||generation!==channelGeneration||Date.now()>=inv.expires)return;const m=await unseal(key,payload);if(m.sender===sender||!['child','adult'].includes(m.role)||m.role===role||typeof m.sender!=='string'||m.sender.length>50||!Number.isSafeInteger(m.seq)||m.seq<=(seen.get(m.sender)||0)||m.role==='child'&&m.sender!==inv.host)return;if(m.secure){if(!peerKey)return;const inner=await unseal(peerKey,m.body);if(inner.seq!==m.seq||inner.sender!==m.sender||inner.role!==m.role)return;seen.set(m.sender,m.seq);onMessage(inner.body,m.sender,true);}else if(role==='child'&&m.body?.type==='hello'&&await fingerprint(m.body.publicKey)===m.sender){if(seen.size>=32&&!seen.has(m.sender))return;seen.set(m.sender,m.seq);onMessage(m.body,m.sender,false);}}catch{/* Ignore unauthenticated or malformed packets. */}});
  channel.subscribe(status=>{console.debug('Self-monitor channel:',status);if(closed||generation!==channelGeneration)return;open=status==='SUBSCRIBED';onStatus(open?'connected':'connecting');if(open){clearTimeout(retryTimer);retryTimer=null;}else if(!retryTimer)retryTimer=setTimeout(()=>{retryTimer=null;rebuild();},3000);});
  }
  async function rebuild(){if(closed||rebuilding||Date.now()>=inv.expires)return;rebuilding=true;open=false;channelGeneration++;try{await client.removeChannel(channel);await new Promise(resolve=>setTimeout(resolve,150));if(!closed&&Date.now()<inv.expires)subscribe();}catch{if(!closed&&!retryTimer)retryTimer=setTimeout(()=>{retryTimer=null;rebuild();},3000);}finally{rebuilding=false;}}
  subscribe();
  const expiry=setTimeout(()=>{close();onStatus('expired');},Math.max(0,inv.expires-Date.now()));
  async function send(body,secure=false){if(closed||!open||Date.now()>=inv.expires)return false;const seq=Date.now()*1000+(counter++%1000);if(secure){if(!peerKey)return false;body=await seal(peerKey,{role,sender,seq,body});}const payload=await seal(key,{role,sender,secure,seq,body});return await channel.send({type:'broadcast',event:'sealed',payload})==='ok';}
  function close(){closed=true;open=false;clearTimeout(expiry);clearTimeout(retryTimer);globalThis.removeEventListener?.('online',recover);globalThis.removeEventListener?.('focus',visible);globalThis.document?.removeEventListener('visibilitychange',visible);client.removeChannel(channel);}
  return {send,sendPrivate:body=>send(body,true),setPeer,publicKey,close,sender,recover,isConnected:()=>open&&!closed&&Date.now()<inv.expires};
 }
 return {invitation,parse,pack,cipher,seal,unseal,connect};
})();
if(typeof module!=='undefined')module.exports=LiveLink;
