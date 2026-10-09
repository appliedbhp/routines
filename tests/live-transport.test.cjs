const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('approved ECDH peers exchange encrypted ratings; unapproved peer cannot read them',async()=>{
 const channels=[],timers=[];const createClient=()=>({channel(){const ch={on(e,f,cb){this.receive=cb;return this;},subscribe(cb){cb('SUBSCRIBED');},async send(m){for(const other of channels)if(other!==this)await other.receive({payload:structuredClone(m.payload)});return 'ok';}};channels.push(ch);return ch;},removeChannel(){}});
 let source=fs.readFileSync('self-monitor/live-link.js','utf8').replace("import('https://esm.sh/@supabase/supabase-js@2.57.4')","Promise.resolve({createClient:makeClient})").replace("import('../cloud/config.js')","Promise.resolve({cloudConfig:{url:'test',publishableKey:'public'}})");
 function browser(){const store=new Map();const ctx=vm.createContext({crypto,TextEncoder,TextDecoder,Uint8Array,btoa,atob,Date,Promise,Map,JSON,console,makeClient:createClient,setTimeout:()=>0,clearTimeout(){},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},module:{exports:{}}});vm.runInContext(source,ctx);return ctx.module.exports;}
 const H=browser(),A=browser(),B=browser(),inv=H.invitation(),hostMessages=[],adultMessages=[],strangerMessages=[];
 const host=await H.connect(inv,'child',(m,s,secure)=>hostMessages.push({m,s,secure}),()=>{});inv.publicKey=host.publicKey;
 const adult=await A.connect(inv,'adult',(m,s,secure)=>adultMessages.push({m,s,secure}),()=>{});
 const stranger=await B.connect(inv,'adult',m=>strangerMessages.push(m),()=>{});
 await adult.send({type:'hello',publicKey:adult.publicKey});assert.equal(hostMessages[0].s,adult.sender);
 await host.setPeer(adult.publicKey);await host.sendPrivate({type:'state',points:1});assert.equal(adultMessages[0].m.points,1);assert.equal(adultMessages[0].secure,true);assert.equal(strangerMessages.length,0);
 await adult.sendPrivate({type:'rating',index:0,value:false});assert.equal(hostMessages.at(-1).m.value,false);assert.equal(hostMessages.at(-1).secure,true);
 await stranger.sendPrivate({type:'rating',index:0,value:true});assert.equal(hostMessages.at(-1).m.value,false);
 host.close();adult.close();stranger.close();
});
