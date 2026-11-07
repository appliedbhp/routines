const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const modulePromise=import(require('node:url').pathToFileURL(require('node:path').resolve('cloud/visual-library/handler.js')).href);
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jk1cAAAAASUVORK5CYII=';
const categories=[{id:'communication',name:'Communication'}],ages=[{id:'0-5',min_age:0,max_age:5},{id:'6-11',min_age:6,max_age:11},{id:'12-18',min_age:12,max_age:18}];
const input={action:'publish',id:'f0086d47-e069-44c4-b515-44a83b8d0815',title:'I need help',category:'communication',age_strand:'6-11',style:'simple-symbol',keywords:'help, communication',alt_text:'A figure raises a hand.',generation_prompt:'An original figure raises a hand.',source:'Original artwork',usage_rights:'Owned by the library creator',reviewed:true,rights_confirmed:true,ready:false,image:png};

function githubMock(conflict=false){
 let catalog=[],head='base',tree=null,failed=false,calls=0;
 const json=value=>new Response(JSON.stringify(value),{status:200});
 return {tree:()=>tree,catalog:()=>catalog,calls:()=>calls,async fetch(url,options={}){
  calls++;const path=new URL(url).pathname.split('/visual-supports')[1],body=options.body?JSON.parse(options.body):null;
  if(path==='/git/ref/heads/main')return json({object:{sha:head}});
  if(path.startsWith('/contents/')){
   const file=path.slice('/contents/'.length),value={'catalog/categories.json':categories,'catalog/age-strands.json':ages,'catalog/visuals.json':catalog}[file];
   return json({content:Buffer.from(JSON.stringify(value),'utf8').toString('base64')});
  }
  if(path==='/git/blobs')return json({sha:'image'});
  if(path.startsWith('/git/commits/'))return json({tree:{sha:'base-tree'}});
  if(path==='/git/trees'){tree=body.tree;return json({sha:'tree'});}
  if(path==='/git/commits')return json({sha:'commit'});
  if(path==='/git/refs/heads/main'){
   if(conflict&&!failed){failed=true;head='changed';catalog.push({id:'another-editor'});return new Response('{}',{status:422});}
   catalog=JSON.parse(tree.find(row=>row.path==='catalog/visuals.json').content);head='commit';return json({});
  }
  throw Error('Unexpected GitHub action '+path);
 }};
}
const request=body=>new Request('https://test.example',{method:'POST',body:JSON.stringify(body),headers:{authorization:'Bearer test','content-type':'application/json'}});

test('non-administrators cannot access keys, catalog, generation or publishing',async()=>{
 const {createVisualHandler}=await modulePromise,mock=githubMock();
 const handle=createVisualHandler({authenticate:async()=>false,fetch:mock.fetch,githubToken:'secret'});
 const response=await handle(request(input));
 assert.equal(response.status,403);assert.equal(mock.calls(),0);
});
test('publishing is atomic, rebases a concurrent catalog change, and safely retries',async()=>{
 const {createVisualHandler}=await modulePromise,mock=githubMock(true);
 const handle=createVisualHandler({authenticate:async()=>true,fetch:mock.fetch,githubToken:'secret'});
 const first=await handle(request(input));assert.equal(first.status,200);
 assert.equal(mock.catalog().length,2);assert.equal(mock.catalog()[0].id,'another-editor');
 const saved=mock.catalog()[1];assert.equal(saved.status,'draft');assert.equal(saved.generation_prompt,input.generation_prompt);
 const repeated=await handle(request(input));assert.equal((await repeated.json()).already_saved,true);assert.equal(mock.catalog().length,2);
 const modified=await handle(request({...input,title:'Different'}));assert.equal(modified.status,409);
});
test('review, rights and category are validated before a write',async()=>{
 const {validateRecord}=await modulePromise;
 assert.throws(()=>validateRecord({...input,reviewed:false},categories,ages));
 assert.throws(()=>validateRecord({...input,rights_confirmed:false},categories,ages));
 assert.throws(()=>validateRecord({...input,category:'../../invalid'},categories,ages));
 assert.equal(validateRecord({...input,ready:true},categories,ages).status,'ready');
});

