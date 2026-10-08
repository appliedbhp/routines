/* Shared fullscreen presentation. Adapters keep progress in each editor's own data. */
const BoardSession=(()=>{
 function canToggle(items,index,ordered){if(!Number.isInteger(index)||index<0||index>=items.length)return false;if(!ordered)return true;const next=items.findIndex(item=>!item.marked);const boundary=next<0?items.length:next;return index===boundary||index===boundary-1;}
 function normalize(items){let gap=false;return items.map(item=>{if(!item.marked)gap=true;return {...item,marked:!gap&&item.marked};});}
 function mount(adapter){
  const launch=document.createElement('button');launch.textContent='Run session';launch.className='primary';document.querySelector('.controls').append(launch);
  const panel=document.createElement('section');panel.className='board-session no-print';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Board session');
  const controls=document.createElement('div');controls.className='session-controls';
  const reset=document.createElement('button');reset.textContent=adapter.choice?'Clear selection':'Reset';
  const exit=document.createElement('button');exit.textContent='Exit session';
  controls.append(reset);
  let day;
  if(adapter.days){const label=document.createElement('label');label.textContent='Day ';day=document.createElement('select');day.setAttribute('aria-label','Session day');adapter.days.forEach((name,i)=>day.append(new Option(name,i)));day.value=String((new Date().getDay()+6)%7);day.onchange=()=>draw();label.append(day);controls.append(label);}
  controls.append(exit);
  const title=document.createElement('h1'),hint=document.createElement('p'),progress=document.createElement('p'),grid=document.createElement('div');
  title.id='sessionTitle';panel.setAttribute('aria-labelledby',title.id);hint.className='session-hint';progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');grid.className='session-grid';
  const credit=document.createElement('p');credit.className='session-hint';credit.append('Picture symbols © Government of Aragón · Sergio Palao / ');const link=document.createElement('a');link.href='https://arasaac.org';link.textContent='ARASAAC · CC BY-NC-SA';link.target='_blank';link.rel='noopener';credit.append(link);panel.append(controls,title,hint,progress,grid,credit);document.body.append(panel);
  let active=false,entering=false;
  const dayIndex=()=>day?Number(day.value):undefined;
  function draw(focus){
   const data=adapter.read(dayIndex()),items=data.items;
   title.textContent=data.title;
   hint.textContent=adapter.choice?'Choose what works for you. Tap the selected option to clear it.':adapter.ordered?'Complete the highlighted step next. You can undo the most recently completed step.':'Check off chores in any order. Tap a completed chore to undo it.';
   const count=items.filter(item=>item.marked).length;
   progress.textContent=adapter.choice?(items.find(item=>item.marked)?.label?`Selected: ${items.find(item=>item.marked).label}`:'Choose an option'):count===items.length&&items.length?'All steps complete!':`${count} of ${items.length} complete`;
   grid.replaceChildren();
   items.forEach((item,index)=>{
    const button=document.createElement('button');button.className='session-card'+(item.marked?' complete':'');button.setAttribute('aria-pressed',String(item.marked));button.disabled=!canToggle(items,index,adapter.ordered);
    const next=adapter.ordered&&!item.marked&&canToggle(items,index,true);if(next)button.classList.add('current');
    button.setAttribute('aria-label',`${adapter.choice?(item.marked?'Clear selection':'Choose'):(item.marked?'Undo':'Complete')}: ${item.label||`Step ${index+1}`}`);
    if(adapter.ordered){const step=document.createElement('span');step.className='session-step';step.textContent=`${adapter.slots?.[index]||`Step ${index+1}`}${next?' · Next':''}`;button.append(step);}
    if(item.pictogramId){const img=document.createElement('img');img.src=ARASAAC.imageUrl(item.pictogramId);img.alt='';img.onerror=()=>{img.hidden=true;};button.append(img);}
    const label=document.createElement('span');label.className='session-label';label.textContent=item.label||`Step ${index+1}`;
    const mark=document.createElement('span');mark.textContent=item.marked?(adapter.choice?'Selected ✓':'Done ✓'):(next?'Do this next':adapter.choice?'Choose':'');button.append(label,mark);
    button.onclick=()=>{const fresh=adapter.read(dayIndex()).items;if(!canToggle(fresh,index,adapter.ordered))return;adapter.toggle(index,dayIndex());draw(index);};grid.append(button);
   });
   if(Number.isInteger(focus)){const preferred=grid.children[focus];(preferred&&!preferred.disabled?preferred:grid.querySelector('button:not(:disabled)'))?.focus();}
  }
  async function close(){if(!active)return;active=false;panel.hidden=true;document.body.classList.remove('in-board-session');for(const child of document.body.children)if(child!==panel&&child.dataset.sessionInert==='true'){child.inert=false;delete child.dataset.sessionInert;}adapter.exit?.();try{if(document.fullscreenElement===panel)await document.exitFullscreen();}catch{}launch.focus();}
  launch.onclick=async()=>{
   await adapter.ready?.();
   if(adapter.ordered)adapter.normalize?.();
   active=true;draw();panel.hidden=false;document.body.classList.add('in-board-session');for(const child of document.body.children)if(child!==panel&&!child.inert){child.inert=true;child.dataset.sessionInert='true';}exit.focus();entering=true;
   try{await panel.requestFullscreen?.();}catch{/* Full-window fallback for browsers without fullscreen support. */}finally{entering=false;}
  };
  exit.onclick=close;reset.onclick=()=>{adapter.reset(dayIndex());draw();};
  document.addEventListener('fullscreenchange',()=>{if(active&&!entering&&!document.fullscreenElement)close();});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const controls=[...panel.querySelectorAll('button:not(:disabled),select,a[href]')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
 }
 return {mount,canToggle,normalize};
})();
