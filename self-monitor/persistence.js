/* Tab-scoped recovery keeps separate students' tabs independent. */
const activeSessionKey='routineVisualTimer.selfMonitor.active.v1';
let restoringSession=true,lastStoredAt=0,storageWarning=false;
function persistSession(force=false){
 if(restoringSession)return;
 const now=Date.now();if(!force&&now-lastStoredAt<1000)return;
 try{
  if(!session){sessionStorage.removeItem(activeSessionKey);return;}
  const setup=currentPayload().board;
  // Freeze session scoring and question; presentation settings may change live.
  Object.assign(setup,{title:session.title,message:session.message,yes:session.rules.yes,no:session.rules.no,mismatch:session.rules.mismatch});
  const savedAt=session.stage==='running'?now-Math.max(0,performance.now()-lastTime):now;
  sessionStorage.setItem(activeSessionKey,JSON.stringify({version:1,savedAt,setup,session,savedId}));lastStoredAt=now;
 }catch{if(!storageWarning){$('status').textContent='This browser could not save the active session. Keep this page open to retain your results.';storageWarning=true;}}
}
function reopenCheckin(){
 if(!session||!['student','adult'].includes(session.stage))return;
 $('who').textContent=session.stage==='adult'?'Adult check-in':'Student check-in';
 $('question').textContent=session.stage==='adult'?'Do you agree?':session.message;
 $('answerHelp').textContent=session.stage==='adult'?`The student answered ${session.student?'Yes':'No'}. Give your own on-track rating: Yes = on track; No = off track.`:'Choose your answer, then let the adult take a turn.';
 if(!$('checkin').open)$('checkin').showModal();$('answerYes').focus();
}
try{
 const raw=sessionStorage.getItem(activeSessionKey);
 if(raw){const record=JSON.parse(raw),restored=SelfMonitor.restoreSession(record);openSetup(restored.setup);session=restored.session;lastTime=performance.now();savedId=typeof record.savedId==='string'?record.savedId:null;refreshSetups();$('results').replaceChildren();for(const r of session.records){const row=document.createElement('li');row.textContent=`Check-in ${r.number}: Student ${r.student?'Yes':'No'}, adult ${r.adult?'Yes':'No'} — ${r.points} points`;$('results').append(row);}$('progress').textContent=`${session.index} of ${session.ends.length} check-ins complete`;tokens();render();reopenCheckin();$('status').textContent='Session restored. Your points and check-in responses are preserved.';}
}catch{$('status').textContent='The previous session could not be restored. You can start a new session.';}
restoringSession=false;
const renderWithRecovery=render;render=function(){renderWithRecovery();persistSession();};
// Save after target handlers, including the student-to-adult transition.
document.addEventListener('click',()=>persistSession(true));document.addEventListener('change',()=>persistSession(true));document.addEventListener('submit',()=>persistSession(true));
window.addEventListener('pagehide',()=>{if(session?.stage==='running')tick();persistSession(true);});
document.addEventListener('visibilitychange',()=>{if(session?.stage==='running')tick();persistSession(true);});
window.addEventListener('pageshow',event=>{if(event.persisted){if(session?.stage==='running')tick();reopenCheckin();render();}});
persistSession(true);
