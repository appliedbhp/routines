const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const V=require('../values-blaster/values.js');
test('values reject arbitrary text and deduplicate catalogue entries',()=>{assert.deepEqual(V.normalize(['Kindness','<script>','Kindness','Family']),['Kindness','Family']);assert.deepEqual(V.normalize(null),[]);});
test('every random polygon edge encloses the full text safe circle',()=>{for(let n=0;n<1000;n++){const shape=V.polygon(20+Math.random()*230);assert.ok(shape.points.length>=7&&shape.points.length<=10);for(let i=0;i<shape.points.length;i++){const a=shape.points[i],b=shape.points[(i+1)%shape.points.length],distance=Math.abs(a.x*b.y-a.y*b.x)/Math.hypot(b.x-a.x,b.y-a.y);assert.ok(distance>=shape.safe,`${distance} < ${shape.safe}`);}}});
test('account values save as metadata, survive reload, clear on sign-out, and never create a board',async()=>{
 let user={id:'a',user_metadata:{routines_age_group:'adult',routines_values:['Kindness']}},fail=false,saved;const callbacks=[],events=[];
 const client={auth:{getUser:async()=>({data:{user}}),onAuthStateChange:cb=>callbacks.push(cb),updateUser:async({data})=>{if(fail)return {error:Error('offline')};saved=data;user={...user,user_metadata:{...user.user_metadata,...data}};return {data:{user}};}}};
 const source=fs.readFileSync('cloud/values.js','utf8').replace(/^import .*;$/gm,'').replace("await import('../planning/account-values.js');",'');
 const c=vm.createContext({accountClient:async()=>client,ValuesBlaster:V,dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},addEventListener(){},setTimeout:fn=>fn()});
 await vm.runInContext('(async()=>{'+source+'})()',c);assert.deepEqual(Array.from(c.RoutineValues.read().values),['Kindness']);
 await c.RoutineValues.save(['Family','Curiosity']);assert.deepEqual(Array.from(saved.routines_values),['Family','Curiosity']);assert.equal(user.user_metadata.routines_age_group,'adult');
 await c.RoutineValues.refresh();assert.deepEqual(Array.from(c.RoutineValues.read().values),['Family','Curiosity']);
 fail=true;await assert.rejects(c.RoutineValues.save(['Peace']),/Could not save/);assert.deepEqual(Array.from(c.RoutineValues.read().values),['Family','Curiosity']);fail=false;
 await assert.rejects(c.RoutineValues.save(['unapproved free text']),/Choose values/);
 await c.RoutineValues.save([]);assert.equal(c.RoutineValues.read().values.length,0);
 user=null;callbacks[0]();await new Promise(setImmediate);assert.equal(c.RoutineValues.read().signedIn,false);assert.equal(c.RoutineValues.read().values.length,0);await assert.rejects(c.RoutineValues.save(['Peace']),/Sign in/);
 user={id:'b',user_metadata:{routines_values:['Balance']}};await c.RoutineValues.refresh();assert.deepEqual(Array.from(c.RoutineValues.read().values),['Balance']);
 assert.doesNotMatch(source,/\.from\(|\.rpc\(/);
});
