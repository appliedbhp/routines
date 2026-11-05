import {characterReference,characterImageBase64,characterInstructions} from './character.js';
const REPOSITORY='appliedbhp/visual-supports';
const API='https://api.github.com/repos/'+REPOSITORY;
export class VisualError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}
const required=(value,label,max=100)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max)throw new VisualError('Enter '+label+'.');
 return value.trim();
};
export function validateRecord(input,categories,ages){
 const title=required(input.title,'a title');
 const category=categories.find(row=>row.id===input.category);
 const age=ages.find(row=>row.id===input.age_strand);
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
 if(input.reference_id){
  if(input.reference_id!==characterReference.id)throw new VisualError('Unknown character reference.');
  record.character_reference=characterReference;
  if(!record.usage_rights.includes(characterReference.attribution))record.usage_rights+=' '+characterReference.attribution;
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
  return new TextDecoder().decode(Uint8Array.from(atob(result.content.replace(/\s/g,'')),char=>char.charCodeAt(0)));
 }
 async function snapshot(){
  const ref=await github('/git/ref/heads/main'),sha=ref.object.sha;
  const [categories,ages,catalog]=await Promise.all(['catalog/categories.json','catalog/age-strands.json','catalog/visuals.json'].map(async path=>JSON.parse(await file(path,sha))));
  return {sha,categories,ages,catalog};
 }
 async function publish(input){
  const bytes=pngBytes(input.image);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
  // A stable request ID lets a retry find the same visual after a lost response.
  for(let attempt=0;attempt<3;attempt++){
   const state=await snapshot(),record=validateRecord(input,state.categories,state.ages);
   const existing=state.catalog.find(row=>row.id===record.id);
   if(existing){
    const {image_sha256,created_at,...saved}=existing;
    if(image_sha256===digest&&JSON.stringify(saved)===JSON.stringify(record))return {url:'https://github.com/'+REPOSITORY+'/blob/main/'+existing.assets[0],already_saved:true};
    throw new VisualError('This visual ID was already used. Start a new visual before publishing different artwork.',409);
   }
   record.image_sha256=digest;record.created_at=new Date().toISOString();
   const blob=await github('/git/blobs','POST',{content:input.image,encoding:'base64'});
   const base=await github('/git/commits/'+state.sha);
   const referenceFiles=[];
   if(record.character_reference){
    const referenceBlob=await github('/git/blobs','POST',{content:characterImageBase64,encoding:'base64'});
    referenceFiles.push({path:characterReference.asset,mode:'100644',type:'blob',sha:referenceBlob.sha},
     {path:'references/dicebear-adventurer-default-v1.json',mode:'100644',type:'blob',content:JSON.stringify(characterReference,null,2)+'\n'},
     {path:'references/ADVENTURER-ATTRIBUTION.md',mode:'100644',type:'blob',content:'# Adventurer character reference\n\n'+characterReference.attribution+'\n\nSource: '+characterReference.source+'\n'});
   }
   const tree=await github('/git/trees','POST',{base_tree:base.tree.sha,tree:[...referenceFiles,
    {path:record.assets[0],mode:'100644',type:'blob',sha:blob.sha},
    {path:'catalog/visuals.json',mode:'100644',type:'blob',content:JSON.stringify([...state.catalog,record],null,2)+'\n'},
    {path:record.assets[0].replace(/\.png$/,'.json'),mode:'100644',type:'blob',content:JSON.stringify(record,null,2)+'\n'}
   ]});
   const commit=await github('/git/commits','POST',{message:'Add '+record.title+' ('+record.age_strand+') as '+record.status,tree:tree.sha,parents:[state.sha]});
   try{
    await github('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
    return {url:'https://github.com/'+REPOSITORY+'/blob/main/'+record.assets[0],commit_url:'https://github.com/'+REPOSITORY+'/commit/'+commit.sha};
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
   if(Number(req.headers.get('content-length'))>9000000)throw new VisualError('The image is too large.');
   const text=await req.text();
   if(text.length>9000000)throw new VisualError('The image is too large.');
   let input;try{input=JSON.parse(text);}catch{throw new VisualError('Invalid request.');}
   if(input.action==='status'){
    const [state,guide,repo]=await Promise.all([snapshot(),file('CREATING-VISUALS.md','main'),github('')]);
    return respond({categories:state.categories,ages:state.ages,catalog:state.catalog,guide,generation_available:!!openaiKey,write_available:repo.permissions?.push===true});
   }
   if(input.action==='generate'){
    if(!openaiKey)throw new VisualError('Add ROUTINES_OPENAI_KEY to the server secrets to enable image generation.',503);
    const prompt=characterInstructions+'Requested visual: '+required(input.prompt,'an image prompt',12000);
    const form=new FormData();
    for(const [key,value] of Object.entries({model:imageModel,prompt,size:'1024x1024',background:'transparent',output_format:'png',n:'1',quality:'medium',input_fidelity:'high'}))form.set(key,value);
    form.append('image[]',new Blob([Uint8Array.from(atob(characterImageBase64),char=>char.charCodeAt(0))],{type:'image/png'}),'adventurer-reference.png');
    const response=await request('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+openaiKey},body:form,signal:AbortSignal.timeout(140000)});
    if(!response.ok)throw new VisualError('The image service could not generate this visual. Check the OpenAI key, model access, and billing, or try another prompt.',502);
    const data=await response.json(),image=data.data?.[0]?.b64_json;
    pngBytes(image);
    return respond({image,prompt,source:'Generated with OpenAI '+imageModel+' using the DiceBear Adventurer reference',reference_id:characterReference.id});
   }
   if(input.action==='publish')return respond(await publish(input));
   throw new VisualError('Unknown action.');
  }catch(error){return respond({error:error instanceof VisualError?error.message:'The request could not finish. Try again. Publish retries keep the same visual ID.'},error instanceof VisualError?error.status:500);}
 };
}
