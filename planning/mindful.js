(()=>{
 if(!document.body.dataset.planner)return;
 const panel=document.createElement('aside');panel.className='mindful-widget no-print';panel.setAttribute('aria-label','Mindful planning and reflection');
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='▶ Mindful planning';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','mindfulPlayer');
 const content=document.createElement('div');content.id='mindfulPlayer';content.hidden=true;
 const heading=document.createElement('h2');heading.textContent='Mindful planning & reflection';
 const close=document.createElement('button');close.type='button';close.textContent='Close';
 const player=document.createElement('div');player.className='mindful-video';
 const link=document.createElement('a');link.href='https://www.youtube.com/watch?v=7ho5NRga7EM&list=PLhC4jOaa8yeDX_hspr1NCue9YTFZbNB1X';link.target='_blank';link.rel='noopener';link.textContent='Open the full playlist on YouTube ↗';
 function show(open){content.hidden=!open;toggle.setAttribute('aria-expanded',String(open));player.replaceChildren();if(open){const iframe=document.createElement('iframe');iframe.src='https://www.youtube-nocookie.com/embed/7ho5NRga7EM?list=PLhC4jOaa8yeDX_hspr1NCue9YTFZbNB1X';iframe.title='Mindful planning and reflection playlist';iframe.allow='encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';player.append(iframe);close.focus();}else toggle.focus();}
 toggle.onclick=()=>show(content.hidden);close.onclick=()=>show(false);panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&!content.hidden){e.preventDefault();show(false);}});
 content.append(close,heading,player,link);panel.append(content,toggle);document.body.append(panel);
})();
