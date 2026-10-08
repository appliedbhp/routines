/* Settings and authentication responses are never cached here. */
importScripts('./offline-assets.js');
const SHELL='routines-shell-'+OFFLINE_VERSION,MEDIA='routines-media-v1';
const ROOT=new URL('./',self.location.href);
const shellURLs=new Set(OFFLINE_ASSETS.map(path=>new URL(path,ROOT).href));
function mediaURL(url){
 return url.protocol==='https:'&&(
  (url.hostname==='static.arasaac.org'&&url.pathname.startsWith('/pictograms/'))||
  (url.hostname==='api.iconify.design'&&url.pathname.endsWith('.svg'))||
  (url.hostname==='pixabots.com'&&/^\/api\/pixabot\/[a-zA-Z0-9-]+$/.test(url.pathname))||
  ['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname));
}
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll([...shellURLs]))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('routines-shell-')&&name!==SHELL)await caches.delete(name);
 await self.clients.claim();
})()));
function canonical(request){const url=new URL(request.url);url.search='';url.hash='';if(url.pathname.endsWith('/'))url.pathname+='index.html';return url;}
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=canonical(req),local=shellURLs.has(url.href),media=mediaURL(new URL(req.url));
 if(!local&&!media)return;
 event.respondWith((async()=>{
  const cache=await caches.open(local?SHELL:MEDIA),key=local?url.href:req;
  if(media){const saved=await cache.match(key);if(saved)return saved;}
  try{const response=await fetch(req);if(response.ok||response.type==='opaque')await cache.put(key,response.clone());return response;}
  catch(error){const saved=await cache.match(key);if(saved)return saved;throw error;}
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='CACHE_BOARD_MEDIA'||!event.ports[0])return;
 event.waitUntil((async()=>{
  const cache=await caches.open(MEDIA),failed=[];
  const urls=[...new Set(event.data.urls||[])].slice(0,400);
  for(const raw of urls){
   try{
    const url=new URL(raw);if(url.origin===ROOT.origin)continue;if(!mediaURL(url)){failed.push(raw);continue;}
    if(await cache.match(url.href))continue;
    const response=await fetch(url.href,{mode:url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'?'cors':'no-cors',credentials:'omit',signal:AbortSignal.timeout(15000)});
    if(!response.ok&&response.type!=='opaque')throw Error('Download failed');
    await cache.put(url.href,response);
   }catch{failed.push(raw);}
  }
  event.ports[0].postMessage({failed});
 })());
});
