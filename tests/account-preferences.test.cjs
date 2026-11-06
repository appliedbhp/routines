const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('account age onboarding persists preference and restores it on sign-in',async()=>{
 const nodes=[],listeners={},callbacks=[];let saved,local={age:'all'},user={id:'test',user_metadata:{}};
 const element=tag=>{const n={tag,append(){},setAttribute(){},addEventListener(name,fn){this[name]=fn},showModal(){this.open=true},close(){this.open=false}};nodes.push(n);return n;};
 const client={auth:{getSession:async()=>({data:{session:{user}}}),updateUser:async({data})=>{saved=data;user={...user,user_metadata:data};return {data:{user}};},onAuthStateChange:fn=>callbacks.push(fn)}};
 const context=vm.createContext({accountClient:async()=>client,RoutineAudience:{profiles:{all:{label:'All'},adult:{label:'Adult'}},read:()=>local,save:v=>local=v},document:{createElement:element,body:{append(){}},querySelector:()=>nodes.find(n=>n.open),addEventListener:(name,fn)=>listeners[name]=fn},Option:class{},setTimeout:fn=>fn()});
 const source=fs.readFileSync('cloud/preferences.js','utf8').replace("import {accountClient} from './client.js';",'');await vm.runInContext('(async()=>{'+source+'})()',context);
 const dialog=nodes.find(n=>n.tag==='dialog');assert.equal(dialog.open,true);
 await context.RoutineAccountPreferences.saveAge('adult');assert.equal(saved.routines_age_group,'adult');assert.equal(local.age,'adult');
 local={age:'all'};callbacks[0]();await new Promise(setImmediate);assert.equal(local.age,'adult');assert.equal(dialog.open,false);
});
