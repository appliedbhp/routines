/* Presentation values are derived from the existing session; timing and scoring stay in app.js. */
const MonitorLayout = (() => {
 function plan(duration, interval, timing, variation) {
  const total=Number(duration)*60000, gap=Number(interval)*60000, spread=Number(variation)*60000;
  if(!Number.isFinite(total)||!Number.isFinite(gap)||total<=0||gap<=0)return null;
  if(timing==='random'&&(!Number.isFinite(spread)||spread<0||spread>=gap))return null;
  return {total,gap,minimum:timing==='random'?Math.ceil(total/(gap+spread)):Math.ceil(total/gap),maximum:timing==='random'?Math.ceil(total/(gap-spread)):Math.ceil(total/gap)};
 }
 function view(session, planned) {
  const stage=session?.stage || 'ready';
  const total=session?.total ?? planned?.total ?? 0;
  const elapsed=session?.elapsed || 0;
  const next=session ? session.ends[session.index] : Math.min(planned?.gap || 0,total);
  return {stage,total,elapsed,count:session?.ends.length ?? planned?.maximum ?? 0,completed:session?.index || 0,next:next===undefined?0:Math.max(0,next-elapsed),active:!!session};
 }
 return {plan,view};
})();
(() => {
 const panel=$('devicePanel'),setupDock=$('setupDeviceDock'),sessionDock=$('sessionDeviceDock'),tools=$('sessionTools');
 let previousProjection=null;
 function text(id,value){const el=$(id);if(el.textContent!==value)el.textContent=value;}
 function projectionLayout(){
  const projected=document.body.classList.contains('projection');
  if(projected===previousProjection)return;
  previousProjection=projected;
  (projected?sessionDock:setupDock).append(panel);
  tools.open=projected&&!$('pairPanel').hidden;
 }
 function update(){
  const plan=MonitorLayout.plan($('duration').value,$('interval').value,$('timing').value,$('variation').value);
  const state=MonitorLayout.view(session,plan);
  document.body.dataset.sessionStage=state.stage;
  text('sessionTitle',session?.title || $('setupName').value.trim() || 'My self-monitor session');
  text('sessionQuestion',session?.message || $('message').value.trim() || 'Are you on track?');
  text('sessionState',({ready:'Preview',running:'In progress',paused:'Paused',student:'Student check-in',adult:'Adult check-in',finished:'Complete'})[state.stage]);
  const fixed=plan&&plan.minimum===plan.maximum;
  text('timingSummary',!plan?'Choose a valid session length and interval.':`${fixed?plan.maximum:`${plan.minimum}–${plan.maximum}`} check-in${fixed&&plan.maximum===1?'':'s'}, including one at the end.`);
  text('startSummary',`${$('duration').value} minutes · ${$('timing').value==='random'?'around ':''}every ${$('interval').value} minute${Number($('interval').value)===1?'':'s'}`);
  text('setupLockHint',state.active?'Session settings are locked until you reset. Appearance can still change.':'You can pause whenever you need.');
  text('startFullscreen',state.active?'Open full screen ↗':'Start in full screen ↗');
  text('checkinCount',`${state.completed} / ${state.active||fixed?state.count:'~'+state.count}`);
  const progress=$('checkinProgress');progress.max=Math.max(1,state.count);progress.value=state.completed;
  text('nextCheckin',state.stage==='finished'?'All check-ins complete.':state.stage==='student'?'Take a moment to check in.':state.stage==='adult'?'Waiting for the adult’s rating.':`${state.active?'Next':'First'} check-in ${state.stage==='paused'?'after resuming:':'in'} ${timeText(state.next)}`);
  $('sessionPrint').disabled=$('printExit').disabled;
  $('start').hidden=state.active;
  projectionLayout();
 }
 const baseRender=render;render=function(){baseRender();update();};
 $('startFullscreen').onclick=()=>$('project').click();
 $('sessionPrint').onclick=()=>$('printExit').click();
 document.addEventListener('input',update);document.addEventListener('change',update);
 const baseProjection=projection;projection=function(on){baseProjection(on);projectionLayout();};
 // Close the utility drawer when focus moves back to the student view.
 document.addEventListener('click',event=>{if(tools.open&&!tools.contains(event.target)&&!event.target.closest('dialog'))tools.open=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&tools.open&&!$('checkin').open){event.preventDefault();event.stopImmediatePropagation();tools.open=false;tools.querySelector('summary').focus();}},true);
 new MutationObserver(()=>{if(document.body.classList.contains('projection')&&!$('pairPanel').hidden)tools.open=true;}).observe($('pairPanel'),{attributes:true,attributeFilter:['hidden']});
 update();
})();
