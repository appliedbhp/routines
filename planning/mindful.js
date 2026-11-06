(()=>{
 if(!document.body.dataset.planner)return;
 const root=new URL('./',document.currentScript.src);
 const videos=[{"id": "7ho5NRga7EM", "title": "Meditation 1: Present Moment — Arriving"}, {"id": "trQD6Wqubq4", "title": "Meditation 2: Self as Context — You Are Not Your Productivity"}, {"id": "IX_PyRAoiYA", "title": "Meditation 3: Defusion — Unhooking from the Thought-Storm"}, {"id": "3HQBhgEb3l0", "title": "Meditation 4: Acceptance — Making Room for the Mess"}, {"id": "fDVUydwJhhw", "title": "Meditation 5: Values — The Compass Under the Calendar"}, {"id": "XhlxL_5pfLU", "title": "Meditation 6: Committed Action — Choosing What’s Next"}, {"id": "m05PD2ZTEtg", "title": "Already Here - a song about Acceptance and Commitment Therapy"}];
 const panel=document.createElement('aside');panel.className='mindful-widget no-print';panel.setAttribute('aria-label','Mindful planning and reflection');
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='▶ Mindful planning';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','mindfulPlayer');
 const content=document.createElement('div');content.id='mindfulPlayer';content.hidden=true;
 const heading=document.createElement('h2');heading.textContent='Mindful planning & reflection';
 const close=document.createElement('button');close.type='button';close.textContent='Close';
 const player=document.createElement('div');player.className='mindful-player-launch';const note=document.createElement('p');note.textContent='A separate player keeps the playlist going while you switch planning screens. Keep that window open; closing this panel won’t stop it.';const launch=document.createElement('button');launch.type='button';launch.textContent='Open continuous player ↗';player.append(note,launch);
 const label=document.createElement('label');label.className='mindful-select';label.textContent='Choose a practice';
 const select=document.createElement('select');select.setAttribute('aria-label','Choose a mindful planning practice');
 videos.forEach(video=>{const option=document.createElement('option');option.value=video.id;option.textContent=video.title;select.append(option);});label.append(select);
 const actions=document.createElement('div');actions.className='mindful-actions';
 function external(text,url){const link=document.createElement('a');link.textContent=text;link.href=url;link.target='_blank';link.rel='noopener noreferrer';return link;}
 const like=external('Watch & like on YouTube ↗','');
 const subscribe=external('Subscribe to ABHP ↗','https://www.youtube.com/channel/UCHM1Ri6BgX8ak0Js50IpEdA?sub_confirmation=1');
 actions.append(like,subscribe);
 const link=external('Open the full playlist ↗','https://www.youtube.com/watch?v=7ho5NRga7EM&list=PLhC4jOaa8yeDX_hspr1NCue9YTFZbNB1X');
 let playerWindow,selectionChanged=false;
 function updateLink(){like.href='https://www.youtube.com/watch?v='+select.value;}
 select.onchange=()=>{selectionChanged=true;updateLink();};updateLink();
 launch.onclick=()=>{const url=new URL('player.html?video='+encodeURIComponent(select.value),root);if(playerWindow&&!playerWindow.closed){if(selectionChanged)playerWindow.postMessage({type:'mindful-select',id:select.value},location.origin);selectionChanged=false;playerWindow.focus();return;}playerWindow=window.open('', 'abhpMindfulPlayer','popup,width=640,height=650');if(!playerWindow){note.textContent='Allow the player window, or open the full playlist on YouTube in a new tab.';return;}try{if(playerWindow.location.href==='about:blank')playerWindow.location.replace(url.href);else if(selectionChanged)playerWindow.postMessage({type:'mindful-select',id:select.value},location.origin);}catch{}selectionChanged=false;playerWindow.focus();};
 function show(open){content.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)close.focus();else toggle.focus();}
 toggle.onclick=()=>show(content.hidden);close.onclick=()=>show(false);panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&!content.hidden){e.preventDefault();show(false);}});
 content.append(close,heading,label,player,actions,link);panel.append(content,toggle);document.body.append(panel);
})();
