const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const V=require('../values-blaster/values.js');
test('values reject arbitrary text and deduplicate catalogue entries',()=>{assert.deepEqual(V.normalize(['Kindness','<script>','Kindness','Family']),['Kindness','Family']);assert.deepEqual(V.normalize(null),[]);});
test('every random polygon edge encloses the full text safe circle',()=>{for(let n=0;n<1000;n++){const shape=V.polygon(20+Math.random()*230);assert.ok(shape.points.length>=7&&shape.points.length<=10);for(let i=0;i<shape.points.length;i++){const a=shape.points[i],b=shape.points[(i+1)%shape.points.length],distance=Math.abs(a.x*b.y-a.y*b.x)/Math.hypot(b.x-a.x,b.y-a.y);assert.ok(distance>=shape.safe,`${distance} < ${shape.safe}`);}}});
test('cloud values use separate allowances, survive reload, and clear on sign-out',async()=>{
 let user={id:'a'},fail=false;const saved={a:['Kindness'],b:['Balance']},callbacks=[],calls=[];
 const client={auth:{getUser:async()=>({data:{user}}),onAuthStateChange:cb=>callbacks.push(cb)}};
 async function request(action,args){calls.push(action);if(!user)throw Error('Sign in');if(fail)throw Error('Could not save');if(action==='resources')return {values:saved[user.id],plan:{valueLimit:2}};if(action==='values-save'){if(args.values.length>2)throw Error('Your plan allows 2 values');saved[user.id]=Array.from(args.values);return {}; }throw Error('Unexpected action');}
 const source=fs.readFileSync('cloud/values.js','utf8').replace(/^import .*;$/gm,'').replace(/^await import.*;$/gm,'');
 const c=vm.createContext({accountClient:async()=>client,request,ValuesBlaster:V,dispatchEvent(){},CustomEvent:class{},addEventListener(){},setTimeout:fn=>fn()});
 await vm.runInContext('(async()=>{'+source+'})()',c);assert.deepEqual(Array.from(c.RoutineValues.read().values),['Kindness']);assert.equal(c.RoutineValues.read().limit,2);
 await c.RoutineValues.save(['Family','Curiosity']);assert.deepEqual(saved.a,['Family','Curiosity']);await c.RoutineValues.refresh();assert.deepEqual(Array.from(c.RoutineValues.read().values),saved.a);
 await assert.rejects(c.RoutineValues.save(['Family','Curiosity','Peace']),/allows 2/);assert.deepEqual(saved.a,['Family','Curiosity']);
 fail=true;await assert.rejects(c.RoutineValues.save(['Peace']),/Could not save/);assert.deepEqual(Array.from(c.RoutineValues.read().values),saved.a);fail=false;
 await assert.rejects(c.RoutineValues.save(['unapproved free text']),/Choose values/);await c.RoutineValues.save([]);assert.equal(c.RoutineValues.read().values.length,0);
 user=null;callbacks[0]();await new Promise(setImmediate);assert.equal(c.RoutineValues.read().signedIn,false);assert.equal(c.RoutineValues.read().values.length,0);await assert.rejects(c.RoutineValues.save(['Peace']),/Sign in/);
 user={id:'b'};await c.RoutineValues.refresh();assert.deepEqual(Array.from(c.RoutineValues.read().values),['Balance']);assert.ok(calls.every(a=>['resources','values-save'].includes(a)));
});
