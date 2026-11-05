import {accountClient} from '../cloud/client.js';
const host=document.getElementById('visualLibrary');
if(host){
 host.innerHTML=`<h2>Visual library</h2><p>Create original artwork and save it with its prompt to <a href="https://github.com/appliedbhp/visual-supports" target="_blank" rel="noopener noreferrer">visual-supports ↗</a>.</p>
 <button type="button" data-connect>Open visual creator</button><div class="visual-feedback" data-feedback><p data-status role="status"></p><progress data-progress aria-label="Visual set progress" hidden></progress><p data-elapsed></p></div>
 <form data-form hidden>
 <div class="visual-fields">
 <label>Title<input name="title" maxlength="100" required></label>
 <fieldset data-ages><legend>Age strands to create</legend><div data-age-options></div></fieldset><fieldset><legend>Face versions</legend><label class="visual-check"><input type="checkbox" name="face_versions" value="default" checked> Default face</label><label class="visual-check"><input type="checkbox" name="face_versions" value="blank" checked> Blank face</label></fieldset>
 <label>Category<select name="category" required></select></label>
 <label>Style<select name="style"><option value="illustration">Adventurer illustration</option><option value="simple-symbol">Simple symbol</option></select></label>
 </div>
 <aside class="visual-character-reference"><img src="../assets/characters/adventurer-default.svg" alt="Default Adventurer character: bald, white skin, no glasses, with the selected eyes, eyebrows and mouth"><div><strong>Standard character reference</strong><p>Adventurer · no hair · transparent background · mouth 02 · eyes 24 · eyebrows 10 · no glasses · white skin.</p><p>Default face uses this expression. Blank face uses the same character with all facial features removed.</p><img src="../assets/characters/adventurer-blank.svg" alt="Matching Adventurer character with a completely blank face"><a href="https://www.dicebear.com/styles/adventurer/" target="_blank" rel="noopener noreferrer">Adventurer by Lisa Wischofsky, via DiceBear</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></div></aside><div data-matches class="visual-matches" aria-live="polite"></div>
 <label>Action and essential props<textarea name="action" maxlength="3000" rows="3" placeholder="For example, a figure puts a homework folder into an open backpack."></textarea></label>
 <button type="button" data-prompt>Build creation prompt</button>
 <label>Creation prompt<textarea name="generation_prompt" maxlength="12000" rows="7" required></textarea></label>
 <div class="visual-actions"><button type="button" data-generate>Generate selected previews</button><button type="button" data-select-all>Select all three age strands</button></div>
 <p data-generation-note></p>
 <div data-previews class="visual-preview-grid"></div>
 <label>Keywords (separated by commas)<input name="keywords" maxlength="500" required></label>
 <label>Usage rights<textarea name="usage_rights" maxlength="1500" rows="2" required placeholder="Describe the rights you hold and any applicable terms or attribution."></textarea></label>
 <label class="visual-check"><input data-review-all type="checkbox"> I reviewed all selected previews for clear meaning, respectful representation, and print quality.</label>
 <label class="visual-check"><input name="rights_confirmed" type="checkbox"> I checked the source and rights and confirm all selected artwork can be used in this commercial library.</label>
 <div class="visual-actions"><button type="submit" class="primary" data-save>Save all selected previews to GitHub</button><button type="button" data-new>Start another set</button></div>
 <div data-result></div>
 <details><summary>Library creation guide</summary><pre data-guide></pre><a href="https://github.com/appliedbhp/visual-supports/blob/main/CREATING-VISUALS.md" target="_blank" rel="noopener noreferrer">Read the guide on GitHub ↗</a></details>
 </form>`;
 const q=selector=>host.querySelector(selector),form=q('[data-form]'),field=name=>form.elements.namedItem(name);
 form.noValidate=true;
 let catalog=[],variants=new Map(),busy=false,sessionRevision=0,canWrite=false,canGenerate=false,timer;
 const ages=()=>[...q('[data-age-options]').querySelectorAll('input:checked')].map(input=>input.value);
 const faces=()=>[...form.querySelectorAll('[name=face_versions]:checked')].map(input=>input.value);
 const selected=()=>ages().flatMap(age=>faces().map(face=>{
  const key=age+':'+face;
  if(!variants.has(key))variants.set(key,{key,age,face,id:crypto.randomUUID(),image:null,prompt:'',alt:'',source:'',reviewed:false,ready:false,published:false,url:'',referenceId:null,state:'Waiting',error:'',started:0});
  return variants.get(key);
 }));
 const label=row=>'Ages '+row.age+' · '+(row.face==='blank'?'Blank face':'Default face');
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 function say(text,error=false){
  q('[data-status]').textContent=text;q('[data-feedback]').dataset.error=String(error);
  q('[data-status]').setAttribute('role',error?'alert':'status');
 }
 function invalidate(){
  for(const row of variants.values())if(!row.published)row.reviewed=false;
  q('[data-review-all]').checked=false;field('rights_confirmed').checked=false;
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
   description.oninput=()=>{row.alt=description.value;row.reviewed=false;q('[data-review-all]').checked=false;card.querySelector('[data-reviewed]').checked=false;};
   card.append(labeled('Image description',description));
   const details=el('details'),summary=el('summary','Source and prompt');details.append(summary);
   const source=el('input');source.value=row.source;source.maxLength=500;source.oninput=()=>{row.source=source.value;row.reviewed=false;q('[data-review-all]').checked=false;card.querySelector('[data-reviewed]').checked=false;};
   const prompt=el('pre',row.prompt||'The prompt used for this image will appear here.');
   details.append(labeled('Source',source),prompt);card.append(details);
   const reviewed=el('input');reviewed.type='checkbox';reviewed.checked=row.reviewed;reviewed.dataset.reviewed='';
   reviewed.onchange=()=>{row.reviewed=reviewed.checked;q('[data-review-all]').checked=selected().every(item=>item.image&&item.reviewed);};
   const reviewLabel=labeled('Reviewed this preview',reviewed);reviewLabel.className='visual-check';card.append(reviewLabel);
   const ready=el('input');ready.type='checkbox';ready.checked=row.ready;ready.onchange=()=>{row.ready=ready.checked;};
   const readyLabel=labeled('Mark ready for library use',ready);readyLabel.className='visual-check';card.append(readyLabel);
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
  const found=catalog.filter(row=>ages().includes(row.age_strand)&&row.category===field('category').value&&(!title||[row.title,...row.keywords||[]].join(' ').toLowerCase().includes(title))).slice(0,8);
  const target=q('[data-matches]');target.replaceChildren(el('p',found.length?'Existing library entries to check':'No matching library entries.'));
  for(const row of found){
   const line=el('p',row.title+' · Ages '+row.age_strand+' · '+(row.face_variant||'default')+' · '+row.status);
   if(row.assets?.[0]){const link=el('a','View ↗');link.href='https://github.com/appliedbhp/visual-supports/blob/main/'+row.assets[0];link.target='_blank';link.rel='noopener noreferrer';line.append(' ',link);}
   target.append(line);
  }
 }
 function sync(){q('[data-review-all]').checked=false;render();matches();}
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
  field('generation_prompt').value='Create one standalone square visual support. Action: '+action+' Age strand: {{age_strand}}. Match the attached Adventurer character and the requested face version. Use clean flat shapes, dark contours, opaque white skin, a bald head, and no glasses. Keep the action clear at small size with essential props and generous margins. Use a genuinely transparent background. No text, numbers, labels, logos, borders, gradients, or shadows. Use ink #24243B, white, lavender #A78BFA, blue #4C8DFF, teal #2CC6B0, yellow #FFD447, and coral #FF6B6B as needed.';
 }
 q('[data-prompt]').onclick=()=>{try{buildPrompt();invalidate();render();say('Prompt ready. You can edit it before generating.');}catch(error){say(error.message,true);}};
 function promptFor(row){
  const template=field('generation_prompt').value.trim();
  if(!template)throw Error('Enter or build a creation prompt.');
  const base=template.includes('{{age_strand}}')?template.replaceAll('{{age_strand}}',row.age):template+' Age strand: '+row.age+'.';
  return base+' Face version: '+row.face+'. '+(row.face==='blank'?'Keep the face completely blank, with no eyes, eyebrows, mouth or nose.':'Use mouth variant02, eyes variant24, and eyebrows variant10.')+' Adapt proportions and context respectfully for ages '+row.age+'.';
 }
 async function generateOne(row,revision){
  row.state='Generating';row.error='';row.started=Date.now();render();
  try{
   const result=await call({action:'generate',prompt:promptFor(row),face_variant:row.face});
   if(revision!==sessionRevision)return;
   Object.assign(row,{image:result.image,prompt:result.prompt,source:result.source,referenceId:result.reference_id,state:'Ready to review',error:'',reviewed:false,ready:false});
   row.alt||=field('action').value.trim()||field('title').value.trim();
  }catch(error){if(revision===sessionRevision){row.state='Failed';row.error=error.message;}}
  finally{row.started=0;if(revision===sessionRevision)render();}
 }
 q('[data-generate]').onclick=run(async revision=>{
  const rows=selected();if(!rows.length)throw Error('Select at least one age strand and one face version.');
  if(!field('generation_prompt').value.trim())buildPrompt();
  const missing=rows.filter(row=>!row.image&&!row.published);
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
  if(['title','category','style','action','generation_prompt','keywords','usage_rights'].includes(event.target.name)){invalidate();for(const input of host.querySelectorAll('[data-reviewed]'))input.checked=false;}
 });
 q('[data-review-all]').onchange=()=>{
  const checked=q('[data-review-all]').checked;
  for(const row of selected())if(row.image&&!row.published)row.reviewed=checked;
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
   if(!field('rights_confirmed').checked)throw Error('Confirm the usage rights before saving.');
   if(!pending.length){say('All selected previews are already saved.');return;}
   const visuals=pending.map(row=>({id:row.id,title:field('title').value,category:field('category').value,style:field('style').value,keywords:field('keywords').value,usage_rights:field('usage_rights').value,age_strand:row.age,face_variant:row.face,image:row.image,generation_prompt:row.prompt||promptFor(row),alt_text:row.alt,source:row.source,reference_id:row.referenceId,reviewed:true,rights_confirmed:true,ready:row.ready}));
   for(const row of pending)row.state='Saving';render();
   say('Saving all '+pending.length+' previews together in one GitHub commit…');
   try{
    const result=await call({action:'publish_batch',visuals});
    if(revision!==sessionRevision)return;
    for(const row of pending){
     const saved=result.visuals.find(item=>item.age_strand===row.age&&item.face_variant===row.face);
     if(!saved)throw Error('The save response was incomplete. Retry to confirm the saved set.');
     Object.assign(row,{published:true,url:saved.url,state:'Saved',error:''});
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
