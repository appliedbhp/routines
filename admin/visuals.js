import {hairStyles,skinTones,clothingStyles,clothingColors,appearancePrompt} from './visual-appearance.js';
import {accountClient} from '../cloud/client.js';
const host=document.getElementById('visualLibrary');
if(host){
 host.innerHTML=`<h2>Visual library</h2><p>Create original artwork and save it with its prompt to <a href="https://github.com/appliedbhp/visual-supports" target="_blank" rel="noopener noreferrer">visual-supports ↗</a>.</p>
 <button type="button" data-connect>Open visual creator</button><div class="visual-feedback" data-feedback><p data-status role="status"></p><progress data-progress aria-label="Visual set progress" hidden></progress><p data-elapsed></p></div>
 <form data-form hidden>
 <div class="visual-fields">
 <label>Visual mode<select name="visual_mode"><option value="character">Character</option><option value="object">Object · no people</option></select></label><label>Title<input name="title" maxlength="100" required></label>
 <fieldset data-ages><legend>Age strands to create</legend><div data-age-options></div></fieldset><fieldset data-faces><legend>Face versions</legend><label class="visual-check"><input type="checkbox" name="face_versions" value="default" checked> Default face</label><label class="visual-check"><input type="checkbox" name="face_versions" value="blank" checked> Blank face</label></fieldset>
 <label>Category<select name="category" required></select></label>
 <label>Style<select name="style"><option value="illustration">Adventurer illustration</option><option value="simple-symbol">Simple symbol</option></select></label>
 </div>
 <aside class="visual-character-reference"><img src="../assets/characters/adventurer-default.svg" alt="Default Adventurer character: bald, white skin, no glasses, with the selected eyes, eyebrows and mouth"><div><strong>Character references · Adventurer for younger ages, Micah for 13+</strong><p>Adventurer · no hair · transparent background · mouth 02 · eyes 24 · eyebrows 10 · no glasses · white skin.</p><p>Default face uses this expression. Blank face removes all facial features. Appearance selections below override the reference’s hairstyle and skin tone in the creation prompt.</p><img src="../assets/characters/adventurer-blank.svg" alt="Matching Adventurer character with a completely blank face"><a href="https://www.dicebear.com/styles/adventurer/" target="_blank" rel="noopener noreferrer">Adventurer by Lisa Wischofsky, via DiceBear</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></div></aside><aside class="visual-character-reference"><img src="../assets/characters/micah-reference.png" alt="Micah illustration reference for teen visuals"><p>13+ uses <a href="https://www.dicebear.com/styles/micah/" target="_blank" rel="noopener noreferrer">Micah by Micah Lanier, via DiceBear</a> · CC BY 4.0. Appearance selections still apply. The library’s existing 12–18 strand uses this teen reference.</p></aside><div data-matches class="visual-matches" aria-live="polite"></div>
 <fieldset data-appearance><legend>Character appearance</legend><div class="visual-fields"><label>Hairstyle<select name="hair_style"></select></label><p>Versions: male and female, in all seven skin tones (including the original white reference).</p></div><fieldset><legend>Clothing styles · choose any that apply</legend><div class="visual-appearance-options" data-clothing-styles></div></fieldset><fieldset><legend>Clothing colors · choose any that apply</legend><div class="visual-appearance-options" data-clothing-colors></div></fieldset><p>These choices are added when you build the creation prompt. Rebuild the prompt after changing them; existing previews stay unchanged until regenerated.</p></fieldset>
 <label>Action and essential props<textarea name="action" maxlength="3000" rows="3" placeholder="For example, a figure puts a homework folder into an open backpack."></textarea></label>
 <button type="button" data-prompt>Build creation prompt</button>
 <label>Creation prompt<textarea name="generation_prompt" maxlength="12000" rows="7" required></textarea></label>
 <div class="visual-actions"><button type="button" data-generate>Generate selected previews</button><button type="button" data-select-all>Select all three age strands</button></div>
 <p data-generation-note></p>
 <div data-previews class="visual-preview-grid"></div>
 <label>Keywords (separated by commas)<input name="keywords" maxlength="500" required></label>
 <label>Usage rights<textarea name="usage_rights" maxlength="1500" rows="2" required placeholder="Describe the rights you hold and any applicable terms or attribution."></textarea></label>
 <label class="visual-check"><input data-review-all type="checkbox"> I reviewed the complete set for clear meaning, respectful representation and print quality, and confirmed the usage rights. All selected images are ready for library use.</label>

 <div class="visual-actions"><button type="submit" class="primary" data-save>Save all selected previews to GitHub</button><button type="button" data-new>Start another set</button></div>
 <div data-result></div>
 <details><summary>Library creation guide</summary><pre data-guide></pre><a href="https://github.com/appliedbhp/visual-supports/blob/main/CREATING-VISUALS.md" target="_blank" rel="noopener noreferrer">Read the guide on GitHub ↗</a></details>
 </form>`;
 const q=selector=>host.querySelector(selector),form=q('[data-form]'),field=name=>form.elements.namedItem(name);
 form.noValidate=true;
 for(const [name,choices] of [['hair_style',hairStyles]])field(name).replaceChildren(...choices.map(value=>new Option(value,value)));
 for(const [selector,name,choices] of [['[data-clothing-styles]','clothing_styles',clothingStyles],['[data-clothing-colors]','clothing_colors',clothingColors]])for(const value of choices){const label=document.createElement('label');label.className='visual-check';const input=document.createElement('input');input.type='checkbox';input.name=name;input.value=value;label.append(input,document.createTextNode(value));q(selector).append(label);}
 field('usage_rights').defaultValue='Original ABHP artwork is for use on Applied Behavioral Health Practice websites only. Other use requires written permission from Applied Behavioral Health Practice. Third-party source materials retain their original licenses and required attribution.';
 let catalog=[],variants=new Map(),busy=false,sessionRevision=0,canWrite=false,canGenerate=false,timer;
 const ages=()=>[...q('[data-age-options]').querySelectorAll('input:checked')].map(input=>input.value);
 const faces=()=>[...form.querySelectorAll('[name=face_versions]:checked')].map(input=>input.value);
 const objectMode=()=>field('visual_mode').value==='object';
 const selected=()=>{
  if(objectMode()){
   if(!variants.has('object'))variants.set('object',{key:'object',age:'shared',face:null,mode:'object',id:crypto.randomUUID(),image:null,prompt:'',alt:'',source:'',reviewed:false,ready:false,published:false,url:'',referenceId:null,state:'Waiting',error:'',started:0});
   return [variants.get('object')];
  }
  return ages().flatMap(age=>faces().flatMap(face=>['male','female'].flatMap(gender=>skinTones.map(skin=>{
  const key=[age,face,gender,skin].join(':');
  if(!variants.has(key))variants.set(key,{key,age,face,gender,skin,mode:'character',id:crypto.randomUUID(),image:null,prompt:'',alt:'',source:'',reviewed:false,ready:false,published:false,url:'',referenceId:null,state:'Waiting',error:'',started:0});
  return variants.get(key);
 }))));};
 const label=row=>row.mode==='object'?'Object · All ages':'Ages '+row.age+' · '+(row.face==='blank'?'Blank face':'Default face')+' · '+row.gender+' · '+row.skin;
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 function say(text,error=false){
  q('[data-status]').textContent=text;q('[data-feedback]').dataset.error=String(error);
  q('[data-status]').setAttribute('role',error?'alert':'status');
 }
 function invalidate(){
  for(const row of variants.values())if(!row.published)row.reviewed=false;
  q('[data-review-all]').checked=false;
 }
 function elapsed(){
  for(const node of host.querySelectorAll('[data-clock]')){
   const row=variants.get(node.dataset.clock);
   node.textContent=row?.started?' '+Math.floor((Date.now()-row.started)/1000)+'s elapsed':'';
  }
 }
 function controls(){
  for(const node of form.querySelectorAll('input,select,textarea,button'))if(!node.hasAttribute('data-view-image'))node.disabled=busy;
  q('[data-connect]').disabled=busy;
  q('[data-generate]').disabled=busy||!canGenerate;
  q('[data-save]').disabled=busy||!canWrite;
  for(const button of form.querySelectorAll('[data-generate-variant]'))button.disabled=busy||!canGenerate;
  for(const card of host.querySelectorAll('[data-variant]')){
   const row=variants.get(card.dataset.variant);
   if(row.published)for(const node of card.querySelectorAll('input,textarea,button'))if(!node.hasAttribute('data-view-image'))node.disabled=true;
  }
  const rows=selected();q('[data-progress]').hidden=!busy;
  q('[data-progress]').max=Math.max(1,rows.length);
  if(!rows.length||rows.some(row=>row.state==='Saving'))q('[data-progress]').removeAttribute('value');
  else q('[data-progress]').value=rows.filter(row=>row.image&&row.state!=='Generating').length;
  form.setAttribute('aria-busy',String(busy));
 }
 function labeled(text,input){const node=el('label',text);node.append(input);return node;}
 const zoom=el('dialog');zoom.className='visual-zoom';
 const close=el('button','Close preview');close.type='button';close.onclick=()=>zoom.close();
 const large=el('img');zoom.append(close,large);document.body.append(zoom);
 function render(){
  const rows=selected();
  q('[data-previews]').replaceChildren(...rows.map(row=>{
   const card=el('article');card.dataset.variant=row.key;card.className='visual-preview-card';card.setAttribute('aria-label',label(row));
   card.append(el('h3',label(row)));
   const status=el('p',row.error||row.state);status.className='visual-variant-status';status.dataset.state=row.error?'error':row.state;
   if(row.started){const clock=el('span');clock.dataset.clock=row.key;status.append(clock);}
   card.append(status);
   if(row.image){
    const view=el('button');view.type='button';view.dataset.viewImage='';view.className='visual-image-button';view.setAttribute('aria-label','Enlarge '+label(row));
    const img=el('img');img.src='data:image/png;base64,'+row.image;img.alt=row.alt||label(row);view.append(img);
    view.onclick=()=>{large.src=img.src;large.alt=img.alt;zoom.showModal();};card.append(view);
   }else{
    const placeholder=el('div',row.state==='Generating'?'Creating your visual…':'Preview will appear here');
    placeholder.className='visual-placeholder';card.append(placeholder);
   }
   const description=el('textarea');description.value=row.alt;description.maxLength=1000;description.rows=2;
   description.oninput=()=>{row.alt=description.value;row.reviewed=false;q('[data-review-all]').checked=false;};
   card.append(labeled('Image description',description));
   const details=el('details'),summary=el('summary','Source and prompt');details.append(summary);
   const source=el('input');source.value=row.source;source.maxLength=500;source.oninput=()=>{row.source=source.value;row.reviewed=false;q('[data-review-all]').checked=false;};
   const prompt=el('pre',row.prompt||'The prompt used for this image will appear here.');
   details.append(labeled('Source',source),prompt);card.append(details);
   const regenerate=el('button',row.image?'Regenerate':'Generate this preview');regenerate.type='button';regenerate.dataset.generateVariant='';
   regenerate.onclick=run(async revision=>{
    if(row.image&&!confirm('Replace the preview for '+label(row)+'? This generates a new image using your OpenAI account.'))return;
    await generateOne(row,revision);
    if(revision===sessionRevision)say(row.error?label(row)+': '+row.error:'Preview ready for review.',!!row.error);
   });card.append(regenerate);
   const upload=el('input');upload.type='file';upload.accept='image/png';
   upload.onchange=run(async revision=>{
    const file=upload.files[0];if(!file)return;
    if(file.type!=='image/png'||file.size>6*1024*1024)throw Error('Choose a square PNG smaller than 6 MB.');
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read the image.'));reader.readAsDataURL(file);});
    const size=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve([img.naturalWidth,img.naturalHeight]);img.onerror=()=>reject(Error('Invalid PNG.'));img.src=data;});
    if(size[0]!==size[1]||size[0]>4096)throw Error('Choose a square PNG up to 4096 × 4096.');
    if(revision!==sessionRevision)return;
    Object.assign(row,{image:String(data).split(',')[1],source:'Uploaded original artwork',prompt:promptFor(row),referenceId:null,state:'Ready to review',error:'',reviewed:false});
    render();say('Artwork loaded for '+label(row)+'.');
   });card.append(labeled('Or upload a square PNG',upload));
   if(row.url){const link=el('a','View saved visual ↗');link.href=row.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
   return card;
  }));
  q('[data-save]').textContent='Save all '+rows.length+' selected preview'+(rows.length===1?'':'s')+' to GitHub';
  elapsed();controls();
 }
 async function call(body){
  const client=await accountClient(),{data,error}=await client.functions.invoke('routines-visual-library',{body});
  if(error){
   let details;try{details=await error.context?.json();}catch{}
   throw Error(details?.error||'Could not reach the visual service. Check your connection and administrator sign-in.');
  }
  if(data?.error)throw Error(data.error);return data;
 }
 function run(action){return async()=>{
  if(busy)return;
  const revision=sessionRevision;busy=true;controls();timer=setInterval(elapsed,1000);
  try{await action(revision);}catch(error){if(revision===sessionRevision)say(error.message||'This action could not finish.',true);}
  finally{clearInterval(timer);busy=false;controls();}
 };}
 function matches(){
  const title=field('title').value.trim().toLowerCase();
  const found=catalog.filter(row=>(objectMode()?row.age_strand==='shared':ages().includes(row.age_strand))&&row.category===field('category').value&&(!title||[row.title,...row.keywords||[]].join(' ').toLowerCase().includes(title))).slice(0,8);
  const target=q('[data-matches]');target.replaceChildren(el('p',found.length?'Existing library entries to check':'No matching library entries.'));
  for(const row of found){
   const line=el('p',row.title+' · '+(row.age_strand==='shared'?'Shared object':'Ages '+row.age_strand+' · '+(row.face_variant||'default'))+' · '+row.status);
   if(row.assets?.[0]){const link=el('a','View ↗');link.href='https://github.com/appliedbhp/visual-supports/blob/main/'+row.assets[0];link.target='_blank';link.rel='noopener noreferrer';line.append(' ',link);}
   target.append(line);
  }
 }
 function sync(){
  const isObject=objectMode();
  field('action').closest('label').firstChild.textContent=isObject?'Object and essential props':'Action and essential props';
  field('action').placeholder=isObject?'For example, one blue notebook with a blank cover.':'For example, a figure puts a homework folder into an open backpack.';
  for(const selector of ['[data-appearance]','[data-ages]','[data-faces]','.visual-character-reference','[data-select-all]'])for(const node of form.querySelectorAll(selector))node.hidden=isObject;
  field('style').options[0].text=isObject?'Flat outline illustration':'Adventurer illustration';
  q('[data-generation-note]').textContent=isObject?'Object mode creates one shared visual for all ages, without people or faces.':'Each age and face selection creates male and female versions in all seven skin tones: '+selected().length+' images. Generation uses your OpenAI account. Previews appear as they finish.';
  q('[data-review-all]').checked=false;render();matches();
 }
 field('visual_mode').onchange=()=>{field('generation_prompt').value='';sync();say(objectMode()?'Object mode selected. Describe the object to create one shared preview.':'Character mode selected. Choose age strands and face versions.');};
 q('[data-connect]').onclick=run(async revision=>{
  say('Checking administrator access and GitHub connection…');
  const result=await call({action:'status'});
  if(revision!==sessionRevision)return;
  catalog=result.catalog;canWrite=result.write_available;canGenerate=result.generation_available;
  field('category').replaceChildren(...result.categories.map(row=>new Option(row.name,row.id)));
  q('[data-age-options]').replaceChildren(...result.ages.map((row,index)=>{
   const input=el('input');input.type='checkbox';input.name='age_strands';input.value=row.id;input.defaultChecked=index===0;input.onchange=sync;
   const label=labeled('Ages '+row.id,input);return label;
  }));
  q('[data-guide]').textContent=result.guide;
  q('[data-generation-note]').textContent='Each selected age strand gets both selected face versions. Images appear below as they finish. Generating uses your OpenAI API account.';
  form.hidden=false;sync();
  say(!canWrite?'GitHub is connected for reading. The token needs Contents write access to save.':!canGenerate?'GitHub is connected. Add ROUTINES_OPENAI_KEY in Supabase to generate images.':'GitHub and image generation are connected. Choose strands, describe the action, and generate previews.');
 });
 for(const node of form.querySelectorAll('[name=face_versions]'))node.onchange=sync;
 q('[data-select-all]').onclick=()=>{for(const input of q('[data-age-options]').querySelectorAll('input'))input.checked=true;sync();};
 for(const name of ['title','category'])field(name).addEventListener('input',matches);
 function buildPrompt(){
  const action=field('action').value.trim()||field('title').value.trim();
  if(!action)throw Error('Enter a title or describe the action first.');
  if(objectMode()){
   field('generation_prompt').value='Create one square standalone transparent PNG object visual. Subject: '+action+'. Shared all-age library. Use clean flat shapes, medium rounded dark contours, and ink #24243B, white, blue #4C8DFF, teal #2CC6B0, lavender #A78BFA, yellow #FFD447 and coral #FF6B6B as needed. Only the object and essential props; no people, faces or anthropomorphism. No text, labels, numbers, logos, backgrounds, gradients or shadows. Center the object with generous margins. Keep white surfaces opaque and the surrounding canvas transparent.';
   return;
  }
  const appearance=appearancePrompt({hair:field('hair_style').value,skin:'{{skin_tone}}',styles:[...form.querySelectorAll('[name=clothing_styles]:checked')].map(x=>x.value),colors:[...form.querySelectorAll('[name=clothing_colors]:checked')].map(x=>x.value)});
  field('generation_prompt').value=appearance+' Create one standalone square visual support. Action: '+action+' Age strand: {{age_strand}}. Match the attached {{character_style}} character and the requested face version. Use clean flat shapes, dark contours, and no glasses.  Keep the action clear at small size with essential props and generous margins. Use a genuinely transparent background. No text, numbers, labels, logos, borders, gradients, or shadows. Use ink #24243B, white, lavender #A78BFA, blue #4C8DFF, teal #2CC6B0, yellow #FFD447, and coral #FF6B6B as needed.';
 }
 q('[data-prompt]').onclick=()=>{try{buildPrompt();invalidate();render();say('Prompt ready. You can edit it before generating.');}catch(error){say(error.message,true);}};
 function promptFor(row){
  const template=field('generation_prompt').value.trim();
  if(!template)throw Error('Enter or build a creation prompt.');
  if(row.mode==='object')return template+' Shared all-age object visual; no human character or face.';
  const style=['13+','13-18','12-18'].includes(row.age)?'Micah':'Adventurer';
  const styled=template.replaceAll('{{character_style}}',style).replaceAll('Adventurer',style);
  const base=styled.includes('{{age_strand}}')?styled.replaceAll('{{age_strand}}',row.age):styled+' Age strand: '+row.age+'.';
  return base.replaceAll('{{skin_tone}}',row.skin)+' Character version: '+row.gender+'. Depict an age-appropriate '+row.gender+' character, without sexualization or stereotyped activities. Skin tone: '+row.skin+'. Preserve this skin tone across all visible skin. Face version: '+row.face+'. '+(row.face==='blank'?'Keep the face completely blank, with no eyes, eyebrows, mouth or nose.':(style==='Micah'?'Use simple Micah-style facial features.':'Use mouth variant02, eyes variant24, and eyebrows variant10.'))+' Adapt proportions and context respectfully for ages '+row.age+'.';
 }
 async function generateOne(row,revision){
  q('[data-review-all]').checked=false;
  row.state='Generating';row.error='';row.started=Date.now();render();
  try{
   const result=await call({action:'generate',prompt:promptFor(row),age_strand:row.age,visual_mode:row.mode,...(row.face?{face_variant:row.face}:{})});
   if(revision!==sessionRevision)return;
   Object.assign(row,{image:result.image,prompt:result.prompt,source:result.source,referenceId:result.reference_id,state:'Ready to review',error:'',reviewed:false,ready:false});
   row.alt||=(field('action').value.trim()||field('title').value.trim())+(row.mode==='character'?' · '+row.gender+' · '+row.skin:'');
  }catch(error){if(revision===sessionRevision){row.state='Failed';row.error=error.message;}}
  finally{row.started=0;if(revision===sessionRevision)render();}
 }
 q('[data-generate]').onclick=run(async revision=>{
  const rows=selected();if(!rows.length)throw Error('Select at least one age strand and one face version.');
  if(!field('generation_prompt').value.trim())buildPrompt();
  const missing=rows.filter(row=>!row.image&&!row.published);
  if(missing.length&&!confirm('Generate '+missing.length+' images using your OpenAI account? This larger set may take several minutes and incurs image-generation charges.'))return;
  if(!missing.length)throw Error('All selected previews already have artwork. Use a card’s Regenerate button to replace one.');
  for(const row of missing)row.state='Queued';render();
  const queue=[...missing];let finished=0;
  async function worker(){
   while(queue.length&&revision===sessionRevision){
    const row=queue.shift();
    say('Generating '+missing.length+' previews · '+finished+' finished. Each card shows its progress.');
    await generateOne(row,revision);finished++;
   }
  }
  await Promise.all(Array.from({length:Math.min(2,missing.length)},worker));
  if(revision!==sessionRevision)return;
  const failed=rows.filter(row=>row.error);
  say(failed.length?failed.length+' preview(s) failed. Read the message on each card and retry. Completed previews are kept.':'All previews are ready. Review the set below, confirm usage rights, then save together.',!!failed.length);
 });
 form.addEventListener('input',event=>{
  if(['hair_style','skin_tone','clothing_styles','clothing_colors','visual_mode','title','category','style','action','generation_prompt','keywords','usage_rights'].includes(event.target.name)){invalidate();for(const input of host.querySelectorAll('[data-reviewed]'))input.checked=false;}
 });
 q('[data-review-all]').onchange=()=>{
  const checked=q('[data-review-all]').checked;
  for(const row of selected())if(row.image&&!row.published){row.reviewed=checked;row.ready=checked;}
  render();q('[data-review-all]').checked=checked;
 };
 form.onsubmit=event=>{
  event.preventDefault();
  run(async revision=>{
   const rows=selected(),pending=rows.filter(row=>!row.published);
   if(!rows.length)throw Error('Select the age strands and face versions to save.');
   if(!canWrite)throw Error('GitHub Contents write access is required.');
   for(const name of ['title','keywords','usage_rights'])if(!field(name).value.trim()){field(name).focus();throw Error('Enter '+name.replace('_',' ')+' before saving.');}
   for(const row of pending)if(!row.image||!row.alt.trim()||!row.source.trim()||!row.reviewed)throw Error('Finish the image, description, source and review for '+label(row)+'.');
   if(!q('[data-review-all]').checked)throw Error('Confirm the usage rights before saving.');
   if(!pending.length){say('All selected previews are already saved.');return;}
   const visuals=pending.map(row=>({id:row.id,title:field('title').value,category:field('category').value,style:field('style').value,keywords:field('keywords').value,usage_rights:field('usage_rights').value,age_strand:row.age,visual_mode:row.mode,...(row.mode==='character'?{gender_variant:row.gender,skin_tone:row.skin}:{}),...(row.face?{face_variant:row.face}:{}),image:row.image,generation_prompt:row.prompt||promptFor(row),alt_text:row.alt,source:row.source,reference_id:row.referenceId,reviewed:true,rights_confirmed:true,ready:row.ready}));
   for(const row of pending)row.state='Saving';render();
   say('Saving all '+pending.length+' previews together in small batches…');
   try{
    for(let offset=0;offset<visuals.length;offset+=6){
    say('Saving previews '+(offset+1)+'–'+Math.min(offset+6,visuals.length)+' of '+visuals.length+'…');
    const batch=visuals.slice(offset,offset+6);
    const result=await call({action:'publish_batch',visuals:batch});
    if(revision!==sessionRevision)return;
    for(const row of pending.filter(row=>batch.some(item=>item.id===row.id))){
     const saved=result.visuals.find(item=>item.id==='admin-'+row.id);
     if(!saved)throw Error('The save response was incomplete. Retry to confirm the saved set.');
     Object.assign(row,{published:true,url:saved.url,state:'Saved',error:''});
    }
    }
    say('All '+rows.length+' selected previews are saved to GitHub.');
   }catch(error){
    for(const row of pending)if(!row.published){row.state='Save needs confirmation';row.error=error.message;}
    throw error;
   }finally{if(revision===sessionRevision)render();}
  })();
 };
 function reset(){
  form.reset();variants.clear();q('[data-result]').replaceChildren();sync();
 }
 q('[data-new]').onclick=()=>{
  if([...variants.values()].some(row=>row.image&&!row.published)&&!confirm('Discard the unsaved previews and start a new set?'))return;
  reset();say('Ready for a new set.');
 };
 function clear(){sessionRevision++;reset();form.hidden=true;catalog=[];large.removeAttribute('src');if(zoom.open)zoom.close();say('');}
 addEventListener('beforeunload',event=>{if(busy||[...variants.values()].some(row=>row.image&&!row.published)){event.preventDefault();event.returnValue='';}});
 addEventListener('board-cloud-signedout',clear);
 addEventListener('storage',event=>{if(event.key==='routines.cloud.auth.v1')clear();});
}