test('generation attaches the exact reference image and records the reference settings',async()=>{
 const {createVisualHandler,validateRecord}=await modulePromise;
 const {characterReference,characterImageBase64}=await import(require('node:url').pathToFileURL(require('node:path').resolve('cloud/visual-library/character.js')).href);
 let called=false;
 const handle=createVisualHandler({authenticate:async()=>true,openaiKey:'test-secret',fetch:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/images/edits');
  assert.ok(options.body instanceof FormData);
  assert.match(options.body.get('prompt'),/mouth variant02, eyes variant24, and eyebrows variant10/);
  assert.equal(options.body.get('background'),'transparent');
  const image=options.body.get('image[]');
  assert.equal(Buffer.from(await image.arrayBuffer()).toString('base64'),characterImageBase64);
  called=true;return new Response(JSON.stringify({data:[{b64_json:png}]}));
 }});
 const response=await handle(request({action:'generate',prompt:'Wash hands for ages 6–11.'}));
 const data=await response.json();
 assert.equal(response.status,200);assert.equal(called,true);
 assert.equal(data.reference_id,characterReference.id);
 const saved=validateRecord({...input,reference_id:data.reference_id},categories,ages);
 assert.equal(saved.character_reference.options.skinColor,'ffffff');
 assert.equal(saved.character_reference.options.hairProbability,'0');
 assert.match(saved.usage_rights,/Lisa Wischofsky/);
});

test('six age and face previews publish in one atomic batch and replay safely',async()=>{
 const {createVisualHandler}=await modulePromise,mock=githubMock();
 const visuals=ages.flatMap((age,index)=>['default','blank'].map((face,offset)=>({...input,id:'f0086d47-e069-44c4-b515-44a83b8d081'+(index*2+offset),age_strand:age.id,face_variant:face,reference_id:'dicebear-adventurer-'+(face==='blank'?'blank':'default')+'-v1'})));
 const handle=createVisualHandler({authenticate:async()=>true,fetch:mock.fetch,githubToken:'secret'});
 const response=await handle(request({action:'publish_batch',visuals}));
 assert.equal(response.status,200);assert.equal((await response.json()).visuals.length,6);
 assert.equal(mock.catalog().length,6);
 assert.ok(mock.tree().some(file=>file.path==='references/dicebear-adventurer-blank-v1.png'));
 assert.ok(mock.tree().some(file=>file.path==='references/dicebear-adventurer-default-v1.png'));
 const replay=await handle(request({action:'publish_batch',visuals}));
 assert.equal((await replay.json()).already_saved,true);
 assert.equal(mock.catalog().length,6);
});

test('blank-face generation attaches its own image and has no facial feature instructions',async()=>{
 const {createVisualHandler}=await modulePromise;
 const {blankCharacterImageBase64}=await import(require('node:url').pathToFileURL(require('node:path').resolve('cloud/visual-library/character.js')).href);
 const handle=createVisualHandler({authenticate:async()=>true,openaiKey:'test',fetch:async(url,{body})=>{
  assert.match(body.get('prompt'),/Keep the face completely blank/);
  assert.doesNotMatch(body.get('prompt'),/mouth variant02/);
  assert.equal(Buffer.from(await body.get('image[]').arrayBuffer()).toString('base64'),blankCharacterImageBase64);
  return new Response(JSON.stringify({data:[{b64_json:png}]}));
 }});
 const response=await handle(request({action:'generate',face_variant:'blank',prompt:'Read a book.'}));
 assert.equal(response.status,200);
 assert.equal((await response.json()).reference_id,'dicebear-adventurer-blank-v1');
});

