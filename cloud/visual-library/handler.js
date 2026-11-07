import {styleSheets,cleanSelection,selectionInstructions,referenceFor,sheetFor} from './styles.js';
import {characterReference,blankCharacterReference,micahReference,getMicah,getCharacter} from './character.js';
const REPOSITORY='appliedbhp/visual-supports';
const API='https://api.github.com/repos/'+REPOSITORY;
export class VisualError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}
const required=(value,label,max=100)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max)throw new VisualError('Enter '+label+'.');
 return value.trim();
};
export function validateRecord(input,categories,ages,personalReference=null){
 const title=required(input.title,'a title');
 const category=categories.find(row=>row.id===input.category);
 if(input.visual_mode!==undefined&&!['character','object'].includes(input.visual_mode))throw new VisualError('Choose character or object mode.');
 const objectMode=input.visual_mode==='object';
 const age=objectMode?{id:'shared',min_age:0,max_age:18}:ages.find(row=>row.id===input.age_strand);
 if(objectMode&&(input.face_variant||input.reference_id))throw new VisualError('Objects use no face or character reference.');
 if(!category||!age)throw new VisualError('Choose an age strand and category from the library.');
 const id=required(input.id,'a visual ID');
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw new VisualError('Invalid visual ID.');
 const slug=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'visual';
 if(!['illustration','simple-symbol','photo'].includes(input.style))throw new VisualError('Choose a visual style.');
 if(input.reviewed!==true||input.rights_confirmed!==true)throw new VisualError('Review the image and confirm its usage rights before publishing.');
 const record={id:'admin-'+id,title,age_strand:age.id,min_age:age.min_age,max_age:age.max_age,category:category.id,
  keywords:required(input.keywords,'search keywords',500).split(',').map(word=>word.trim()).filter(Boolean).slice(0,30),
  status:input.ready===true?'ready':'draft',style:input.style,
  assets:['visuals/'+age.id+'/'+category.id+'/'+slug+'-'+id+'.png'],
  alt_text:required(input.alt_text,'an image description',1000),
  generation_prompt:required(input.generation_prompt,'the creation prompt',12000),
  source:required(input.source,'creation or source information',500),
  usage_rights:required(input.usage_rights,'usage-rights information',1500)};
 if(input.gender_variant!==undefined){if(objectMode||!['male','female','nonbinary'].includes(input.gender_variant))throw new VisualError('Choose male, female, or nonbinary character version.');record.gender_variant=input.gender_variant;}
 if(input.skin_tone!==undefined){if(objectMode)throw new VisualError('Objects have no skin tone.');record.skin_tone=required(input.skin_tone,'a skin tone',100);}
 if(input.visual_mode)record.visual_mode=input.visual_mode;
 if(objectMode)record.asset_type='object';
 if(input.face_variant!==undefined){
  if(!['default','blank'].includes(input.face_variant))throw new VisualError('Choose a default or blank face.');
  record.face_variant=input.face_variant;
 }
 if(input.reference_style){
  if(objectMode)throw new VisualError('Objects use no character stylesheet.');
  let selection;try{selection=cleanSelection(input);}catch(error){throw new VisualError(error.message);}
  Object.assign(record,selection);
  if(input.face_variant==='blank')throw new VisualError('Stylesheet characters use expressive faces.');
  if(input.reference_style!=='my-character'&&input.reference_id&&input.reference_id!==referenceFor(input.reference_style).id)throw new VisualError('The stylesheet and reference do not match.');
 }
 if(input.reference_style==='my-character'&&(!personalReference||input.reference_id!==personalReference.id))throw new VisualError('Include the saved character used for this image.');
 if(input.reference_id){
  const reference=[characterReference,blankCharacterReference,micahReference,...styleSheets.filter(s=>!s.personal).map(s=>referenceFor(s.id)),...(personalReference?[personalReference]:[])].find(row=>row.id===input.reference_id);
  if(!reference)throw new VisualError('Unknown character reference.');
  if(reference.repository_commit&&!input.reference_style)throw new VisualError('Include the stylesheet selection.');
  if(!reference.repository_commit&&!reference.personal&&input.face_variant&&reference.id!==getCharacter(input.face_variant,reference.id===micahReference.id?input.age_strand:"").reference.id)throw new VisualError('The face and reference do not match.');
  record.character_reference=reference;
  if(!record.usage_rights.includes(reference.attribution))record.usage_rights+=' '+reference.attribution;
 }
 return record;
}
export function pngBytes(base64){
 if(typeof base64!=='string'||base64.length>8500000||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new VisualError('Use a PNG image smaller than 6 MB.');
 let bytes;
 try{bytes=Uint8Array.from(atob(base64),char=>char.charCodeAt(0));}catch{throw new VisualError('Invalid PNG image.');}
 if(bytes.length<33||bytes.length>6*1024*1024||![137,80,78,71,13,10,26,10].every((value,i)=>bytes[i]===value))throw new VisualError('Upload a valid PNG image.');
 const view=new DataView(bytes.buffer),width=view.getUint32(16),height=view.getUint32(20);
 if(!width||width!==height||width>4096)throw new VisualError('Use a square PNG up to 4096 × 4096.');
 return bytes;
}

const personalCredits={adventurer:'Adventurer by Lisa Wischofsky / DiceBear / CC BY 4.0. Custom colors and optional hair gradient by ABHP.',micah:'Micah by Micah Lanier / DiceBear / CC BY 4.0.',notionists:'Notionists by Zoish / DiceBear / CC0 1.0.','open-peeps':'Open Peeps by Pablo Stanley / DiceBear / CC0 1.0.'};
async function personalCharacter(input){
 if(!input||!Object.hasOwn(personalCredits,input.style))throw new VisualError('Choose and save a supported My Character first.');
 const bytes=pngBytes(input.image),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const id='my-character-'+input.style+'-'+digest;
 return {bytes,image:input.image,reference:{id,personal:true,style:input.style,asset:'references/'+id+'.png',image_sha256:digest,source:'My Character / DiceBear',attribution:personalCredits[input.style]}};
}

export function createVisualHandler({authenticate,fetch:request=fetch,githubToken,openaiKey,imageModel='gpt-image-1.5'}){
 async function github(path,method='GET',body){
  if(!githubToken)throw new VisualError('Add VISUALS_GITHUB_TOKEN to the server secrets to connect the library.',503);
  const response=await request(API+path,{method,headers:{Authorization:'Bearer '+githubToken,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok){
   if(response.status===409||response.status===422)throw new VisualError('The library changed while saving. Try publishing again.',409);
   throw new VisualError('GitHub could not complete this action. Check the token’s repository access and Contents write permission.',502);
  }
  return response.json();
 }
 async function file(path,ref){
  const result=await github('/contents/'+path+'?ref='+encodeURIComponent(ref));
  if(result.encoding==='none'||!result.content){
   const response=await request('https://raw.githubusercontent.com/'+REPOSITORY+'/'+encodeURIComponent(ref)+'/'+path.split('/').map(encodeURIComponent).join('/'),{signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw new VisualError('Could not load the library catalog.',502);
   return response.text();
  }
  return new TextDecoder().decode(Uint8Array.from(atob(result.content.replace(/\s/g,'')),char=>char.charCodeAt(0)));
 }
 async function snapshot(){
  const ref=await github('/git/ref/heads/main'),sha=ref.object.sha;
  const [categories,ages,catalog]=await Promise.all(['catalog/categories.json','catalog/age-strands.json','catalog/visuals.json'].map(async path=>JSON.parse(await file(path,sha))));
  return {sha,categories,ages,catalog};
 }
 async function publishMany(inputs){
  if(!Array.isArray(inputs)||inputs.length<1||inputs.length>6)throw new VisualError('Save between one and six age and face variants.');
  const images=await Promise.all(inputs.map(async input=>{
   const bytes=pngBytes(input.image);
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
   const personal=input.reference_style==='my-character'?await personalCharacter(input.personal_reference):null;
   return {input,digest,personal};
  }));
  for(let attempt=0;attempt<3;attempt++){
   const state=await snapshot();
   const records=images.map(({input,digest,personal})=>({input,digest,personal,record:validateRecord(input,state.categories,state.ages,personal?.reference)}));
   if(new Set(records.map(row=>row.record.id)).size!==records.length||new Set(records.map(row=>[row.record.age_strand,row.record.face_variant||'default',row.record.gender_variant||'',row.record.skin_tone||''].join(':'))).size!==records.length)throw new VisualError('Each selected strand needs its own visual ID.');
   const pending=[];
   for(const row of records){
    const existing=state.catalog.find(saved=>saved.id===row.record.id);
    if(existing){
     const {image_sha256,created_at,...saved}=existing;
     if(image_sha256!==row.digest||JSON.stringify(saved)!==JSON.stringify(row.record))throw new VisualError('A visual ID was already used for different artwork. Start a new set before publishing changed artwork.',409);
    }else pending.push(row);
   }
   const results=records.map(({record})=>({id:record.id,age_strand:record.age_strand,face_variant:record.face_variant||null,visual_mode:record.visual_mode||'character',url:'https://github.com/'+REPOSITORY+'/blob/main/'+record.assets[0]}));
   if(!pending.length)return {visuals:results,already_saved:true};
   const files=[];
   for(const {input,digest,record} of pending){
    record.image_sha256=digest;record.created_at=new Date().toISOString();
    const blob=await github('/git/blobs','POST',{content:input.image,encoding:'base64'});
    files.push({path:record.assets[0],mode:'100644',type:'blob',sha:blob.sha},
     {path:record.assets[0].replace(/\.png$/,'.json'),mode:'100644',type:'blob',content:JSON.stringify(record,null,2)+'\n'});
   }
   const references=new Map(pending.filter(row=>row.record.character_reference).map(row=>[row.record.character_reference.id,row.record.character_reference]));
   for(const reference of references.values()){
    if(reference.personal){
     const personal=pending.find(row=>row.personal?.reference.id===reference.id).personal;
     const blob=await github('/git/blobs','POST',{content:personal.image,encoding:'base64'});
     files.push({path:reference.asset,mode:'100644',type:'blob',sha:blob.sha},{path:'references/'+reference.id+'.json',mode:'100644',type:'blob',content:JSON.stringify(reference,null,2)+'\n'});
     continue;
    }
    if(reference.repository_commit){
     files.push({path:'references/'+reference.id+'.json',mode:'100644',type:'blob',content:JSON.stringify(reference,null,2)+'\n'});
     continue;
    }
    const character=reference.id===micahReference.id?getMicah():getCharacter(reference.id===blankCharacterReference.id?'blank':'default');
    const referenceBlob=await github('/git/blobs','POST',{content:character.image,encoding:'base64'});
    files.push({path:reference.asset,mode:'100644',type:'blob',sha:referenceBlob.sha},
     {path:'references/'+reference.id+'.json',mode:'100644',type:'blob',content:JSON.stringify(reference,null,2)+'\n'});
   }
   if(references.has(micahReference.id))files.push({path:'references/MICAH-ATTRIBUTION.md',mode:'100644',type:'blob',content:micahReference.attribution+'\nSource: '+micahReference.source+'\n'});
   if(references.has(characterReference.id)||references.has(blankCharacterReference.id))files.push({path:'references/ADVENTURER-ATTRIBUTION.md',mode:'100644',type:'blob',content:'# Adventurer character references\n\n'+characterReference.attribution+'\n\nSource: '+characterReference.source+'\n'});
   files.push({path:'catalog/visuals.json',mode:'100644',type:'blob',content:JSON.stringify([...state.catalog,...pending.map(row=>row.record)],null,2)+'\n'});
   const base=await github('/git/commits/'+state.sha);
   const tree=await github('/git/trees','POST',{base_tree:base.tree.sha,tree:files});
   const commit=await github('/git/commits','POST',{message:'Add '+pending.length+' visual'+(pending.length===1?'':'s')+' · '+pending[0].record.title,tree:tree.sha,parents:[state.sha]});
   try{
    await github('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
    return {visuals:results,commit_url:'https://github.com/'+REPOSITORY+'/commit/'+commit.sha};
   }catch(error){if(error.status!==409||attempt===2)throw error;}
  }
 }
 return async function handle(req){
  const origin=req.headers.get('origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://routines.getadhd.care','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin'};
  const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&origin!=='https://routines.getadhd.care')return respond({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return respond({error:'Use POST.'},405);
  try{
   if(!await authenticate(req.headers.get('authorization')||''))return respond({error:'Administrator sign-in required.'},403);
   if(Number(req.headers.get('content-length'))>52000000)throw new VisualError('The image is too large.');
   const text=await req.text();
   if(text.length>52000000)throw new VisualError('The image is too large.');
   let input;try{input=JSON.parse(text);}catch{throw new VisualError('Invalid request.');}
   if(input.action==='status'){
    const [state,guide,repo]=await Promise.all([snapshot(),file('CREATING-VISUALS.md','main'),github('')]);
    return respond({categories:state.categories,ages:state.ages,catalog:state.catalog,guide,generation_available:!!openaiKey,write_available:repo.permissions?.push===true});
   }
   if(input.action==='generate'){
    if(!openaiKey)throw new VisualError('Add ROUTINES_OPENAI_KEY to the server secrets to enable image generation.',503);
    if(input.visual_mode!==undefined&&!['character','object'].includes(input.visual_mode))throw new VisualError('Choose character or object mode.');
    const objectMode=input.visual_mode==='object';
    if(input.face_variant!==undefined&&!['default','blank'].includes(input.face_variant))throw new VisualError('Choose a default or blank face.');
    let selection=null;
    if(input.reference_style){
     if(objectMode||input.face_variant==='blank')throw new VisualError('Stylesheets require a character with an expressive face.');
     try{selection=cleanSelection(input);}catch(error){throw new VisualError(error.message);}
    }
    const character=objectMode||selection?null:getCharacter(input.face_variant||'default',input.age_strand);
    const sheet=selection?sheetFor(selection.reference_style):null;
    const personal=sheet?.personal?await personalCharacter(input.personal_reference):null;
    const objectInstructions='Create one nonhuman object visual for the shared all-age library. Show only the requested object and essential props. No people, body parts, faces, eyes, mouths, or anthropomorphism. Use clean flat closed shapes, medium rounded dark contours, and a palette of ink #24243B, white #FFFFFF, blue #4C8DFF, teal #2CC6B0, lavender #A78BFA, yellow #FFD447 and coral #FF6B6B as needed. No gradients, shading, shadows, texture, 3D, scenery, borders, logos, letters or numbers. Center the complete object with ten percent safe margins. Keep white objects opaque and the surrounding canvas genuinely transparent. ';
    const prompt=(objectMode?objectInstructions:selection?selectionInstructions(selection):character.instructions)+'Requested visual: '+required(input.prompt,'an image prompt',12000);
    const options={model:imageModel,prompt,size:'1024x1024',background:selection?.background_mode==='setting'?'opaque':'transparent',output_format:'png',n:1,quality:'medium'};
    let body,headers={Authorization:'Bearer '+openaiKey};
    if(objectMode){
     headers['Content-Type']='application/json';body=JSON.stringify(options);
    }else{
     body=new FormData();
     for(const [key,value] of Object.entries({...options,input_fidelity:'high'}))body.set(key,String(value));
     let bytes;
     if(personal){bytes=personal.bytes;}else if(sheet){
      const referenceResponse=await request(sheet.url,{signal:AbortSignal.timeout(20000)});
      if(!referenceResponse.ok)throw new VisualError('Could not load the selected stylesheet. Try again.',502);
      bytes=new Uint8Array(await referenceResponse.arrayBuffer());
      if(bytes.length>8*1024*1024||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new VisualError('The stylesheet is not a valid PNG.',502);
     }else bytes=Uint8Array.from(atob(character.image),char=>char.charCodeAt(0));
     body.append('image[]',new Blob([bytes],{type:'image/png'}),'character-reference.png');
    }
    const response=await request('https://api.openai.com/v1/images/'+(objectMode?'generations':'edits'),{method:'POST',headers,body,signal:AbortSignal.timeout(140000)});
    if(!response.ok){
     let failure;try{failure=await response.json();}catch{}
     const code=failure?.error?.code;
     const messages={
      insufficient_quota:'The OpenAI account has no available API credit. Check its billing and spending limit.',
      invalid_api_key:'OpenAI rejected ROUTINES_OPENAI_KEY. Replace the server secret with a valid API key.',
      model_not_found:'The OpenAI account cannot access the configured image model.',
      rate_limit_exceeded:'OpenAI is temporarily limiting image requests. Wait a minute, then retry this strand.',
      content_policy_violation:'The image service declined this prompt. Revise the action description and retry.'
     };
     const requestId=response.headers.get('x-request-id');
     throw new VisualError((messages[code]||'OpenAI could not generate the image (HTTP '+response.status+'). Check model access or try revising the prompt.')+(requestId?' Reference: '+requestId:''),502);
    }
    const data=await response.json(),image=data.data?.[0]?.b64_json;
    pngBytes(image);
    return respond({image,prompt,source:'Generated with OpenAI '+imageModel+(objectMode?' · shared object visual':sheet?' using the ABHP '+sheet.name+' stylesheet':' using the DiceBear '+character.reference.style+' reference'),reference_id:personal?personal.reference.id:sheet?referenceFor(sheet.id).id:character?.reference.id||null,face_variant:objectMode?null:input.face_variant||'default',visual_mode:objectMode?'object':'character'});
   }
   if(input.action==='publish'){
    const result=await publishMany([input]);return respond({...result,...result.visuals[0]});
   }
   if(input.action==='publish_batch')return respond(await publishMany(input.visuals));
   throw new VisualError('Unknown action.');
   }catch(error){
   if(error?.name==='TimeoutError')return respond({error:'Image generation timed out. Your completed previews are kept. Retry the missing strand.'},504);
   return respond({error:error instanceof VisualError?error.message:'The request could not finish. Try again. Publish retries keep the same visual ID.'},error instanceof VisualError?error.status:500);}
 };
}
