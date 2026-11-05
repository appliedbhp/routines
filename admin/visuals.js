import {accountClient} from '../cloud/client.js';
const host=document.getElementById('visualLibrary');
if(host){
 host.innerHTML=`<h2>Visual library</h2><p>Create original artwork and save it with its prompt to <a href="https://github.com/appliedbhp/visual-supports" target="_blank" rel="noopener noreferrer">visual-supports ↗</a>.</p>
 <button type="button" data-connect>Open visual creator</button><p data-status role="status"></p>
 <form data-form hidden>
 <div class="visual-fields">
 <label>Title<input name="title" maxlength="100" required></label>
 <fieldset data-ages><legend>Age strands to create</legend><div data-age-options></div></fieldset>
 <label>Category<select name="category" required></select></label>
 <label>Style<select name="style"><option value="illustration">Editorial illustration</option><option value="simple-symbol">Simple symbol</option><option value="photo">Photo style</option></select></label>
 </div>
 <div data-matches class="visual-matches" aria-live="polite"></div>
 <label>Action and essential props<textarea name="action" maxlength="3000" rows="3" placeholder="For example, a figure puts a homework folder into an open backpack."></textarea></label>
 <button type="button" data-prompt>Build creation prompt</button>
 <label>Creation prompt<textarea name="generation_prompt" maxlength="12000" rows="7" required></textarea></label>
 <div class="visual-actions"><button type="button" data-generate>Generate selected strands</button><button type="button" data-regenerate>Regenerate this strand</button><label>Or upload your artwork (square PNG, up to 6 MB)<input data-upload type="file" accept="image/png"></label></div>
 <p data-generation-note></p>
 <label>Reviewing visual<select data-active-age></select></label><figure data-preview hidden><img alt="Artwork preview"><figcaption>Review the action, representation, transparency, and print quality.</figcaption><details><summary>Prompt used for this image</summary><pre data-image-prompt></pre></details></figure>
 <label>Image description (alt text)<textarea name="alt_text" maxlength="1000" rows="2" required></textarea></label>
 <label>Keywords (separated by commas)<input name="keywords" maxlength="500" required></label>
 <label>Creation or source information<input name="source" maxlength="500" required placeholder="How this artwork was created"></label>
 <label>Usage rights<textarea name="usage_rights" maxlength="1500" rows="2" required placeholder="Describe the rights you hold and any applicable terms or attribution."></textarea></label>
 <label class="visual-check"><input name="reviewed" type="checkbox" required> I reviewed the artwork for this age strand for clear meaning, respectful representation, legibility, and print quality.</label>
 <label class="visual-check"><input name="rights_confirmed" type="checkbox" required> I checked the source and rights and confirm all selected artwork can be used in this commercial library.</label>
 <label class="visual-check"><input name="ready" type="checkbox"> Mark ready for use after this review. Leave unchecked to save as a draft.</label>
 <div class="visual-actions"><button type="submit" class="primary" data-save>Save selected strands to GitHub</button><button type="button" data-new>Start another visual</button></div>
 <div data-result></div>
 <details><summary>Library creation guide</summary><pre data-guide></pre><a href="https://github.com/appliedbhp/visual-supports/blob/main/CREATING-VISUALS.md" target="_blank" rel="noopener noreferrer">Read the guide on GitHub ↗</a></details>
 </form>`;
 const q=selector=>host.querySelector(selector),form=q('[data-form]'),field=name=>form.elements.namedItem(name);
 let catalog=[],variants=new Map(),activeAge='',busy=false,sessionRevision=0,canWrite=false;
 const selectedAges=()=>[...q('[data-age-options]').querySelectorAll('input:checked')].map(input=>input.value);
 function variant(age=activeAge){
  if(!variants.has(age))variants.set(age,{id:crypto.randomUUID(),image:null,prompt:'',alt:'',source:'',reviewed:false,ready:false,published:false,url:''});
  return variants.get(age);
 }
 function storeReview(){
  if(!activeAge)return;
  const current=variant();
  current.alt=field('alt_text').value;current.source=field('source').value;
  current.reviewed=field('reviewed').checked;current.ready=field('ready').checked;
 }
 function renderVariant(){
  const current=activeAge?variant():null;
  field('alt_text').value=current?.alt||'';field('source').value=current?.source||'';
  field('reviewed').checked=current?.reviewed||false;field('ready').checked=current?.ready||false;
  q('[data-preview]').hidden=!current?.image;
  q('[data-preview] img').removeAttribute('src');
  if(current?.image)q('[data-preview] img').src='data:image/png;base64,'+current.image;
  q('[data-image-prompt]').textContent=current?.prompt||'Record the instructions used to create this uploaded image in Creation prompt.';
  q('[data-regenerate]').disabled=!activeAge||!current?.image||current.published||q('[data-generate]').disabled;
  q('[data-result]').replaceChildren();
  for(const age of selectedAges()){
   const saved=variant(age);
   if(!saved.published)continue;
   const line=document.createElement('p'),link=document.createElement('a');
   link.href=saved.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Ages '+age+' · View saved visual ↗';
   line.append(link);q('[data-result]').append(line);
  }
 }
 function syncAges(){
  storeReview();
  const ages=selectedAges();
  if(!ages.includes(activeAge))activeAge=ages[0]||'';
  q('[data-active-age]').replaceChildren(...ages.map(age=>new Option('Ages '+age,age)));
  q('[data-active-age]').value=activeAge;
  renderVariant();matches();
 }
 q('[data-active-age]').onchange=()=>{storeReview();activeAge=q('[data-active-age]').value;renderVariant();};
 const say=text=>{q('[data-status]').textContent=text;};
 function reviewed(all=false){
  if(all){for(const current of variants.values()){current.reviewed=false;current.ready=false;}}
  field('reviewed').checked=false;field('ready').checked=false;field('rights_confirmed').checked=false;
 }
 function showImage(age,base64,prompt,source){
  const current=variant(age);Object.assign(current,{image:base64,prompt,source,reviewed:false,ready:false});
  if(age===activeAge)renderVariant();
 }
 async function call(body){
  const client=await accountClient();
  const {data,error}=await client.functions.invoke('routines-visual-library',{body});
  if(error){
   let details;
   try{details=await error.context?.json();}catch{}
   throw Error(details?.error||'Could not reach the visual library. Check your sign-in and connection.');
  }
  if(data?.error)throw Error(data.error);
  return data;
 }
 function run(action){return async()=>{
  if(busy)return;
  const revision=sessionRevision;busy=true;form.inert=true;q('[data-connect]').disabled=true;
  try{await action(revision);}catch(error){if(revision===sessionRevision)say(error.message||'This action could not finish.');}
  finally{busy=false;form.inert=false;q('[data-connect]').disabled=false;}
 };}
 function matches(){
  const title=field('title').value.trim().toLowerCase(),ages=selectedAges(),category=field('category').value;
  const found=catalog.filter(row=>ages.includes(row.age_strand)&&row.category===category&&(!title||[row.title,...row.keywords||[]].join(' ').toLowerCase().includes(title))).slice(0,8);
  const target=q('[data-matches]');target.replaceChildren();
  if(!found.length){target.textContent='No matching entries in the selected age strands and category.';return;}
  const heading=document.createElement('p');heading.textContent='Check existing entries before creating a new visual.';target.append(heading);
  for(const row of found){
   const item=document.createElement('p');item.textContent=row.title+' · Ages '+row.age_strand+' · '+row.status;
   if(row.assets?.[0]){
    const link=document.createElement('a');link.textContent='View artwork ↗';link.href='https://github.com/appliedbhp/visual-supports/blob/main/'+row.assets[0];link.target='_blank';link.rel='noopener noreferrer';item.append(' ',link);
   }
   target.append(item);
  }
 }
 q('[data-connect]').onclick=run(async revision=>{
  say('Connecting to the visual library…');
  const result=await call({action:'status'});
  if(revision!==sessionRevision)return;
  catalog=result.catalog;
  field('category').replaceChildren(...result.categories.map(row=>new Option(row.name,row.id)));
  q('[data-age-options]').replaceChildren(...result.ages.map((row,index)=>{
   const label=document.createElement('label'),input=document.createElement('input');
   input.type='checkbox';input.value=row.id;input.name='age_strands';input.defaultChecked=index===0;
   input.onchange=syncAges;label.append(input,' Ages '+row.id);return label;
  }));
  canWrite=result.write_available;
  q('[data-guide]').textContent=result.guide;
  q('[data-generation-note]').textContent=result.generation_available?'Image generation is connected. One image is generated per selected age strand using your OpenAI API account.':'Add ROUTINES_OPENAI_KEY in Supabase to enable image generation. You can also upload your artwork.';
  q('[data-generate]').disabled=!result.generation_available;
  q('[data-save]').disabled=!result.write_available;
  say(result.write_available?'Library connected. Choose a concept and check existing entries.':'The GitHub token can read this library but needs Contents write access to publish.');
  form.hidden=false;syncAges();
 });
 for(const name of ['title','category'])field(name).addEventListener('input',matches);
 q('[data-prompt]').onclick=()=>{
  const action=field('action').value.trim()||field('title').value.trim();
  if(!action){say('Describe the action or enter a title first.');return;}
  const style={illustration:'Mature editorial illustration with thin, confident dark contours and flat solid colors.', 'simple-symbol':'A simple, uncluttered pictogram with clear shapes and strong contrast.',photo:'A clear photographic-style image with only the essential subject and props.'}[field('style').value];
  field('generation_prompt').value='Create one standalone square visual support. Action: '+action+' Age strand: {{age_strand}}. '+style+' Use an age-respectful, race-neutral and gender-neutral abstract character when a person is needed. Keep the action easy to recognize at small size. Center the whole action with generous margins and essential props fully visible. Use a genuinely transparent background. Use clear contrast and meaning that does not depend on color alone. No text, letters, numbers, logos, borders, card layouts, or identifying personal information. For illustration or symbol styles, use a restrained palette of ink #24243B, white, lavender #A78BFA, blue #4C8DFF, teal #2CC6B0, yellow #FFD447, and coral #FF6B6B; avoid gradients and shadows.';
  reviewed(true);say('Prompt built. {{age_strand}} will be replaced for each selected strand.');
 };
 function promptFor(age){
  const template=field('generation_prompt').value.trim();
  if(!template)throw Error('Build or enter a creation prompt first.');
  const prompt=template.includes('{{age_strand}}')?template.replaceAll('{{age_strand}}',age):template+' Age strand: '+age+'.';
  return prompt+' Adapt proportions, clothing, and presentation respectfully for ages '+age+' while keeping the concept consistent across the series.';
 }
 async function generateAge(age,revision){
  const result=await call({action:'generate',prompt:promptFor(age)});
  if(revision!==sessionRevision)return;
  showImage(age,result.image,result.prompt,result.source);
 }
 q('[data-generate]').onclick=run(async revision=>{
  storeReview();
  const ages=selectedAges();
  if(!ages.length)throw Error('Select at least one age strand.');
  const missing=ages.filter(age=>!variant(age).image&&!variant(age).published);
  if(!missing.length)throw Error('The selected strands already have artwork. Choose a strand and use Regenerate this strand if needed.');
  const failed=[];
  for(const age of missing){
   if(revision!==sessionRevision)return;
   say('Generating ages '+age+'. Each selected strand gets a separate image…');
   try{await generateAge(age,revision);}catch(error){failed.push('Ages '+age+': '+error.message);}
  }
  if(revision!==sessionRevision)return;
  renderVariant();
  say(failed.length?failed.join(' ')+' Choose Generate selected strands to retry missing images.':'Images ready. Use Reviewing visual to describe and review each strand before saving.');
 });
 q('[data-regenerate]').onclick=run(async revision=>{
  storeReview();
  if(!activeAge||variant().published)throw Error('Choose an unsaved strand to regenerate.');
  if(!confirm('Generate a new image for ages '+activeAge+'? This uses your OpenAI API account and replaces its current preview.'))return;
  say('Regenerating ages '+activeAge+'…');await generateAge(activeAge,revision);
  if(revision===sessionRevision)say('New preview ready. Review this strand again before saving.');
 });
 q('[data-upload]').onchange=run(async revision=>{
  storeReview();
  if(!activeAge)throw Error('Select an age strand for this upload.');
  if(variant().published)throw Error('This strand is already saved. Start another visual to upload different artwork.');
  const file=q('[data-upload]').files[0];if(!file)return;
  if(file.type!=='image/png'||file.size>6*1024*1024)throw Error('Choose a square PNG smaller than 6 MB.');
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read the image.'));reader.readAsDataURL(file);});
  const dimensions=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve([img.naturalWidth,img.naturalHeight]);img.onerror=()=>reject(Error('Invalid PNG image.'));img.src=data;});
  if(dimensions[0]!==dimensions[1]||dimensions[0]>4096)throw Error('Choose a square PNG up to 4096 × 4096.');
  if(revision!==sessionRevision)return;
  showImage(activeAge,String(data).split(',')[1],promptFor(activeAge),'Uploaded original artwork');
  say('Artwork loaded. Record its creation prompt, source, and rights before publishing.');
 });
 form.addEventListener('input',event=>{
  if(['reviewed','rights_confirmed','ready','age_strands'].includes(event.target.name)||event.target===q('[data-active-age]'))return;
  reviewed(!['alt_text','source'].includes(event.target.name));
 });
 form.onsubmit=event=>{
  event.preventDefault();
  run(async revision=>{
   storeReview();
   const ages=selectedAges();
   if(!ages.length)throw Error('Select at least one age strand.');
   if(!canWrite)throw Error('The GitHub token needs write access.');
   const values=Object.fromEntries(new FormData(form));
   for(const age of ages){
    const current=variant(age);
    if(current.published)continue;
    if(!current.image||!current.alt.trim()||!current.source.trim()||!current.reviewed)throw Error('Add an image, description, source, and review for ages '+age+'. Use Reviewing visual to switch strands.');
   }
   if(!field('rights_confirmed').checked)throw Error('Confirm the usage rights for the selected artwork.');
   for(const age of ages){
    const current=variant(age);
    if(current.published)continue;
    say('Saving ages '+age+' to GitHub…');
    const result=await call({...values,action:'publish',age_strand:age,id:current.id,image:current.image,generation_prompt:current.prompt||promptFor(age),alt_text:current.alt,source:current.source,reviewed:current.reviewed,rights_confirmed:true,ready:current.ready});
    if(revision!==sessionRevision)return;
    current.published=true;current.url=result.url;renderVariant();
   }
   say('All selected strands saved with their own artwork, prompt, and catalog entry.');
  })();
 };
 function reset(){
  form.reset();variants.clear();activeAge='';q('[data-result]').replaceChildren();q('[data-upload]').value='';syncAges();
 }
 q('[data-new]').onclick=()=>{
  storeReview();
  if([...variants.values()].some(current=>current.image&&!current.published)&&!confirm('Discard the unsaved visuals and start another set?'))return;
  reset();q('[data-save]').disabled=!canWrite;say('Ready for another set of visuals.');
 };
 const clear=()=>{
  sessionRevision++;reset();form.hidden=true;catalog=[];say('');
 };
 addEventListener('board-cloud-signedout',clear);
 addEventListener('storage',event=>{if(event.key==='routines.cloud.auth.v1')clear();});
}
