const setupKey='routineVisualTimer.selfMonitor.v1';let savedId=null;
function currentPayload(){return {format:'self-monitor',version:1,board:SelfMonitor.validateSetup({type:'self-monitor',title:$('setupName').value,duration:Number($('duration').value),interval:Number($('interval').value),timing:$('timing').value,variation:Number($('variation').value),message:$('message').value,yes:Number($('yesPoints').value),no:Number($('noPoints').value),mismatch:Number($('mismatchPoints').value),theme:$('theme').value,classicColor:$('classicColor').value,chimes:$('chimes').checked,showTimer:$('showTimer').checked})};}
function readSetup(payload){if(payload?.format!=='self-monitor'||payload.version!==1)throw Error('Choose a self-monitor setup exported from this site.');return SelfMonitor.validateSetup(payload.board);}
function appearance(){document.body.dataset.theme=$('theme').value;$('remaining').hidden=!$('showTimer').checked;$('colorLabel').hidden=$('theme').value!=='classic';document.body.style.setProperty('--classic-color',$('classicColor').value);tokens();$('toggleTimer').textContent=$('showTimer').checked?'Hide numbers':'Show numbers';}
$('theme').onchange=appearance;$('classicColor').oninput=appearance;$('showTimer').onchange=appearance;$('toggleTimer').onclick=()=>{$('showTimer').checked=!$('showTimer').checked;appearance();};
function openSetup(b){if(session)throw Error('Reset the current session before loading another setup.');for(const [id,value] of Object.entries({setupName:b.title,duration:b.duration,interval:b.interval,timing:b.timing,variation:b.variation,message:b.message,yesPoints:b.yes,noPoints:b.no,mismatchPoints:b.mismatch,theme:b.theme,classicColor:b.classicColor}))$(id).value=value;$('showTimer').checked=b.showTimer;$('chimes').checked=b.chimes;$('duration').oninput();$('timing').onchange();appearance();}
function library(){const items=JSON.parse(localStorage.getItem(setupKey)||'[]');if(!Array.isArray(items))throw Error('Saved setups could not be read.');return items;}
function refreshSetups(){$('savedBoards').replaceChildren(new Option('Choose a saved setup',''));try{library().forEach(item=>$('savedBoards').append(new Option(item.payload.board.title,item.id)));$('savedBoards').value=savedId||'';}catch(e){$('status').textContent=e.message;}}
function report(fn){try{fn();}catch(e){$('status').textContent=e.message;}}
$('saveBoard').onclick=()=>report(()=>{const payload=currentPayload(),items=library(),id=savedId||crypto.randomUUID(),index=items.findIndex(x=>x.id===id),entry={id,payload};if(index<0)items.push(entry);else items[index]=entry;localStorage.setItem(setupKey,JSON.stringify(items));savedId=id;refreshSetups();$('status').textContent='Setup saved in this browser. Session results are not included.';});
$('loadBoard').onclick=()=>report(()=>{const entry=library().find(x=>x.id===$('savedBoards').value);if(!entry)throw Error('Choose a saved setup.');openSetup(readSetup(entry.payload));savedId=entry.id;$('status').textContent='Setup loaded.';});
$('deleteBoard').onclick=()=>report(()=>{const id=$('savedBoards').value;if(!id)return;if(!confirm('Delete this saved setup?'))return;localStorage.setItem(setupKey,JSON.stringify(library().filter(x=>x.id!==id)));if(savedId===id)savedId=null;refreshSetups();});
$('exportBoard').onclick=()=>report(()=>{const payload=currentPayload(),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`self-monitor-${payload.board.title.replace(/[^a-z0-9_-]/gi,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('importBoard').onclick=()=>$('importFile').click();$('importFile').onchange=async()=>{try{const file=$('importFile').files[0];if(!file)return;if(file.size>100000)throw Error('Choose a setup smaller than 100 KB.');openSetup(readSetup(JSON.parse(await file.text())));savedId=null;refreshSetups();$('status').textContent='Imported. Save board to keep this setup.';}catch(e){$('status').textContent=e.message;}finally{$('importFile').value='';}};
function projection(on){document.body.classList.toggle('projection',on);$('exitProject').hidden=!on;$('projectStart').hidden=!on;tokens();}
$('project').onclick=async()=>{projection(true);try{await document.documentElement.requestFullscreen();}catch{}$('exitProject').focus();};
async function exitProjection(){if(!document.body.classList.contains('projection'))return;projection(false);if(document.fullscreenElement)await document.exitFullscreen();$('project').focus();}
$('exitProject').onclick=exitProjection;document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)projection(false);});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('checkin').open)exitProjection();});
$('projectStart').onclick=()=>{if(session)return;const valid=$('settings').reportValidity();if(valid)$('settings').requestSubmit();if(!$('status').textContent.includes('started')&&!session)exitProjection();};
const oldRender=render;render=function(){oldRender();$('projectStart').disabled=!!session;$('printExit').disabled=!session?.records.length||!['running','paused','finished'].includes(session.stage);};
const oldReset=$('reset').onclick;$('reset').onclick=()=>{const before=session;oldReset();if(before&&!session&&$('theme').value!=='classic'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const target=$('clock').hidden?$('tokens'):$('clock');target.animate([{transform:'scale(.75) rotate(-12deg)'},{transform:'scale(1.08) rotate(8deg)',offset:.65},{transform:'scale(1) rotate(0)'}],{duration:650,easing:'ease-out'});}};
$('printCard').onclick=()=>report(()=>{const b=currentPayload().board;if(session?.stage==='running')$('pause').onclick();const card=$('studentCard');card.replaceChildren();const title=document.createElement('h1');title.textContent=b.title;const name=document.createElement('p');name.textContent='Name: __________________________    Date: ______________';const prompt=document.createElement('h2');prompt.textContent=b.message;const instructions=document.createElement('p');instructions.textContent=`Circle your answer at each check-in. Ask an adult for their own rating, then record points. Both Yes: ${b.yes}; both No: ${b.no}; mismatch: ${b.mismatch}. Session: ${b.duration} minutes; ${b.timing==='random'?`random intervals around ${b.interval} minutes (±${b.variation})`:`every ${b.interval} minutes`}.`;
const table=document.createElement('table');table.className='card-table';const head=document.createElement('thead');const row=document.createElement('tr');for(const label of ['Check-in','Student','Adult','Points']){const th=document.createElement('th');th.textContent=label;row.append(th);}head.append(row);table.append(head);const body=document.createElement('tbody');const count=session?.ends.length??Math.ceil(b.duration/(b.timing==='random'?b.interval-b.variation:b.interval));for(let i=0;i<count;i++){const tr=document.createElement('tr');for(const text of [String(i+1),'Yes / No','Yes / No','________']){const td=document.createElement('td');td.textContent=text;tr.append(td);}body.append(tr);}table.append(body);const footer=document.createElement('footer');footer.className='card-footer';footer.append('Total points: ______   Applied Behavioral Health Practice');const qr=document.createElement('img');qr.src='../assets/qr/routines.png';qr.alt='Routines website QR code';footer.append(qr);card.append(title,name,prompt,instructions,table,footer);window.print();});
const themePaths={
 garden:'M12 8C5-2 0 8 8 11C-2 16 8 23 11 15C15 25 24 16 16 12C26 8 17-1 13 8zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM11 17h2v7h-2z',
 unicorn:'M6 23C3 17 4 10 9 7L8 2l5 3 6-5-2 8 5 6-3 4-6-2 2 7zM14 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
 chef:'M3 9C3 0 21 0 21 9H3zM2 11h20v3H2zM3 16h18v2H3zM3 20h18c0 3-2 4-4 4H7c-2 0-4-1-4-4z',
 scientist:'M3 2h18v2h-2v16c0 2-1 3-3 3H8c-2 0-3-1-3-3V6L3 4zm4 2v10h10V4H7zm0 12v4c0 1 0 1 1 1h8c1 0 1 0 1-1v-4H7z',

 space:'M12 2C8 5 7 9 7 14l5 3 5-3c0-5-1-9-5-12zM6 10l-4 7 5-1zm12 0-1 6 5 1zM10 18l2 5 2-5z',
 sunset:'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM11 0h2v4h-2zm0 20h2v4h-2zM0 11h4v2H0zm20 0h4v2h-4zM3 2l3 3-1 1-3-3zm15 16 3 3 1-1-3-3zM2 21l3-3 1 1-3 3zM18 5l3-3 1 1-3 3z',
 forest:'M12 1 5 10h3l-5 7h7v6h4v-6h7l-5-7h3z',
 ocean:'M2 12C6 3 15 3 19 9l4-4v14l-4-4C15 21 6 21 2 12zm5-2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z'
};
pointIcon=()=>{const path=document.body.classList.contains('projection')?themePaths[$('theme').value]:null;return path?`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${path}"/></svg>`:smile;};
appearance();refreshSetups();

$('printExit').onclick=()=>report(()=>{
 if(!session?.records.length)throw Error('Complete at least one check-in before printing an exit ticket.');
 if(session.stage==='running')$('pause').onclick();
 if(!['paused','finished'].includes(session.stage))throw Error('Finish the current check-in, then print your exit ticket.');
 const card=$('studentCard');card.replaceChildren();
 const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;card.append(el);return el;};
 add('h1',`${session.title} — Exit ticket`);
 add('p',`Name: __________________________   Period: ______________`);
 add('p',`Session started: ${new Date(session.startedAt).toLocaleString()} · ${session.stage==='finished'?'Completed session':'Session in progress — results so far'}`);
 add('h2',session.message);
 add('p',`Work time: ${timeText(session.elapsed)} of ${timeText(session.total)} · Completed check-ins: ${session.records.length} of ${session.ends.length}`);
 const matches=session.records.filter(r=>r.student===r.adult).length;
 const possible=session.records.length*Math.max(...Object.values(session.rules));
 add('p',`Points earned: ${session.points} of ${possible} possible for completed check-ins · Matching ratings: ${matches} of ${session.records.length}`);
 add('p',`Scoring: Both Yes = ${session.rules.yes}; both No = ${session.rules.no}; mismatch = ${session.rules.mismatch}.`);
 const table=document.createElement('table');table.className='card-table';const head=document.createElement('thead'),header=document.createElement('tr');
 for(const text of ['Check-in','Work time','Student','Adult','Points']){const th=document.createElement('th');th.textContent=text;header.append(th);}head.append(header);table.append(head);
 const body=document.createElement('tbody');for(const r of session.records){const tr=document.createElement('tr');for(const text of [r.number,timeText(r.elapsed),r.student?'Yes':'No',r.adult?'Yes':'No',r.points]){const td=document.createElement('td');td.textContent=text;tr.append(td);}body.append(tr);}table.append(body);card.append(table);
 const reflection=add('section','');reflection.className='exit-reflection';for(const question of ['Something that helped me stay on track:','One thing I will try next time:']){const p=document.createElement('p');p.textContent=question;reflection.append(p);const line=document.createElement('p');line.textContent='________________________________________________________________';reflection.append(line);}
 const footer=document.createElement('footer');footer.className='card-footer';footer.append('Applied Behavioral Health Practice · routines.getadhd.care');const qr=document.createElement('img');qr.src='../assets/qr/routines.png';qr.alt='Routines website QR code';footer.append(qr);card.append(footer);
 window.print();
});
