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

test('Explore has a home and school example for each value',()=>{
 assert.deepEqual(Object.keys(V.examples).sort(),[...V.values].sort());
 for(const example of Object.values(V.examples)){
  assert.equal(example.length,3);
  assert.ok(example.every(text=>typeof text==='string'&&text.trim()));
 }
});

test('Explore waits for a choice and shooting an ad does not sort a value',async()=>{
 const {safeImage,safeUrl}=await import('../js/ads-model.mjs');
 const nodes=new Map(),events={};
 function element(){
  const handlers={};
  return {classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(name,fn){handlers[name]=fn;},
   append(){},appendChild(){},replaceChildren(){},insertBefore(){},focus(){},
   showModal(){this.open=true;},close(){this.open=false;handlers.close?.();},
   getContext(){return {scale(){},measureText(){return {width:40};}}}};
 }
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element,addEventListener(){}};
 const parent={postMessage(){}}, location={origin:'https://example.test'};
 const window={innerWidth:1000,innerHeight:700,devicePixelRatio:1,addEventListener(){}};
 const context=vm.createContext({document,window,parent,location,ValuesBlaster:V,Image:class{},safeImage,safeUrl,card:ad=>({ad}),addEventListener:(name,fn)=>events[name]=fn,performance:{now:()=>1000}});
 const source=fs.readFileSync('values-blaster/game.js','utf8').replace(/^import .*;$/m,'');
 vm.runInContext(source,context);
 const run=code=>vm.runInContext(code,context);
 run(`startNewGame();
 const target=new DynamicValueAsteroid('Kindness',300,300);
 asteroids=[target];
 lasers=[{x:300,y:300,type:'EXPLORE',update(){}}];
 update();`);
 assert.equal(nodes.get('valueDialog').open,true);
 assert.match(nodes.get('valueHome').textContent,/glass of water/);
 assert.match(nodes.get('valueSchool').textContent,/join your game/);
 assert.equal(run('collectedValues.length + releasedValues.length'),0);
 nodes.get('exploreCollect').onclick();
 assert.deepEqual(Array.from(run('collectedValues')),['Kindness']);
 assert.equal(nodes.get('valueDialog').open,false);
 events.message({origin:location.origin,source:parent,data:{type:'values-blaster-ads',ads:[
  {id:'test',image:'https://example.test/ad.png',url:'https://example.test/product'}
 ]}});
 run(`nextAdAt=1;
 spawnAd();
 const adTarget=asteroids.find(asteroid=>asteroid.adId);
 lasers=[{x:adTarget.x,y:adTarget.y,type:'EXPLORE',update(){}}];
 update();`);
 assert.equal(nodes.get('adDialog').open,true);
 assert.equal(run('collectedValues.length + releasedValues.length'),1);
 events.message({origin:location.origin,source:parent,data:{type:'values-blaster-ads',ads:[]}});
 assert.equal(nodes.get('adDialog').open,false);
 assert.equal(run('gameAds.length'),0);
});
