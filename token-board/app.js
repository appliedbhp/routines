let tokenBoard=TokenData.defaults();
let tokenMode='edit';
let printing=false;
let savedTokenId=null;
let selectedToken=null;
const tokenKey='routineVisualTimer.tokenBoards.v2';
const $=id=>document.getElementById(id);
const announce=message=>{$('status').textContent=message;};
const picker=$('tokenPicker');
function picture(icon,projection=false){
 const image=document.createElement('img');image.src=TokenData.url(icon,projection&&!printing&&tokenMode==='run'&&tokenBoard.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches);image.alt='';image.dataset.source=icon.source;
 image.onerror=()=>{image.hidden=true;const fallback=document.createElement('span');fallback.textContent=icon.label;image.after(fallback);};return image;
}
function tone(complete){
 if(!tokenBoard.sound)return;
 try{const Audio=window.AudioContext||window.webkitAudioContext;const audio=new Audio();const osc=audio.createOscillator();const gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.frequency.value=complete?880:660;gain.gain.setValueAtTime(.08,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.25);osc.start();osc.stop(audio.currentTime+.25);osc.onended=()=>audio.close();}catch{}
}
function renderTokens(focusIndex){
 const theme=TokenData.themes[tokenBoard.theme];
 for(const [key,value] of Object.entries(theme))$('tokenSheet').style.setProperty(`--theme-${key}`,value);
 $('exitSession').hidden=tokenMode!=='run';$('tokenSheet').dataset.theme=tokenBoard.theme;
 const earned=tokenBoard.tokens.filter(t=>t.earned).length;
 $('printTitle').textContent=tokenBoard.title||'My token board';$('rewardLabel').textContent=tokenBoard.reward||'Your chosen reward';
 $('progress').textContent=`${earned} of ${tokenBoard.tokens.length} tokens earned`;
 $('celebration').hidden=earned!==tokenBoard.tokens.length;
 $('tokenSheet').style.setProperty('--token-font',tokenBoard.font);$('tokenSheet').style.setProperty('--token-color',tokenBoard.color);
 $('tokens').style.setProperty('--token-columns',Math.min(5,tokenBoard.tokens.length));$('tokens').replaceChildren();
 tokenBoard.tokens.forEach((token,index)=>{
  const button=document.createElement('button');button.className='token-slot'+(token.earned?' earned':'');button.type='button';
  button.setAttribute('aria-label',tokenMode==='edit'?`Change token ${index+1} picture: ${token.icon.label}`:`${token.earned?'Undo':'Earn'} token ${index+1}: ${token.icon.label}`);
  if(tokenMode==='run')button.setAttribute('aria-pressed',String(token.earned));
  const number=document.createElement('span');number.className='token-number';number.textContent=index+1;
  button.append(picture(token.icon,true),number);
  if(token.earned){const mark=document.createElement('span');mark.className='earned-mark';mark.textContent='✓';mark.setAttribute('aria-hidden','true');button.append(mark);}
  button.onclick=()=>{if(tokenMode==='edit')openPicker(index);else{token.earned=!token.earned;const complete=tokenBoard.tokens.every(t=>t.earned);if(token.earned)tone(complete);renderTokens(index);if(token.earned)celebrate(index,complete);}};
  $('tokens').append(button);
 });
 $('rewardPicture').replaceChildren(picture(tokenBoard.rewardIcon,true));$('rewardPicture').disabled=tokenMode==='run';
 document.body.classList.toggle('token-run',tokenMode==='run');
 for(const mode of ['edit','run']){$(`${mode}Mode`).setAttribute('aria-pressed',String(tokenMode===mode));$(`${mode}Mode`).classList.toggle('primary',tokenMode===mode);}
 $('modeHint').textContent=tokenMode==='edit'?'Edit: choose a token or the reward picture to change it.':'Session: click or tap a token to award it. Tap an earned token to undo a mistake. Save board to keep progress.';
 renderCredit($('boardCredit'),[tokenBoard.rewardIcon,...tokenBoard.tokens.map(t=>t.icon)]);
 $('cutoutPages').replaceChildren();
 for(let i=0;i<tokenBoard.extraSets;i++){
  const page=document.createElement('section');page.className='cutout-page';page.setAttribute('aria-label',`Cut-out token set ${i+1}`);
  const title=document.createElement('h2');title.textContent=`Cut-out tokens · Set ${i+1}`;
  const hint=document.createElement('p');hint.textContent='Cut along the dashed lines. Add each token to the board as it is earned.';
  const grid=document.createElement('div');grid.className='token-grid';grid.style.setProperty('--token-columns',Math.min(5,tokenBoard.tokens.length));
  tokenBoard.tokens.forEach(token=>{const slot=document.createElement('div');slot.className='token-slot';slot.append(picture(token.icon));grid.append(slot);});
  const credit=document.createElement('footer');credit.className='token-credit';renderCredit(credit,tokenBoard.tokens.map(t=>t.icon));page.append(title,hint,grid,credit);$('cutoutPages').append(page);
 }
 fitProjection();
 if(Number.isInteger(focusIndex)&&focusIndex>=0)$('tokens').children[focusIndex]?.focus();
}
function sync(){
 $('boardTheme').value=tokenBoard.theme;$('motion').checked=tokenBoard.motion;
 $('boardTitle').value=tokenBoard.title;$('rewardText').value=tokenBoard.reward;$('tokenCount').value=tokenBoard.tokens.length;$('extraSets').value=tokenBoard.extraSets;$('boardFont').value=tokenBoard.font;$('textColor').value=tokenBoard.color;$('sound').checked=tokenBoard.sound;renderTokens();
}
for(let i=1;i<=12;i++)$('tokenCount').append(new Option(i,i));

