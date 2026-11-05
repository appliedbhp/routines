import {accountClient} from '../cloud/client.js';
const host=document.getElementById('visualLibrary');
if(host){
 host.innerHTML=`<h2>Visual library</h2><p>Create original artwork and save it with its prompt to <a href="https://github.com/appliedbhp/visual-supports" target="_blank" rel="noopener noreferrer">visual-supports ↗</a>.</p>
 <button type="button" data-connect>Open visual creator</button><p data-status role="status"></p>
 <form data-form hidden>
 <div class="visual-fields">
 <label>Title<input name="title" maxlength="100" required></label>
 <label>Age strand<select name="age_strand" required></select></label>
 <label>Category<select name="category" required></select></label>
 <label>Style<select name="style"><option value="illustration">Editorial illustration</option><option value="simple-symbol">Simple symbol</option><option value="photo">Photo style</option></select></label>
 </div>
 <div data-matches class="visual-matches" aria-live="polite"></div>
 <label>Action and essential props<textarea name="action" maxlength="3000" rows="3" placeholder="For example, a figure puts a homework folder into an open backpack."></textarea></label>
 <button type="button" data-prompt>Build creation prompt</button>
 <label>Creation prompt<textarea name="generation_prompt" maxlength="12000" rows="7" required></textarea></label>
 <div class="visual-actions"><button type="button" data-generate>Generate image</button><label>Or upload your artwork (square PNG, up to 6 MB)<input data-upload type="file" accept="image/png"></label></div>
 <p data-generation-note></p>
 <figure data-preview hidden><img alt="Artwork preview"><figcaption>Review the action, representation, transparency, and print quality.</figcaption><details><summary>Prompt used for this image</summary><pre data-image-prompt></pre></details></figure>
 <label>Image description (alt text)<textarea name="alt_text" maxlength="1000" rows="2" required></textarea></label>
 <label>Keywords (separated by commas)<input name="keywords" maxlength="500" required></label>
 <label>Creation or source information<input name="source" maxlength="500" required placeholder="How this artwork was created"></label>
 <label>Usage rights<textarea name="usage_rights" maxlength="1500" rows="2" required placeholder="Describe the rights you hold and any applicable terms or attribution."></textarea></label>
 <label class="visual-check"><input name="reviewed" type="checkbox" required> I reviewed the artwork for clear meaning, respectful representation, legibility, and print quality.</label>
 <label class="visual-check"><input name="rights_confirmed" type="checkbox" required> I checked the source and rights and confirm this artwork can be used in this commercial library.</label>
 <label class="visual-check"><input name="ready" type="checkbox"> Mark ready for use after this review. Leave unchecked to save as a draft.</label>
 <div class="visual-actions"><button type="submit" class="primary" data-save>Save artwork and prompt to GitHub</button><button type="button" data-new>Start another visual</button></div>
 <div data-result></div>
 <details><summary>Library creation guide</summary><pre data-guide></pre><a href="https://github.com/appliedbhp/visual-supports/blob/main/CREATING-VISUALS.md" target="_blank" rel="noopener noreferrer">Read the guide on GitHub ↗</a></details>
 </form>`;
 const q=selector=>host.querySelector(selector),form=q('[data-form]'),field=name=>form.elements.namedItem(name);
 let catalog=[],image=null,imagePrompt='',id=crypto.randomUUID(),busy=false,published=false,sessionRevision=0;
 const say=text=>{q('[data-status]').textContent=text;};
 function reviewed(){field('reviewed').checked=false;field('rights_confirmed').checked=false;field('ready').checked=false;}
 function resetImage(){
  image=null;imagePrompt='';q('[data-preview]').hidden=true;q('[data-preview] img').removeAttribute('src');reviewed();
 }
 function showImage(base64,prompt,source){
  image=base64;imagePrompt=prompt;q('[data-image-prompt]').textContent=prompt||'Record the instructions used to create this uploaded image in Creation prompt.';
  q('[data-preview] img').src='data:image/png;base64,'+base64;
  q('[data-preview]').hidden=false;field('source').value=source;reviewed();
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
  const title=field('title').value.trim().toLowerCase(),age=field('age_strand').value,category=field('category').value;
  const found=catalog.filter(row=>row.age_strand===age&&row.category===category&&(!title||[row.title,...row.keywords||[]].join(' ').toLowerCase().includes(title))).slice(0,8);
  const target=q('[data-matches]');target.replaceChildren();
  if(!found.length){target.textContent='No matching entries in this age strand and category.';return;}
  const heading=document.createElement('p');heading.textContent='Check existing entries before creating a new visual.';target.append(heading);
  for(const row of found){
   const item=document.createElement('p');item.textContent=row.title+' · '+row.status;
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
  for(const name of ['category','age_strand']){
   const rows=name==='category'?result.categories:result.ages;
   field(name).replaceChildren(...rows.map(row=>new Option(row.name||'Ages '+row.id,row.id)));
  }
  q('[data-guide]').textContent=result.guide;
  q('[data-generation-note]').textContent=result.generation_available?'Image generation is connected. Each generation uses your OpenAI API account.':'Add ROUTINES_OPENAI_KEY in Supabase to enable image generation. You can also upload your artwork.';
  q('[data-generate]').disabled=!result.generation_available;
  q('[data-save]').disabled=!result.write_available;
  say(result.write_available?'Library connected. Choose a concept and check existing entries.':'The GitHub token can read this library but needs Contents write access to publish.');
  form.hidden=false;matches();
 });
 for(const name of ['title','age_strand','category'])field(name).addEventListener('input',matches);
 q('[data-prompt]').onclick=()=>{
  const action=field('action').value.trim()||field('title').value.trim();
  if(!action){say('Describe the action or enter a title first.');return;}
  const style={illustration:'Mature editorial illustration with thin, confident dark contours and flat solid colors.', 'simple-symbol':'A simple, uncluttered pictogram with clear shapes and strong contrast.',photo:'A clear photographic-style image with only the essential subject and props.'}[field('style').value];
  field('generation_prompt').value='Create one standalone square visual support. Action: '+action+' Age strand: '+field('age_strand').value+'. '+style+' Use an age-respectful, race-neutral and gender-neutral abstract character when a person is needed. Keep the action easy to recognize at small size. Center the whole action with generous margins and essential props fully visible. Use a genuinely transparent background. Use clear contrast and meaning that does not depend on color alone. No text, letters, numbers, logos, borders, card layouts, or identifying personal information. For illustration or symbol styles, use a restrained palette of ink #24243B, white, lavender #A78BFA, blue #4C8DFF, teal #2CC6B0, yellow #FFD447, and coral #FF6B6B; avoid gradients and shadows.';
  say('Prompt built. Edit it as needed before generating.');
 };
 q('[data-generate]').onclick=run(async revision=>{
  if(published)throw Error('Start another visual before generating new artwork.');
  const prompt=field('generation_prompt').value.trim();
  if(!prompt)throw Error('Build or enter a creation prompt first.');
  say('Generating your visual. This may take a minute or two…');
  const result=await call({action:'generate',prompt});
  if(revision!==sessionRevision)return;
  showImage(result.image,result.prompt,result.source);
  say('Image ready for review. Add its description, keywords, and usage rights.');
 });
 q('[data-upload]').onchange=run(async revision=>{
  if(published)throw Error('Start another visual before uploading new artwork.');
  const file=q('[data-upload]').files[0];if(!file)return;
  if(file.type!=='image/png'||file.size>6*1024*1024)throw Error('Choose a square PNG smaller than 6 MB.');
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read the image.'));reader.readAsDataURL(file);});
  const dimensions=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve([img.naturalWidth,img.naturalHeight]);img.onerror=()=>reject(Error('Invalid PNG image.'));img.src=data;});
  if(dimensions[0]!==dimensions[1]||dimensions[0]>4096)throw Error('Choose a square PNG up to 4096 × 4096.');
  if(revision!==sessionRevision)return;
  showImage(String(data).split(',')[1],field('generation_prompt').value.trim(),'Uploaded original artwork');
  say('Artwork loaded. Record its creation prompt, source, and rights before publishing.');
 });
 form.addEventListener('input',event=>{if(!['reviewed','rights_confirmed','ready'].includes(event.target.name))reviewed();});
 form.onsubmit=event=>{
  event.preventDefault();
  run(async revision=>{
   if(published)throw Error('This visual is already saved. Start another visual to create a new one.');
   if(!image)throw Error('Generate or upload an image first.');
   const values=Object.fromEntries(new FormData(form));
   const prompt=imagePrompt||values.generation_prompt;
   if(!prompt)throw Error('Record the prompt or instructions used to create this image.');
   say('Saving artwork, metadata, and prompt to GitHub…');
   const result=await call({...values,action:'publish',id,image,generation_prompt:prompt,reviewed:field('reviewed').checked,rights_confirmed:field('rights_confirmed').checked,ready:field('ready').checked});
   if(revision!==sessionRevision)return;
   published=true;q('[data-save]').disabled=true;
   const link=document.createElement('a');link.href=result.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View the saved visual on GitHub ↗';q('[data-result]').replaceChildren(link);
   say('Saved to the visual library with its artwork, creation prompt, and catalog entry.');
  })();
 };
 q('[data-new]').onclick=()=>{
  if(image&&!published&&!confirm('Discard this unsaved visual and start another?'))return;
  form.reset();resetImage();id=crypto.randomUUID();published=false;q('[data-save]').disabled=false;q('[data-result]').replaceChildren();q('[data-upload]').value='';matches();say('Ready for another visual.');
 };
 const clear=()=>{
  sessionRevision++;form.reset();resetImage();form.hidden=true;catalog=[];id=crypto.randomUUID();published=false;q('[data-result]').replaceChildren();say('');
 };
 addEventListener('board-cloud-signedout',clear);
 addEventListener('storage',event=>{if(event.key==='routines.cloud.auth.v1')clear();});
}