test('object mode creates an age-independent shared record and uses no face reference',async()=>{
 const {validateRecord,createVisualHandler}=await modulePromise;
 const object={...input,visual_mode:'object',age_strand:undefined};
 const record=validateRecord(object,categories,ages);
 assert.equal(record.age_strand,'shared');
 assert.match(record.assets[0],/^visuals\/shared\/communication\//);
 assert.equal(record.asset_type,'object');
 assert.equal(record.character_reference,undefined);
 assert.equal(record.face_variant,undefined);
 assert.throws(()=>validateRecord({...object,face_variant:'default'},categories,ages));
 const handle=createVisualHandler({authenticate:async()=>true,openaiKey:'test',fetch:async(url,{body})=>{
  assert.equal(url,'https://api.openai.com/v1/images/generations');
  const payload=JSON.parse(body);
  assert.match(payload.prompt,/No people, body parts, faces/);
  assert.doesNotMatch(payload.prompt,/mouth variant02/);
  return new Response(JSON.stringify({data:[{b64_json:png}]}));
 }});
 const response=await handle(request({action:'generate',visual_mode:'object',prompt:'One blue notebook.'}));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.visual_mode,'object');
 assert.equal(data.reference_id,null);
 assert.equal(data.face_variant,null);
});

test('same age and face can publish distinct gender and skin variants without collisions',async()=>{
 const {createVisualHandler}=await modulePromise,mock=githubMock();
 const handle=createVisualHandler({authenticate:async()=>true,fetch:mock.fetch,githubToken:'test'});
 const variants=[['male','Light'],['female','Light'],['male','Brown'],['female','Brown']].map(([gender_variant,skin_tone])=>({...input,id:crypto.randomUUID(),face_variant:'default',gender_variant,skin_tone}));
 const response=await handle(request({action:'publish_batch',visuals:variants}));
 assert.equal(response.status,200);const result=await response.json();assert.equal(new Set(result.visuals.map(x=>x.id)).size,4);
 assert.deepEqual(mock.catalog().map(x=>[x.gender_variant,x.skin_tone]),[['male','Light'],['female','Light'],['male','Brown'],['female','Brown']]);
 const retry=await handle(request({action:'publish_batch',visuals:variants}));assert.equal(retry.status,200);assert.equal(mock.catalog().length,4);
});

test('teen variants use Micah while younger variants retain Adventurer',async()=>{
 const {getCharacter,micahReference}=await import('../cloud/visual-library/character.js');
 for(const age of ['12-18','13+','13-18'])for(const face of ['default','blank'])assert.equal(getCharacter(face,age).reference.id,micahReference.id);
 assert.equal(getCharacter('default','6-11').reference.style,'adventurer');
 assert.match(getCharacter('blank','13+').instructions,/Remove all facial features/);
 const {validateRecord}=await modulePromise;
 assert.equal(validateRecord({...input,age_strand:'12-18',reference_id:micahReference.id,face_variant:'blank'},categories,ages).character_reference.style,'micah');
 assert.throws(()=>validateRecord({...input,reference_id:micahReference.id,face_variant:'default'},categories,ages),/face and reference/);
});

