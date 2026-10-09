/* Child-owned timer. Only completed ratings are revealed to the paired adult. */
(()=>{
 const mode=$('deviceMode'),linkStatus=$('linkStatus'),pair=$('pairPanel'),inviteKey='routines.selfMonitor.invite.v1';
 let link=null,inv=null,adult=null,candidate=null,remote=null,lastSeen=0,connecting=false,ending=false,generation=0;
 try{mode.value=sessionStorage.getItem('routines.selfMonitor.mode')==='two'?'two':'one';}catch{}
 const enabled=()=>mode.value==='two';
 function say(text){linkStatus.textContent=text;}
 function saveInvite(){try{if(inv)sessionStorage.setItem(inviteKey,JSON.stringify(inv));else sessionStorage.removeItem(inviteKey);}catch{}}
 function resetLink(){generation++;connecting=false;const previous=link;if(previous)previous.sendPrivate({type:'ended'}).finally(()=>previous.close());link=null;inv=null;adult=null;candidate=null;remote=null;lastSeen=0;saveInvite();pair.hidden=true;$('approveAdult').hidden=true;$('pairCode').textContent='Waiting for adult';$('pairLink').value='';$('pairQR').replaceChildren();}
 function snapshot(){return {type:'state',adult,stage:session?.stage||'ready',index:session?.index||0,total:session?.total||0,elapsed:session?.elapsed||0,points:session?.points||0,count:session?.ends.length||0,records:(session?.records||[]).map(({number,elapsed,student,adult,points})=>({number,elapsed,student,adult,points})),expires:inv?.expires};}
 function publish(){if(link&&adult&&!ending)link.sendPrivate(snapshot());}
 function finish(){if(session?.stage==='adult'&&remote?.index===session.index&&typeof remote.value==='boolean'){const value=remote.value;remote=null;originalAnswer(value);persistSession(true);publish();}}
 function showWaiting(){if(!session||session.stage!=='adult')return;$('checkin').close();say(adult?'Your answer is saved. Waiting for the adult’s independent rating.':'Your answer is saved. Ask the adult to scan your QR code.');pair.hidden=!!adult;}
 async function connect(){if(connecting||link||!enabled()||!session)return;connecting=true;const attempt=generation;
  try{if(!navigator.onLine)throw Error('Two-device mode needs internet. Reconnect, or choose One device to continue.');
   if(!inv){try{inv=LiveLink.parse(JSON.parse(sessionStorage.getItem(inviteKey)));}catch{inv=LiveLink.invitation();}saveInvite();}
   say('Connecting… Keep this screen open.');
   const connected=await LiveLink.connect(inv,'child',(m,sender,secure)=>{
    if(attempt!==generation)return;
    if(!m||typeof m.type!=='string')return;
    if(m.type==='hello'){
     if(sender===adult){lastSeen=Date.now();publish();return;}
     if(!adult&&!candidate){candidate={sender,publicKey:m.publicKey};$('pairCode').textContent=sender.slice(0,12);$('approveAdult').hidden=false;say('Check that the code below matches the adult’s phone, then allow it to join.');}return;
    }
    if(sender!==adult||!secure)return;lastSeen=Date.now();
    if(m.type==='rating'&&session&&m.index===session.index&&['student','adult'].includes(session.stage)&&typeof m.value==='boolean'){if(!remote)remote={index:m.index,value:m.value};finish();}
    if(m.type==='pause'&&session?.stage==='running')$('pause').click();
    if(m.type==='resume'&&session?.stage==='paused')$('pause').click();
    if(m.type==='leave'){adult=null;candidate=null;remote=null;pair.hidden=false;say('Adult disconnected. Scan the QR code to reconnect.');}
    publish();
   },state=>{if(attempt!==generation)return;if(state==='expired'){say('Pairing expired. Create a new QR code or switch to One device.');link=null;inv=null;adult=null;remote=null;saveInvite();pair.hidden=false;}else if(state==='connected'){say(adult?'Adult connected.':'Ready. Ask the adult to scan the QR code.');publish();}else say('Reconnecting… Ratings will wait until both devices reconnect.');});
   if(attempt!==generation){connected.close();return;}link=connected;inv.publicKey=link.publicKey;saveInvite();
   const url=new URL('join/',location.href);url.hash=LiveLink.pack(inv);$('pairLink').value=url.href;
   const qr=qrcode(0,'M');qr.addData(url.href);qr.make();$('pairQR').innerHTML=qr.createSvgTag({cellSize:4,margin:4,scalable:true});pair.hidden=false;
  }catch(e){say(e.message);}finally{if(attempt===generation)connecting=false;}
 }
 $('approveAdult').onclick=async()=>{if(!candidate||!link)return;const approved=candidate;await link.setPeer(approved.publicKey);adult=approved.sender;candidate=null;lastSeen=Date.now();$('approveAdult').hidden=true;pair.hidden=true;say('Adult connected. Each of you will rate on your own screen.');publish();};
 $('newPair').onclick=()=>{resetLink();connect();};
 $('enlargeQR').onclick=()=>{const large=$('pairQR').classList.toggle('large');$('enlargeQR').textContent=large?'Make QR code smaller':'Enlarge QR code';$('enlargeQR').setAttribute('aria-pressed',String(large));};
 $('showPair').onclick=()=>{if(!session){say('Start the session on this screen to create the adult’s QR code.');return;}pair.hidden=!pair.hidden;};
 $('copyPair').onclick=async()=>{try{await navigator.clipboard.writeText($('pairLink').value);say('Private invitation copied. Share it only with the adult joining this session.');}catch{$('pairLink').select();say('Select and copy the invitation link.');}};
 mode.onchange=()=>{if(!enabled()){resetLink();if(session?.stage==='adult')reopenCheckin();say('One device: take turns on this screen.');}else{if(session?.stage==='adult')showWaiting();connect();}try{sessionStorage.setItem('routines.selfMonitor.mode',mode.value);}catch{}};
 const originalAnswer=answer;answer=function(value){if(!enabled())return originalAnswer(value);if(session?.stage!=='student')return;session.student=value;session.stage='adult';persistSession(true);showWaiting();finish();publish();};
 const originalSubmit=$('settings').onsubmit;$('settings').onsubmit=e=>{if(enabled()&&!navigator.onLine){e.preventDefault();say('Two-device mode needs internet. Choose One device to start offline.');return;}originalSubmit(e);if(session&&enabled())connect();};
 const originalReset=$('reset').onclick;$('reset').onclick=()=>{originalReset();if(!session){resetLink();say('Start a new session to create a new invitation.');}};
 const originalTick=tick;tick=function(){originalTick();if(enabled()&&session?.stage==='student')$('answerHelp').textContent='Give your own rating. The adult answers on their phone.';};
 setInterval(()=>{if(!enabled())return;if(session?.stage==='student')$('answerHelp').textContent='Give your own rating. The adult answers independently on their phone.';if(!session){if(link)resetLink();return;}if(session.stage==='adult'){showWaiting();finish();}if(!link){if(inv&&Date.now()<inv.expires)connect();return;}publish();if(adult&&Date.now()-lastSeen>12000)say('Adult connection lost. Keep both screens open; check-ins wait for both ratings.');else if(adult&&session.stage!=='adult')say(session.stage==='finished'?'Session complete. The adult has a copy of the results.':'Adult connected.');},2000);
 addEventListener('online',()=>{if(enabled()&&session)connect();});
 if(enabled()&&session){if(session.stage==='adult')showWaiting();connect();}else say('One device: take turns on this screen.');
})();
