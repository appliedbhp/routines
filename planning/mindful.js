(()=>{
 if(!document.body.dataset.planner)return;
 const videos=[{"id": "7ho5NRga7EM", "title": "Meditation 1: Present Moment — Arriving"}, {"id": "trQD6Wqubq4", "title": "Meditation 2: Self as Context — You Are Not Your Productivity"}, {"id": "IX_PyRAoiYA", "title": "Meditation 3: Defusion — Unhooking from the Thought-Storm"}, {"id": "3HQBhgEb3l0", "title": "Meditation 4: Acceptance — Making Room for the Mess"}, {"id": "fDVUydwJhhw", "title": "Meditation 5: Values — The Compass Under the Calendar"}, {"id": "XhlxL_5pfLU", "title": "Meditation 6: Committed Action — Choosing What’s Next"}, {"id": "m05PD2ZTEtg", "title": "Already Here - a song about Acceptance and Commitment Therapy"}];
 const panel=document.createElement('aside');panel.className='mindful-widget no-print';panel.setAttribute('aria-label','Mindful planning and reflection');
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='▶ Mindful planning';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','mindfulPlayer');
 const content=document.createElement('div');content.id='mindfulPlayer';content.hidden=true;
 const heading=document.createElement('h2');heading.textContent='Mindful planning & reflection';
 const close=document.createElement('button');close.type='button';close.textContent='Close';
 const player=document.createElement('div');player.className='mindful-video';
 const label=document.createElement('label');label.className='mindful-select';label.textContent='Choose a practice';
 const select=document.createElement('select');select.setAttribute('aria-label','Choose a mindful planning practice');
 videos.forEach(video=>{const option=document.createElement('option');option.value=video.id;option.textContent=video.title;select.append(option);});label.append(select);
 const actions=document.createElement('div');actions.className='mindful-actions';
 function external(text,url){const link=document.createElement('a');link.textContent=text;link.href=url;link.target='_blank';link.rel='noopener noreferrer';return link;}
 const like=external('Watch & like on YouTube ↗','');
 const subscribe=external('Subscribe to ABHP ↗','https://www.youtube.com/channel/UCHM1Ri6BgX8ak0Js50IpEdA?sub_confirmation=1');
 actions.append(like,subscribe);
 const link=external('Open the full playlist ↗','https://www.youtube.com/watch?v=7ho5NRga7EM&list=PLhC4jOaa8yeDX_hspr1NCue9YTFZbNB1X');
 function play(){const video=videos.find(v=>v.id===select.value)||videos[0];player.replaceChildren();const iframe=document.createElement('iframe');iframe.src='https://www.youtube-nocookie.com/embed/'+video.id;iframe.title=video.title;iframe.allow='encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';player.append(iframe);like.href='https://www.youtube.com/watch?v='+video.id;}
 select.onchange=play;
 function show(open){content.hidden=!open;toggle.setAttribute('aria-expanded',String(open));player.replaceChildren();if(open){play();close.focus();}else toggle.focus();}
 toggle.onclick=()=>show(content.hidden);close.onclick=()=>show(false);panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&!content.hidden){e.preventDefault();show(false);}});
 content.append(close,heading,label,player,actions,link);panel.append(content,toggle);document.body.append(panel);
})();
