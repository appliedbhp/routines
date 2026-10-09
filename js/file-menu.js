/* Shared File menu uses existing editors and their validated import/export functions. */
(async()=>{
 const root=new URL('../',document.currentScript.src);
 if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
 const exportButton=document.querySelector('#exportBoard,#exportChart,#exportRoutineBtn');if(!exportButton)return;
 async function load(path){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL(path,root);s.onload=resolve;s.onerror=reject;document.head.append(s);});}
 await load('js/file-store.js');if(!globalThis.CloudBoardAdapter)await load('cloud/adapter.js');
 const F=BoardFiles,A=CloudBoardAdapter,main=document.querySelector('main'),initial=await A.current(),currentType=F.type(initial);
 let target=null,baseline=JSON.stringify(initial),dirty=false,lastError='',checking=false;
 const bar=document.createElement('section');bar.className='file-bar no-print';bar.setAttribute('aria-label','Board menu');
 const menuRow=document.createElement('div');menuRow.className='file-menu-row';bar.append(menuRow);
 const documentRow=document.createElement('div');documentRow.className='file-document-row';bar.append(documentRow);
 const nameInput=document.querySelector('#boardTitle,#chartName,#routineNameInput,#setupName,#title');
 if(nameInput){const oldLabel=nameInput.closest('label');document.querySelector(`label[for="${nameInput.id}"]`)?.remove();if(oldLabel)oldLabel.remove();nameInput.setAttribute('aria-label','Board name');nameInput.placeholder='Name your board';documentRow.append(nameInput);}
 const saveState=document.createElement('span');saveState.className='file-save-state';saveState.setAttribute('role','status');documentRow.append(saveState);
 const offlineState=document.createElement('span');offlineState.className='file-offline-state';documentRow.append(offlineState);
 const title=main.querySelector(':scope > h1')||document.querySelector('.brand-app-title');
 const pageTitle=title||document.createElement('h1');
 pageTitle.textContent=document.querySelector('.workspace-sidebar a[aria-current="page"] .nav-label')?.textContent||pageTitle.textContent;
 pageTitle.classList.add('file-page-title');bar.prepend(pageTitle);main.prepend(bar);
 main.querySelectorAll(':scope > .intro, #routine-builder > .intro').forEach(el=>el.remove());
 function status(){saveState.textContent=lastError||(!target?'Unsaved board':dirty?(target.location==='cloud'&&!navigator.onLine?'Cloud unavailable · changes not synced':'Unsaved changes'):(target.location==='cloud'?`Saved to cloud · ${target.count} of 2 slots used`:'Saved on this device ✓'));}
 async function check(){if(checking)return;checking=true;try{dirty=JSON.stringify(await A.current())!==baseline;status();}catch{dirty=true;status();}finally{checking=false;}}
 async function adopted(t,payload){target=t;baseline=JSON.stringify(payload||await A.current());lastError='';await check();}
 function run(fn){return async()=>{try{lastError='';document.querySelectorAll('.file-error').forEach(el=>el.remove());await fn();await check();}catch(e){lastError=e.message||'That action could not finish.';status();const active=document.querySelector('.file-dialog[open]');if(active){const error=document.createElement('p');error.className='file-error';error.setAttribute('role','alert');error.textContent=lastError;active.append(error);}}};}
 function confirmReplace(){return !dirty||confirm('Replace the open board? Unsaved changes will be lost.');}
 function menu(label){const d=document.createElement('details');d.className='file-menu';const summary=document.createElement('summary');summary.textContent=label+' ▾';d.append(summary);const list=document.createElement('div');list.className='file-menu-items';d.append(list);menuRow.append(d);d.addEventListener('toggle',()=>{if(d.open)menuRow.querySelectorAll('details').forEach(other=>{if(other!==d)other.open=false;});});return {d,list};}
 function item(m,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=run(async()=>{m.d.open=false;await fn();});m.list.append(b);return b;}
 document.addEventListener('click',e=>{if(!menuRow.contains(e.target))menuRow.querySelectorAll('details').forEach(d=>d.open=false);});
 menuRow.addEventListener('keydown',e=>{if(e.key==='Escape'){const d=e.target.closest('details');if(d){d.open=false;d.querySelector('summary').focus();}}if(['ArrowDown','ArrowUp'].includes(e.key)){const d=e.target.closest('details');if(!d)return;d.open=true;const buttons=[...d.querySelectorAll('button')];const i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length]?.focus();e.preventDefault();}});
 function dialog(title){const d=document.createElement('dialog');d.className='file-dialog no-print';d.setAttribute('aria-label',title);const h=document.createElement('h2');h.textContent=title;const close=document.createElement('button');close.type='button';close.textContent='Close';close.className='file-close';close.onclick=()=>d.close();d.append(h,close);document.body.append(d);return d;}
 function button(parent,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=run(fn);parent.append(b);return b;}
 const saveDialog=dialog('Save board'),saveForm=document.createElement('form');saveForm.innerHTML='<label>Board name<input name="title" maxlength="100" required></label><label>Save to<select name="location"><option value="device">This device</option><option value="cloud">Cloud · two free slots</option></select></label><p>Device copies may include progress. Cloud copies contain reusable settings only and require a privacy review.</p><button type="submit">Save</button>';saveDialog.append(saveForm);
 function saveAs(){saveForm.elements.title.value=nameInput?.value||F.title(initial);saveForm.elements.location.value='device';saveDialog.showModal();saveForm.elements.title.focus();}
 saveForm.onsubmit=e=>{e.preventDefault();run(async()=>{const name=saveForm.elements.title.value.trim();F.rename(await A.current(),name);if(nameInput){nameInput.value=name;nameInput.dispatchEvent(new Event('input',{bubbles:true}));nameInput.dispatchEvent(new Event('change',{bubbles:true}));}const payload=F.rename(await A.current(),name);if(saveForm.elements.location.value==='cloud'){if(!globalThis.CloudBoardUI)throw Error('Cloud tools are still loading. Try again.');saveDialog.close();await CloudBoardUI.save();}else{const row=F.save(localStorage,payload);await adopted({...row,location:'device'},await A.current());saveDialog.close();}})();};
 async function save(){if(!target)return saveAs();if(nameInput){nameInput.value=nameInput.value.trim();nameInput.dispatchEvent(new Event('input',{bubbles:true}));}F.rename(await A.current(),nameInput?.value||F.title(await A.current()));if(target.location==='cloud'){if(!navigator.onLine)throw Error('Cloud unavailable · changes not synced. Use File → Save as → This device to keep a local copy.');await CloudBoardUI.save(target);}else{const payload=await A.current();const row=F.save(localStorage,payload,target.id,target.revision);await adopted({...row,location:'device'},payload);}}
 const library=dialog('Open board'),tabs=document.createElement('div');tabs.className='file-library-tabs';tabs.setAttribute('aria-label','Board locations');library.append(tabs);
 const libraryBody=document.createElement('div');libraryBody.className='file-library-body';library.append(libraryBody);
 let selectedTab='This device',libraryRevision=0;
 async function openLocal(row){if(!confirmReplace())return;const url=new URL(F.path(row.payload),root);if(url.pathname!==location.pathname.replace(/index\.html$/,'')){url.searchParams.set('deviceBoard',row.id);dirty=false;location.assign(url);return;}A.open(row.payload);await adopted({...row,location:'device'},await A.current());library.close();}
 function preview(payload){const tiles=document.createElement('div');tiles.className='file-mini-preview';tiles.setAttribute('aria-hidden','true');const b=payload.board||payload.chart||payload.routine;const list=b.cards||b.steps||b.chores||b.subjects||b.tokens||[{label:b.message}];for(const v of list.slice(0,4)){const tile=document.createElement('span');tile.textContent=v.label||v.name||v.icon?.label||'●';tiles.append(tile);}return tiles;}
 async function renderLibrary(tab=selectedTab){const revision=++libraryRevision;selectedTab=tab;libraryBody.replaceChildren();tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===tab)));
  if(tab==='Examples'){const hint=document.createElement('p');hint.textContent='Choose an example for this visual. Switch tools in the navigation pane for other examples.';libraryBody.append(hint);if(exampleSelect){const select=document.createElement('select');select.setAttribute('aria-label','Example board');for(const option of exampleSelect.options)select.append(new Option(option.text,option.value));libraryBody.append(select);button(libraryBody,'Open example',async()=>{if(!confirmReplace())return;exampleSelect.value=select.value;exampleButton.click();target=null;baseline=null;library.close();await check();});}else libraryBody.append(document.createTextNode('This tool starts with a ready-to-edit setup. Choose File → New to begin.'));return;}
  let rows;if(tab==='Cloud'){if(!navigator.onLine){libraryBody.textContent='Cloud boards need internet. Open a board from This device instead.';return;}const result=await CloudBoardUI.list();if(revision!==libraryRevision)return;if(!result.signedIn){libraryBody.textContent='Sign in to open your two free cloud boards.';button(libraryBody,'Sign in',()=>{library.close();CloudBoardUI.account();});return;}rows=result.rows;}else rows=F.list(localStorage);
  if(!rows.length){libraryBody.textContent=tab==='Cloud'?'No cloud boards yet. Use File → Save as → Cloud.':'No boards saved on this device yet. Use File → Save.';return;}
  for(const row of rows){const card=document.createElement('article');card.className='file-library-card';card.append(preview(row.payload));const h=document.createElement('h3');h.textContent=F.title(row.payload);card.append(h);const p=document.createElement('p');p.textContent=F.type(row.payload).replaceAll('-',' ')+' · '+((row.updatedAt||row.updated_at)?new Date(row.updatedAt||row.updated_at).toLocaleString():'Previously saved');card.append(p);
   button(card,'Open',async()=>{if(tab==='Cloud'){library.close();await CloudBoardUI.open(row);}else await openLocal(row);});const more=document.createElement('details');const summary=document.createElement('summary');summary.textContent='⋯';summary.setAttribute('aria-label','More actions for '+F.title(row.payload));more.append(summary);card.append(more);
   button(more,'Rename…',async()=>{const name=prompt('Board name',F.title(row.payload));if(name===null)return;const payload=F.rename(row.payload,name);if(tab==='Cloud'){library.close();await CloudBoardUI.rename(row,name);}else{const saved=F.save(localStorage,payload,row.id,row.revision);if(target?.location==='device'&&target.id===row.id&&target.type===row.type){target=saved;target.location='device';if(nameInput){nameInput.value=name;nameInput.dispatchEvent(new Event('input',{bubbles:true}));}if(!dirty)baseline=JSON.stringify(await A.current());}await renderLibrary(tab);}});
   button(more,'Duplicate…',async()=>{const name=prompt('Name for the copy',F.title(row.payload)+' copy');if(name===null)return;const payload=F.rename(row.payload,name);if(tab==='Cloud'){library.close();await CloudBoardUI.save(null,payload);}else{F.save(localStorage,payload);await renderLibrary(tab);}});
   button(more,'Delete…',async()=>{if(!confirm('Delete this saved copy? Export it first if you need a backup.'))return;if(tab==='Cloud')await CloudBoardUI.remove(row);else{F.remove(localStorage,row);if(target?.location==='device'&&target.id===row.id&&target.type===row.type){target=null;baseline=null;}}await renderLibrary(tab);});libraryBody.append(card);
  }
 }
 for(const tab of ['Examples','This device','Cloud'])button(tabs,tab,()=>renderLibrary(tab));
 const exampleSelect=document.querySelector('#boardExample,#example,#presetSelect'),exampleButton=document.querySelector('#useExample,#usePresetBtn,#load');
 async function openLibrary(){library.showModal();try{await renderLibrary();}catch(e){libraryBody.textContent=e.message;}}
 const file=menu('File');item(file,'New board',async()=>{if(!confirmReplace())return;A.blank(await A.current());await adopted(null,null);});item(file,'Open…',openLibrary);item(file,'Save',save);item(file,'Save as…',saveAs);
 const importButton=document.querySelector('#importBoard,#importChart,#importRoutineBtn');item(file,'Import file…',()=>{if(confirmReplace())importButton.click();});item(file,'Export file…',()=>exportButton.click());
 item(file,'Share…',()=>{const share=[...document.querySelectorAll('button')].find(b=>b.textContent==='Share by email');if(share){share.classList.add('file-legacy');share.click();}else throw Error('Sharing is still loading. Try again.');});
 item(file,'Make available offline…',()=>{const b=document.querySelector('.offline-tools [data-download]');if(!b||b.disabled)throw Error('Wait for offline tools to finish preparing.');b.click();});
 item(file,'Open offline copy',()=>{const b=document.querySelector('.offline-tools [data-open]');if(!b||b.hidden)throw Error('Download this board for offline use first.');b.click();target=null;baseline=null;});
 const printButtons=[...document.querySelectorAll('#printBoard,#printChart,#print,#printBtn,#printCard,#printExit,#printPortrait,#printLandscape')];
 const printDialog=dialog('Print options');const orientation=document.querySelector('#orientation,#printOrientation');if(orientation){const label=orientation.closest('label')||document.querySelector(`label[for="${orientation.id}"]`);if(label?.contains(orientation))printDialog.append(label);else{if(label)printDialog.append(label);printDialog.append(orientation);}}for(const b of printButtons)button(printDialog,b.textContent,()=>{if(b.disabled)throw Error('This print option is not available yet.');printDialog.close();if(b.id==='printBtn')document.querySelector('[data-view="print"].view-tab')?.click();b.click();});
 if(!printButtons.length)button(printDialog,'Print',()=>{printDialog.close();window.print();});item(file,'Print…',()=>printDialog.showModal());
 const edit=menu('Edit');item(edit,'Rename board',()=>{nameInput?.focus();nameInput?.select();});item(edit,'Duplicate board…',saveAs);
 const clear=[...document.querySelectorAll('#clearMarks,#clear,#resetTokens')];for(const b of clear)item(edit,b.textContent,()=>b.click());
 const view=menu('View');item(view,'Show / hide visual navigation',()=>document.querySelector('.sidebar-toggle')?.click());item(view,'Expand editing options',()=>document.querySelectorAll('.editor-options').forEach(d=>d.open=true));item(view,'Collapse editing options',()=>document.querySelectorAll('.editor-options').forEach(d=>d.open=false));
 const help=menu('Help'),offlineHelp=dialog('Offline & installation');item(help,'Offline & installation',()=>{const panel=document.querySelector('.offline-tools');if(panel){offlineHelp.append(panel);panel.querySelector('details').open=true;}offlineHelp.showModal();});item(help,'What’s New',()=>{location.href=new URL('whats-new/',root);});item(help,'Privacy',()=>{location.href=new URL('#privacy-policy',root);});
 // Keep the original handlers available for import/export; move file management into this menu.
 const legacy=['saveBoard','loadBoard','deleteBoard','savedBoards','saveChart','loadChart','deleteChart','savedCharts','saveRoutineBtn','loadRoutineBtn','deleteRoutineBtn','savedRoutinesSelect','exportBoard','exportChart','exportRoutineBtn','importBoard','importChart','importRoutineBtn'];
 for(const id of legacy){const el=document.getElementById(id);if(el){el.classList.add('file-legacy');document.querySelector(`label[for="${id}"]`)?.classList.add('file-legacy');}}
 for(const el of [exampleSelect,exampleButton,...printButtons,...clear])if(el){el.classList.add('file-legacy');document.querySelector(`label[for="${el.id}"]`)?.classList.add('file-legacy');}
 const share=[...document.querySelectorAll('button')].find(b=>b.textContent==='Share by email');share?.classList.add('file-legacy');
 function groupControls(){const toolbar=document.querySelector('.visual-toolbar');if(!toolbar)return;
  if(currentType==='routine'){toolbar.querySelectorAll('.toolbar-group').forEach((group,i)=>{const d=document.createElement('details');d.className='editor-options';d.open=i===0;const s=document.createElement('summary');s.textContent=i===0?'Content':'Timing';group.before(d);d.append(s,group);});toolbar.querySelectorAll('h2').forEach(h=>{if(/Save|Routine setup/.test(h.textContent))h.hidden=true;});return;}
  const groups={};for(const label of ['Content','Appearance','Layout']){const d=document.createElement('details');d.className='editor-options';d.open=label==='Content';const s=document.createElement('summary');s.textContent=label;const content=document.createElement('div');content.className='editor-fields';d.append(s,content);groups[label]={d,content};}
  const controls=[...toolbar.querySelectorAll('.controls')].filter(el=>el.tagName!=='FORM');
  const settings=toolbar.querySelector('form#settings');if(settings)groups.Content.content.append(settings);
  for(const control of controls){for(const el of [...control.children]){if(el.classList.contains('file-legacy')||el.matches('label[for]')||el.type==='file')continue;const field=el.matches('input,select,button')?el:el.querySelector('input,select,button');const id=field?.id||'';if(!field)continue;
    if((el.textContent.trim()==='Run session'&&el.tagName==='BUTTON')||['project'].includes(id)){el.classList.add('file-run','file-legacy');menuRow.append(el);continue;}
    if(['editMode','runMode'].includes(id)){if(id==='runMode')button(menuRow,'Run Session',()=>field.click()).className='file-run file-legacy';el.closest('label')?.classList.add('file-legacy');continue;}
    const group=/theme|font|color|motion|sound|chime|showTimer/i.test(id)?'Appearance':/row|column|layout|orientation|extraSets|weekend|day|version/i.test(id)?'Layout':'Content';
    const label=control.querySelector(`label[for="${id}"]`);if(label){const wrap=document.createElement('div');wrap.append(label,el);groups[group].content.append(wrap);}else groups[group].content.append(el);
   }control.classList.add('file-controls-source');}
  for(const group of Object.values(groups))if(group.content.children.length)toolbar.append(group.d);
 }
 groupControls();
 const modes=document.createElement('div');modes.className='file-modes';modes.setAttribute('aria-label','Board views');menuRow.append(modes);
 const routineTab=view=>document.querySelector(`.view-tab[data-view="${view}"]`);
 document.querySelector('.view-tabs')?.classList.add('file-legacy');
 const setMode=mode=>{document.body.dataset.boardMode=mode;document.body.classList.toggle('board-print-preview',mode==='print'&&currentType!=='routine');modes.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));};
 const build=button(modes,'Build',()=>{setMode('build');if(currentType==='routine')routineTab('builder').click();});build.dataset.mode='build';
 const print=button(modes,'Print',()=>{setMode('print');if(currentType==='routine')routineTab('print').click();else document.dispatchEvent(new Event('board-print-preview'));});print.dataset.mode='print';
 const printActions=document.createElement('div');printActions.className='board-print-actions no-print';bar.after(printActions);button(printActions,'Print / Save PDF…',()=>printDialog.showModal());
 function runPlanner(){
  const sheet=document.querySelector('.sheet');
  let exit=sheet.querySelector('.planner-exit');
  if(!exit){exit=document.createElement('button');exit.type='button';exit.className='planner-exit no-print';exit.textContent='Exit session';sheet.prepend(exit);exit.onclick=()=>{sheet.classList.remove('planner-running');setMode('build');if(document.fullscreenElement===sheet)document.exitFullscreen().catch(()=>{});launch.focus();};}
  sheet.classList.add('planner-running');sheet.requestFullscreen?.().catch(()=>{});exit.focus();
 }
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.querySelector('.planner-running')?.classList.remove('planner-running');});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('.planner-running .planner-exit')?.click();});
 const launch=button(modes,'Run Session',()=>{
  setMode('run');
  if(currentType==='routine'){if(document.body.dataset.view!=='projection')routineTab('projection').click();document.getElementById('startTimerBtn').click();document.getElementById('fullscreenBtn').click();}
  else if(currentType==='self-monitor')document.getElementById('project').click();
  else if(currentType==='token-board')document.getElementById('runMode').click();
  else {const existing=document.querySelector('.file-run');if(existing)existing.click();else if(currentType==='homework-planner')runPlanner();else throw Error('Session controls are still loading. Try again.');}
 });launch.dataset.mode='run';

 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)setMode(currentType==='routine'?'run':'build');});
 setMode('build');
 function offlineUpdate(){const panel=document.querySelector('.offline-tools'),s=panel?.querySelector('[role=status]');if(panel&&!offlineHelp.contains(panel))offlineHelp.append(panel);offlineState.textContent=s?.textContent||'';offlineState.title='File → Make available offline; Help → Offline & installation';}
 const observer=new MutationObserver(offlineUpdate);const panel=document.querySelector('.offline-tools');if(panel){observer.observe(panel,{subtree:true,childList:true,characterData:true});offlineUpdate();}
 nameInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();run(save)();}},true);
 document.addEventListener('input',()=>{lastError='';check();});document.addEventListener('change',()=>{lastError='';check();});setInterval(check,1500);
 addEventListener('online',check);addEventListener('offline',check);addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();run(e.shiftKey?saveAs:save)();}});
 for(const name of ['board-cloud-opened','board-cloud-saved'])addEventListener(name,async e=>{if(e.detail.payload)await adopted({...e.detail,location:'cloud'},name==='board-cloud-opened'?await A.current():e.detail.payload);});
 addEventListener('board-cloud-deleted',e=>{if(target?.location==='cloud'&&target.slot===e.detail.slot){target=null;baseline=null;check();}});
 addEventListener('board-cloud-signedout',()=>{if(target?.location==='cloud'){lastError='Signed out · cloud changes not synced';status();}});
 const importFile=document.querySelector('#importFile,#importRoutineInput');if(importFile?.onchange){const original=importFile.onchange;importFile.onchange=async function(e){const before=JSON.stringify(await A.current());await original.call(this,e);if(JSON.stringify(await A.current())!==before){target=null;baseline=null;}await check();};}
 const id=new URLSearchParams(location.search).get('deviceBoard');if(id){const row=F.list(localStorage).find(r=>r.id===id&&r.type===currentType);if(row)await openLocal(row);history.replaceState(null,'',location.pathname);}
 await check();
})().catch(error=>{console.error('File menu could not load:',error.message);});
