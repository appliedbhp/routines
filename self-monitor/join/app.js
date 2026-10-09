(async()=>{
 const $=id=>document.getElementById(id);let link=null,state=null,pending=null,lastSeen=0,ended=false,inv;
 let reactionPending=null,lastReaction=0,reactionTimeout;
 const storageKey='routines.selfMonitor.adult.invite';
 try{const raw=location.hash.slice(1)||sessionStorage.getItem(storageKey);inv=LiveLink.parse(raw);sessionStorage.setItem(storageKey,LiveLink.pack(inv));history.replaceState(null,'',location.pathname);}catch(e){$('connection').textContent=e.message;$('approval').hidden=true;return;}
 const pendingKey='routines.selfMonitor.adult.pending.'+inv.host;
 try{const saved=JSON.parse(sessionStorage.getItem(pendingKey));if(saved&&saved.type==='rating'&&Number.isInteger(saved.index)&&typeof saved.value==='boolean')pending=saved;}catch{}
 function disable(){document.querySelectorAll('#reactionButtons button').forEach(b=>b.disabled=true);for(const id of ['yes','no','pause'])$(id).disabled=true;}
 function render(){if(!state)return;const accepted=state.adult===link?.sender,online=Date.now()-lastSeen<12000&&!ended&&Date.now()<inv.expires;document.querySelectorAll('#reactionButtons button').forEach(b=>b.disabled=!accepted||!online||state.reactionsEnabled===false||!!reactionPending);if(state.reactionsEnabled===false&&!reactionPending)$('reactionStatus').textContent='Emoji encouragement is turned off on the child’s screen.';else if(state.reactionsEnabled!==false&&$('reactionStatus').textContent==='Emoji encouragement is turned off on the child’s screen.')$('reactionStatus').textContent='Tap an emoji to send encouragement.';$('approval').hidden=accepted;$('live').hidden=!accepted;if(!accepted){disable();return;}
  $('phase').textContent=state.stage==='finished'?'Session complete':state.stage==='paused'?'Paused':['student','adult'].includes(state.stage)?'Check-in time':'Work time';
  const sec=Math.ceil(Math.max(0,state.total-state.elapsed)/1000);$('remaining').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
  const rating=['student','adult'].includes(state.stage);if(pending&&pending.index!==state.index){pending=null;try{sessionStorage.removeItem(pendingKey);}catch{}}
  $('prompt').textContent=rating?'Is the child on track?':state.stage==='finished'?'All check-ins complete':'Waiting for the next check-in';$('yes').disabled=$('no').disabled=!online||!rating||!!pending;
  $('answerStatus').textContent=pending?'Your answer is saved on this phone. Waiting for the child and connection confirmation.':'';
  $('pause').disabled=!online||!['running','paused'].includes(state.stage);$('pause').textContent=state.stage==='paused'?'Resume':'Pause';$('score').textContent=`${state.points} ${state.points===1?'point':'points'}`;
  $('results').replaceChildren();for(const r of state.records){const li=document.createElement('li');li.textContent=`Check-in ${r.number}: child ${r.student?'Yes':'No'}, adult ${r.adult?'Yes':'No'} — ${r.points} points`;$('results').append(li);}
  $('download').disabled=$('print').disabled=!state.records.length;
  try{sessionStorage.setItem('routines.selfMonitor.adult.results',JSON.stringify({format:'self-monitor-results',version:1,points:state.points,records:state.records}));}catch{}
 }
 function valid(s){return s&&s.type==='state'&&['ready','running','paused','student','adult','finished'].includes(s.stage)&&Number.isInteger(s.index)&&s.index>=0&&s.index<=180&&Number.isFinite(s.elapsed)&&Number.isFinite(s.total)&&s.total>=0&&s.total<=5400000&&Number.isFinite(s.points)&&Array.isArray(s.records)&&s.records.length<=180&&s.records.every(r=>Number.isInteger(r.number)&&typeof r.student==='boolean'&&typeof r.adult==='boolean'&&Number.isFinite(r.points)&&r.points>=0&&r.points<=3);}
 try{link=await LiveLink.connect(inv,'adult',(m,sender,secure)=>{
  if(!secure)return;
  if(m?.type==='reaction-received'&&reactionPending?.id===m.id){$('reactionStatus').textContent=MonitorReactions.choices[reactionPending.kind].label+' delivered.';reactionPending=null;clearTimeout(reactionTimeout);render();return;}
  if(m?.type==='ended'){ended=true;link?.close();disable();$('connection').textContent='The child ended or replaced this connection.';return;}
  if(!valid(m))return;lastSeen=Date.now();state=m;$('connection').textContent=m.adult===link?.sender?'Connected to the child’s screen.':'Waiting for approval on the child’s screen.';render();
 },s=>{if(ended)return;$('connection').textContent=s==='expired'?'Invitation expired. Ask for a new QR code.':s==='connected'?'Connected. Waiting for approval on the child’s screen.':'Reconnecting… Keep this page open.';if(s==='expired'){ended=true;disable();}});$('code').textContent=link.sender.slice(0,12);}catch(e){$('connection').textContent='Could not connect. Check your internet and scan the QR code again.';return;}
 for(const [kind,reaction] of Object.entries(MonitorReactions.choices)){
  const b=document.createElement('button');b.type='button';b.textContent=reaction.emoji;b.setAttribute('aria-label','Send '+reaction.label);b.title=reaction.label;b.disabled=true;$('reactionButtons').append(b);
  b.onclick=async()=>{if(ended||!state||state.adult!==link.sender||state.reactionsEnabled===false||Date.now()-lastSeen>=12000||reactionPending||Date.now()-lastReaction<1200)return;
   lastReaction=Date.now();const sent={type:'reaction',kind,id:crypto.randomUUID()};reactionPending=sent;$('reactionStatus').textContent='Sending '+reaction.label.toLowerCase()+'…';render();
   reactionTimeout=setTimeout(()=>{if(reactionPending?.id===sent.id){reactionPending=null;$('reactionStatus').textContent='Not delivered. Check the child’s connection and emoji setting, then try again.';render();}},5000);
   try{if(!await link.sendPrivate(sent)&&reactionPending?.id===sent.id){reactionPending=null;clearTimeout(reactionTimeout);$('reactionStatus').textContent='Not sent. Reconnect and try again.';render();}}catch{reactionPending=null;clearTimeout(reactionTimeout);$('reactionStatus').textContent='Not sent. Reconnect and try again.';render();}
  };
 }
 const choose=value=>{if(!state||pending||Date.now()-lastSeen>=12000||ended)return;pending={type:'rating',index:state.index,value};try{sessionStorage.setItem(pendingKey,JSON.stringify(pending));}catch{}link.sendPrivate(pending);render();};$('yes').onclick=()=>choose(true);$('no').onclick=()=>choose(false);
 $('pause').onclick=()=>link.sendPrivate({type:state.stage==='paused'?'resume':'pause'});
 $('download').onclick=()=>{const blob=new Blob([JSON.stringify({format:'self-monitor-results',version:1,points:state.points,records:state.records},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='self-monitor-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('print').onclick=()=>{$('results').closest('details').open=true;window.print();};
 $('leave').onclick=async()=>{await link.sendPrivate({type:'leave'});ended=true;link.close();disable();sessionStorage.removeItem(storageKey);$('connection').textContent='You left the session. Completed results remain available here.';};
 setInterval(()=>{if(ended)return;if(Date.now()>=inv.expires){ended=true;disable();return;}link.send({type:'hello',publicKey:link.publicKey});if(pending)link.sendPrivate(pending);if(lastSeen&&Date.now()-lastSeen>=12000){$('connection').textContent='Child’s screen disconnected. Keep both pages open; your pending answer will retry.';disable();}render();},2000);
})();
