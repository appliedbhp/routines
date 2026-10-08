/* Offline copies stay on this device; there is no background cloud upload. */
(()=>{
 const root=new URL('../',document.currentScript.src),key='routines.offline.board.'+location.pathname;
 const panel=document.createElement('aside');panel.className='offline-tools no-print';panel.setAttribute('aria-label','Offline tools');
 panel.innerHTML='<span role="status" aria-live="polite">Preparing offline tools…</span><button type="button" data-download>Download this board for offline use</button><button type="button" data-open hidden>Open offline copy</button><button type="button" data-install hidden>Install app</button><details><summary>Offline help</summary><p>Open this site online once and wait for “Available offline.” Download a board before disconnecting. Downloads keep a separate snapshot on this device; download again after edits. Fonts may use a fallback. New picture searches, cloud accounts, and email sending need internet. Export files and printing still work offline.</p><p>On iPad: Safari → Share → Add to Home Screen. On Chromebook: use Install app here or Chrome’s install menu. Browser storage can be cleared or evicted; export important boards as backups.</p></details>';
 const main=document.querySelector('main');if(!main)return;const toolbar=main.querySelector('.visual-toolbar');if(toolbar)toolbar.before(panel);else main.prepend(panel);
 const status=panel.querySelector('[role=status]'),download=panel.querySelector('[data-download]'),open=panel.querySelector('[data-open]'),install=panel.querySelector('[data-install]');
 const editor=!!document.querySelector('#exportBoard,#exportChart,#exportRoutineBtn');download.hidden=!editor;download.disabled=true;
 let ready=false,prompt;
 const update=()=>{status.textContent=ready?(navigator.onLine?'Available offline · tools ready':'Offline · new picture searches and cloud accounts need internet'):(navigator.onLine?'Preparing offline tools…':'Offline setup needs an internet connection');};
 addEventListener('online',update);addEventListener('offline',update);
 try{open.hidden=!editor||!localStorage.getItem(key);}catch{}
 addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;install.hidden=false;});
 install.onclick=async()=>{await prompt.prompt();install.hidden=true;};
 addEventListener('appinstalled',()=>{install.hidden=true;});
 async function adapter(){if(!globalThis.CloudBoardAdapter)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('cloud/adapter.js',root);s.onload=resolve;s.onerror=reject;document.head.append(s);});return globalThis.CloudBoardAdapter;}
 function media(){
  const urls=new Set();const add=value=>{if(value&&/^https?:/.test(value))urls.add(value);};
  document.querySelectorAll('img').forEach(el=>add(el.currentSrc||el.src));
  document.querySelectorAll('svg image').forEach(el=>add(el.getAttribute('href')||el.getAttribute('xlink:href')));
  for(const el of document.querySelectorAll('main *,header *'))for(const match of getComputedStyle(el).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))add(match[1]);
  for(const entry of performance.getEntriesByType('resource'))if(/fonts\.(googleapis|gstatic)\.com/.test(entry.name))add(entry.name);
  return urls;
 }
 download.onclick=async()=>{
  download.disabled=true;status.textContent='Downloading board and pictures…';
  try{
   const a=await adapter(),payload=await a.current(),urls=media();
   // Download both still and animated PixaBots used in sessions.
   const walk=value=>{if(!value||typeof value!=='object')return;if(value.source==='pixabots'&&globalThis.TokenData){urls.add(TokenData.url(value,false));urls.add(TokenData.url(value,true));}Object.values(value).forEach(walk);};walk(payload);
   const registration=await navigator.serviceWorker.ready;
   const result=await new Promise((resolve,reject)=>{const channel=new MessageChannel();const timer=setTimeout(()=>reject(Error('Download took too long. Reconnect and try again.')),90000);channel.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data);channel.port1.close();};registration.active.postMessage({type:'CACHE_BOARD_MEDIA',urls:[...urls]},[channel.port2]);});
   const missing=[...document.querySelectorAll('main img')].filter(img=>img.src&&!img.src.startsWith('data:')&&(!img.complete||!img.naturalWidth)).length;
   localStorage.setItem(key,JSON.stringify(payload));open.hidden=false;
   status.textContent=result.failed.length||missing?'Board saved on this device, but some pictures are not ready. Reconnect and download again.':'Board downloaded for offline use on this device. Download again after edits.';
  }catch(error){status.textContent='Could not finish offline download. '+error.message;}finally{download.disabled=!ready;}
 };
 open.onclick=async()=>{try{const raw=localStorage.getItem(key);if(!raw)throw Error('No offline copy found.');if(!confirm('Open the downloaded copy? This replaces the current visual.'))return;(await adapter()).open(JSON.parse(raw));status.textContent='Offline copy opened. Local saves and exports remain available.';}catch(error){status.textContent=error.message;}};
 if(!('serviceWorker' in navigator)){status.textContent='This browser cannot prepare offline tools. You can still export boards.';return;}
 navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.pathname}).then(()=>navigator.serviceWorker.ready).then(()=>{ready=true;download.disabled=false;update();}).catch(()=>{status.textContent='Offline setup could not finish. Reconnect and reload to try again.';});
})();