test('stylesheet selection matches grid, accepts nonbinary, and records scene metadata',async()=>{
 const {cleanSelection,gridPosition,referenceFor}=await import('../cloud/visual-library/styles.js');
 const {validateRecord}=await modulePromise;
 const selection={reference_style:'2000s',skin_tone:'dark',gender_variant:'nonbinary',age_strand:'12-18',background_mode:'setting',setting:'A quiet classroom'};
 assert.equal(cleanSelection(selection).grid_position,'bottom-right');
 assert.equal(gridPosition('classic','medium','female','6-11'),'bottom-center');
 assert.equal(gridPosition('classic','dark','nonbinary','12-18'),'style-only');
 assert.throws(()=>cleanSelection({...selection,grid_position:'top-left'}));
 assert.throws(()=>cleanSelection({...selection,setting:''}));
 assert.throws(()=>cleanSelection({...selection,reference_style:'https://evil.test/ref.png'}));
 const record=validateRecord({...input,...selection,reference_id:referenceFor('2000s').id},categories,ages);
 assert.equal(record.grid_position,'bottom-right');assert.equal(record.setting,'A quiet classroom');
 assert.equal(record.character_reference.repository_commit.length,40);
 assert.throws(()=>validateRecord({...input,...selection,reference_id:referenceFor('90s').id},categories,ages));
});
test('generation attaches selected stylesheet and sends correct background option',async()=>{
 const {createVisualHandler}=await modulePromise;
 const {sheetFor}=await import('../cloud/visual-library/styles.js');
 for(const background_mode of ['transparent','setting']){
  const calls=[];
  const handle=createVisualHandler({authenticate:async()=>true,openaiKey:'test',fetch:async(url,options={})=>{
   calls.push(url);
   if(url===sheetFor('grunge').url){assert.equal(options.headers,undefined);return new Response(Buffer.from(png,'base64'));}
   assert.equal(url,'https://api.openai.com/v1/images/edits');
   assert.equal(options.body.get('background'),background_mode==='setting'?'opaque':'transparent');
   assert.match(options.body.get('prompt'),/middle right/);assert.match(options.body.get('prompt'),/scruffy comic ink/);
   assert.doesNotMatch(options.body.get('prompt'),/mouth variant02|Micah/);
   assert.equal(Buffer.from(await options.body.get('image[]').arrayBuffer()).toString('base64'),png);
   return new Response(JSON.stringify({data:[{b64_json:png}]}));
  }});
  const response=await handle(request({action:'generate',prompt:'Raise one hand.',reference_style:'grunge',skin_tone:'medium',gender_variant:'nonbinary',age_strand:'12-18',background_mode,setting:'A classroom'}));
  assert.equal(response.status,200);assert.equal(calls.length,2);assert.match((await response.json()).reference_id,/abhp-grunge/);
 }
});
test('published stylesheet visual retains exact reference without archiving unrelated DiceBear art',async()=>{
 const {createVisualHandler}=await modulePromise,{referenceFor}=await import('../cloud/visual-library/styles.js'),mock=githubMock();
 const handle=createVisualHandler({authenticate:async()=>true,fetch:mock.fetch,githubToken:'test'});
 const visual={...input,reference_style:'anime-2',reference_id:referenceFor('anime-2').id,skin_tone:'light',gender_variant:'nonbinary',age_strand:'12-18',background_mode:'transparent'};
 const response=await handle(request(visual));assert.equal(response.status,200);
 assert.equal(mock.catalog()[0].reference_style,'anime-2');assert.equal(mock.catalog()[0].grid_position,'top-right');
 assert.ok(mock.tree().some(f=>f.path==='references/'+referenceFor('anime-2').id+'.json'));
 assert.ok(!mock.tree().some(f=>f.path.includes('ADVENTURER')));
 assert.equal((await handle(request(visual))).status,200);
});

test('large GitHub catalogs load through the pinned raw URL without forwarding credentials',async()=>{
 const {createVisualHandler}=await modulePromise;let raw=false;
 const handle=createVisualHandler({authenticate:async()=>true,githubToken:'test',fetch:async(url,options={})=>{
  const path=new URL(url).pathname;
  if(url.includes('raw.githubusercontent.com')){raw=true;assert.equal(options.headers,undefined);assert.match(url,/\/base\/catalog\/visuals.json$/);return new Response('[]');}
  let value;
  if(path.endsWith('/git/ref/heads/main'))value={object:{sha:'base'}};
  else if(path.endsWith('/catalog/visuals.json'))value={encoding:'none',content:''};
  else if(path.endsWith('/catalog/categories.json'))value={content:Buffer.from(JSON.stringify(categories)).toString('base64')};
  else if(path.endsWith('/catalog/age-strands.json'))value={content:Buffer.from(JSON.stringify(ages)).toString('base64')};
  else if(path.endsWith('/CREATING-VISUALS.md'))value={content:Buffer.from('Guide').toString('base64')};
  else value={permissions:{push:true}};
  return new Response(JSON.stringify(value));
 }});
 const response=await handle(request({action:'status'}));assert.equal(response.status,200);assert.equal(raw,true);
});