Object.entries(TokenData.themes).forEach(([key,t])=>$('boardTheme').append(new Option(t.name,key)));
$('boardTheme').onchange=()=>{tokenBoard.theme=$('boardTheme').value;Object.assign(tokenBoard,{font:TokenData.themes[tokenBoard.theme].font,color:TokenData.themes[tokenBoard.theme].color});sync();};
$('motion').onchange=()=>{tokenBoard.motion=$('motion').checked;renderTokens();};
TokenData.fonts.forEach(font=>$('boardFont').append(new Option(font,font)));
for(const [id,key] of [['boardTitle','title'],['rewardText','reward'],['boardFont','font'],['textColor','color']])$(id).oninput=()=>{tokenBoard[key]=$(id).value;renderTokens();};
$('tokenCount').onchange=()=>{const count=Number($('tokenCount').value);while(tokenBoard.tokens.length<count)tokenBoard.tokens.push({icon:tokenBoard.tokens[0].icon,earned:false});tokenBoard.tokens.length=count;renderTokens();};
$('extraSets').onchange=()=>{tokenBoard.extraSets=Number($('extraSets').value);renderTokens();};
$('sound').onchange=()=>{tokenBoard.sound=$('sound').checked;};
$('editMode').onclick=endSession;$('runMode').onclick=startSession;$('exitSession').onclick=endSession;
$('resetTokens').onclick=()=>{tokenBoard.tokens.forEach(t=>t.earned=false);renderTokens();announce('Tokens reset. Your pictures and reward are unchanged.');};
$('rewardPicture').onclick=()=>openPicker(-1);
function renderCredit(element,icons){
 element.replaceChildren();
 for(const key of new Set(icons.map(icon=>icon.source==='dicebear'?`dicebear:${icon.style||'bottts'}`:icon.source))){const style=key.startsWith('dicebear:')?TokenCharacters.styles[key.split(':')[1]]:null;const [label,href]=style?[`${style.name} by ${style.creator} / DiceBear · ${style.license}`,style.licenseUrl]:TokenData.credits[key];const link=document.createElement('a');link.href=href;link.textContent=label;link.target='_blank';link.rel='noopener';if(element.childNodes.length)element.append(' · ');element.append(link);}
}
Object.entries(TokenData.sources).forEach(([key,name])=>$('pictureSource').append(new Option(name,key)));
Object.entries(TokenCharacters.styles).forEach(([key,s])=>$('characterStyle').append(new Option(s.name+(s.animated?' · animated':''),key)));
$('characterStyle').onchange=()=>{characterPage=0;renderLibrary();};
let searchRevision=0,characterPage=0;
function showChoices(icons){
 $('iconChoices').replaceChildren();
 icons.forEach(icon=>{const button=document.createElement('button');button.type='button';button.className='icon-choice';const name=document.createElement('span');name.textContent=icon.label;button.append(picture(icon),name);button.setAttribute('aria-label',`Use ${icon.label} picture`);button.onclick=()=>assign(icon);$('iconChoices').append(button);});
}
async function renderLibrary(){
 const revision=++searchRevision,source=$('pictureSource').value;
 $('characterStyle').hidden=$('characterStyleLabel').hidden=source!=='dicebear';
 $('searchForm').hidden=source==='dicebear';$('moreCharacters').hidden=source!=='dicebear';
 const style=TokenCharacters.styles[$('characterStyle').value];const [label,href]=source==='dicebear'?[`${style.name} by ${style.creator} · ${style.license}`,style.licenseUrl]:TokenData.credits[source];$('pickerCredit').textContent=label;$('pickerCredit').href=href;
 $('iconChoices').replaceChildren();$('pickerStatus').textContent='Loading pictures…';
 try{
  let icons;
  const query=$('pictureSearch').value.trim()||$('iconCategory').value;
  if(source==='dicebear')icons=Array.from({length:24},(_,i)=>({source,id:`robot-${characterPage*24+i+1}`,style:$('characterStyle').value,label:`${TokenCharacters.styles[$('characterStyle').value].name} ${characterPage*24+i+1}`}));
  else if(source==='material'&&!$('pictureSearch').value.trim()&&query==='star')icons=['star','favorite','redeem','emoji-events','pets','rocket-launch','menu-book','sports-soccer','brush','music-note','sunny','sentiment-satisfied'].map(id=>({source,id,label:id.replace(/-/g,' ')}));
  else {
   const url=source==='arasaac'?`https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(query)}`:`https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefix=${source==='material'?'material-symbols':'openmoji'}&limit=48`;
   const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Picture service unavailable');const result=await response.json();
   icons=source==='arasaac'?result.slice(0,48).map(item=>({source,id:String(item._id),label:(item.keywords?.[0]?.keyword||query).slice(0,100)})):(result.icons||[]).filter(id=>id.startsWith((source==='material'?'material-symbols':'openmoji')+':')).map(name=>({source,id:name.split(':')[1],label:name.split(':')[1].replace(/-/g,' ').slice(0,100)}));
  }
  if(revision!==searchRevision)return;
  showChoices(icons.map(TokenData.icon));$('pickerStatus').textContent=icons.length?`${icons.length} pictures. Choose one below.`:'No pictures found. Try another word.';
 }catch(error){if(revision===searchRevision)$('pickerStatus').textContent='Pictures could not load. Try again, or choose Characters for pictures available without a picture service.';}
}
function openPicker(index){selectedToken=index;$('applyAll').checked=false;$('applyAll').disabled=index===-1;$('pictureSearch').value='';renderLibrary();picker.showModal();}
function assign(value){const icon=TokenData.icon(value);if(selectedToken===-1)tokenBoard.rewardIcon=icon;else if($('applyAll').checked)tokenBoard.tokens.forEach(t=>t.icon={...icon});else tokenBoard.tokens[selectedToken].icon=icon;searchRevision++;picker.close();renderTokens(selectedToken);}
$('pictureSource').onchange=renderLibrary;$('iconCategory').onchange=()=>{$('pictureSearch').value='';renderLibrary();};
$('searchForm').onsubmit=event=>{event.preventDefault();renderLibrary();};$('moreCharacters').onclick=()=>{characterPage++;renderLibrary();};$('closePicker').onclick=()=>{searchRevision++;picker.close();};
function currentPayload(){return TokenData.serialize(tokenBoard);}
function library(){const saved=JSON.parse(localStorage.getItem(tokenKey)||'[]');if(!Array.isArray(saved)||saved.some(entry=>!entry||typeof entry.id!=='string'))throw new Error('Saved boards could not be read. Export your open board for a backup.');saved.forEach(entry=>TokenData.validate(entry.payload));return saved;}
function refresh(){const select=$('savedBoards');select.replaceChildren(new Option('Choose a saved board',''));try{library().forEach(entry=>select.append(new Option(entry.payload.board.title||'Untitled board',entry.id)));select.value=savedTokenId||'';}catch(error){announce(`Browser saving unavailable. ${error.message}`);}}
$('saveBoard').onclick=()=>{try{if(!tokenBoard.title.trim())throw new Error('Give the board a name first.');const saved=library();const id=savedTokenId||crypto.randomUUID();const entry={id,payload:currentPayload()};const index=saved.findIndex(item=>item.id===id);if(index<0)saved.push(entry);else saved[index]=entry;localStorage.setItem(tokenKey,JSON.stringify(saved));savedTokenId=id;refresh();announce('Board and progress saved in this browser.');}catch(error){announce(`Could not save: ${error.message}`);}};
$('loadBoard').onclick=()=>{try{const entry=library().find(item=>item.id===$('savedBoards').value);if(!entry)throw new Error('Choose a saved board first.');tokenBoard=TokenData.validate(entry.payload);savedTokenId=entry.id;tokenMode='edit';sync();announce('Board loaded. Choose Run session to continue.');}catch(error){announce(error.message);}};
$('deleteBoard').onclick=()=>{try{const saved=library();const id=$('savedBoards').value;const entry=saved.find(item=>item.id===id);if(!entry){announce('Choose a saved board first.');return;}if(!confirm(`Delete the saved copy of “${entry.payload.board.title}”? Your open board will stay on screen.`))return;localStorage.setItem(tokenKey,JSON.stringify(saved.filter(item=>item.id!==id)));if(savedTokenId===id)savedTokenId=null;refresh();announce('Saved copy deleted; the open board is unchanged.');}catch(error){announce(error.message);}};
$('exportBoard').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(currentPayload(),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`token-board-${tokenBoard.title.replace(/[^a-z0-9_-]+/gi,'-')||'board'}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Token board exported.');};
$('importBoard').onclick=()=>$('importFile').click();$('importFile').onchange=async()=>{const file=$('importFile').files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('Choose a file smaller than 1 MB.');const board=TokenData.validate(JSON.parse(await file.text()));tokenBoard=board;savedTokenId=null;$('savedBoards').value='';tokenMode='edit';sync();announce('Imported. Press Save board to keep it in this browser.');}catch(error){announce(`Could not import: ${error.message} Your open board is unchanged.`);}finally{$('importFile').value='';}};
$('printBoard').onclick=async()=>{const button=$('printBoard');button.disabled=true;try{await document.fonts.ready;await Promise.allSettled([...document.querySelectorAll('#tokenSheet img,#cutoutPages img')].map(img=>img.decode()));window.print();}finally{button.disabled=false;}};
let enteringFullscreen=false;
async function startSession(){
 tokenMode='run';renderTokens();$('exitSession').focus();
 enteringFullscreen=true;
 try{if(!document.fullscreenElement)await $('tokenSheet').requestFullscreen?.();}catch{/* A full-window presentation remains available when fullscreen is blocked. */}
 finally{enteringFullscreen=false;fitProjection();}
}
async function endSession(){
 tokenMode='edit';$('confetti').replaceChildren();renderTokens();
 try{if(document.fullscreenElement=== $('tokenSheet'))await document.exitFullscreen();}catch{}
 $('runMode').focus();
}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&tokenMode==='run'&&!enteringFullscreen)endSession();else fitProjection();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&tokenMode==='run')endSession();});
window.addEventListener('resize',fitProjection);
document.fonts.ready.then(fitProjection);
window.addEventListener('beforeprint',()=>{printing=true;renderTokens();});
window.addEventListener('afterprint',()=>{printing=false;renderTokens();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(tokenMode==='run')renderTokens();});
function fitProjection(){
 if(tokenMode!=='run')return;
 const sheet=$('tokenSheet'),width=sheet.clientWidth-48;
 const reserve=[$('printTitle'),$('progress'),sheet.querySelector('.reward-area'),$('boardCredit')].reduce((sum,node)=>sum+node.getBoundingClientRect().height,0)+130;
 const height=Math.max(90,sheet.clientHeight-reserve),count=tokenBoard.tokens.length;
 let best={size:0,cols:1};
 for(let cols=1;cols<=count;cols++){const rows=Math.ceil(count/cols),size=Math.min((width-(cols-1)*12)/cols,(height-(rows-1)*12)/rows,300);if(size>best.size)best={size,cols};}
 $('tokens').style.setProperty('--session-columns',best.cols);$('tokens').style.setProperty('--session-size',`${Math.max(36,Math.floor(best.size))}px`);
}
function celebrate(index,complete){
 if(!tokenBoard.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const host=$('confetti');host.replaceChildren();
 const origin=$('tokens').children[index].getBoundingClientRect(),bounds=$('tokenSheet').getBoundingClientRect();
 const count=complete?150:36,colors=['#ffcd38','#f064a1','#55c6f5','#a58aff','#64dca0'];
 for(let i=0;i<count;i++){
  const bit=document.createElement('i');bit.style.background=colors[i%colors.length];
  const x=complete?bounds.width*Math.random():origin.left-bounds.left+origin.width/2,y=complete?bounds.height*.2:origin.top-bounds.top+origin.height/2;
  bit.style.left=`${x}px`;bit.style.top=`${y}px`;host.append(bit);
  const dx=(Math.random()-.5)*(complete?bounds.width:300),dy=100+Math.random()*bounds.height*.6;
  const animation=bit.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${dx*.5}px,-${80+Math.random()*140}px) rotate(180deg)`,opacity:1,offset:.3},{transform:`translate(${dx}px,${dy}px) rotate(${500+Math.random()*400}deg)`,opacity:0}],{duration:complete?2600+Math.random()*1200:1000+Math.random()*600,easing:'ease-out'});
  animation.onfinish=()=>bit.remove();
 }
}
sync();refresh();
