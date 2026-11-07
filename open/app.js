import * as Local from '../js/local-files.js';
await import('../js/audience.js');
globalThis.ABHPFileScriptURL=new URL('../js/abhp-files.js',import.meta.url).href;
await import(globalThis.ABHPFileScriptURL);
const el=id=>document.getElementById(id);
globalThis.ABHPPageOpen=async files=>{
 const status=el('openStatus');
 if(files.length!==1){status.textContent='Choose one saved file at a time.';return;}
 status.textContent='Opening…';
 try{await ABHPFiles.route(files[0]);}catch(e){status.textContent=e instanceof SyntaxError?'This is not a readable ABHP or JSON file.':e.message;}
};
el('openFile').onchange=e=>{if(e.target.files.length)ABHPPageOpen(e.target.files);e.target.value='';};
if('launchQueue' in window)launchQueue.setConsumer(async p=>{try{if(p.files.length)await ABHPPageOpen([await p.files[0].getFile()]);}catch(e){el('openStatus').textContent=e.message;}});
let revision=0,currentFolder=null,shownAccount=null;
function item(list,title,action){const li=document.createElement('li'),name=document.createElement('span'),button=document.createElement('button');name.textContent=title;button.type='button';button.textContent='Open';button.setAttribute('aria-label','Open '+title);button.onclick=async()=>{button.disabled=true;try{await action();}catch(e){el('openStatus').textContent=e.message;}finally{button.disabled=false;}};li.append(name,button);list.append(li);}
async function refresh(){
 const run=++revision,id=Local.accountId(),valid=()=>run===revision&&id===Local.accountId();
 shownAccount=id;el('cloudFiles').replaceChildren();el('computerFiles').replaceChildren();currentFolder=null;
 el('signInNotice').hidden=!!id;el('chooseFolder').hidden=!id||!Local.supported();el('allowFolder').hidden=true;
 el('cloudStatus').textContent=id?'Loading cloud files…':'Sign in to see your cloud boards.';
 el('computerStatus').textContent=id?'Loading your folder…':'Sign in to use your chosen computer folder.';
 if(!id)return;
 const cloud=async()=>{try{
  if(!globalThis.CloudBoardUI){el('cloudStatus').textContent='Cloud files are loading. If they do not appear, check your connection and select Refresh.';return;}
  const result=await CloudBoardUI.list();if(!valid())return;
  el('cloudStatus').textContent=!result.signedIn?'Sign in again to see your cloud files.':result.rows.length?`${result.rows.length} of ${result.limit||2} cloud boards`:'No cloud boards saved yet. Use File → Save as in a tool.';
  for(const row of result.rows)item(el('cloudFiles'),row.payload.board?.title||row.payload.routine?.name||row.payload.chart?.name||'Untitled',async()=>{if(!valid())throw Error('Your account changed. Refresh your files.');await CloudBoardUI.open(row);});
 }catch(e){if(valid())el('cloudStatus').textContent='Cloud files are unavailable. Check your connection and try Refresh.';}};
 const computer=async()=>{try{
  if(!Local.supported()){el('computerStatus').textContent='This browser cannot list a computer folder. Use Choose a file or drag and drop above.';return;}
  const dir=await Local.folder();if(!valid())return;currentFolder=dir;
  if(!dir){el('computerStatus').textContent='Choose the folder where you keep your ABHP files. This also becomes your save folder in Storage settings.';return;}
  el('chooseFolder').textContent='Change folder';
  if(await dir.queryPermission({mode:'read'})!=='granted'){if(valid()){el('computerStatus').textContent=`Allow access to “${dir.name}” to list its files.`;el('allowFolder').hidden=false;}return;}
  const files=[];let truncated=false;
  for await(const handle of dir.values()){if(!valid())return;if(handle.kind==='file'&&/\.(abhp|json)$/i.test(handle.name)){if(files.length===200){truncated=true;break;}files.push(handle);}}
  if(!valid())return;files.sort((a,b)=>a.name.localeCompare(b.name));
  el('computerStatus').textContent=`${dir.name} · ${files.length} saved files${truncated?' (first 200 shown)':''}`;
  for(const handle of files)item(el('computerFiles'),handle.name,async()=>{if(!valid())throw Error('Your account changed. Refresh your files.');const file=await handle.getFile();if(!valid())throw Error('Your account changed. Refresh your files.');await ABHPPageOpen([file]);});
 }catch(e){if(valid())el('computerStatus').textContent='Folder could not be opened. Choose it again, or drag a file above.';}};
 await Promise.allSettled([cloud(),computer()]);
}
el('refreshFiles').onclick=refresh;
el('chooseFolder').onclick=async()=>{try{await Local.choose();await refresh();}catch(e){if(e.name!=='AbortError')el('computerStatus').textContent=e.message;}};
el('allowFolder').onclick=async()=>{const dir=currentFolder;try{if(dir)await dir.requestPermission({mode:'read'});await refresh();}catch(e){el('computerStatus').textContent=e.message;}};
addEventListener('routines-cloud-ready',refresh);
addEventListener('routines-account-signed-in',()=>{if(Local.accountId()!==shownAccount)refresh();});
addEventListener('board-cloud-signedout',()=>{revision++;el('cloudFiles').replaceChildren();el('computerFiles').replaceChildren();setTimeout(refresh,0);});
addEventListener('storage',refresh);
addEventListener('focus',refresh);
refresh();
