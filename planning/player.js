(()=>{
 const select=document.getElementById('practice'),videos=MindfulVideos;
 videos.forEach(v=>select.add(new Option(v.title,v.id)));
 const id=new URLSearchParams(location.search).get('video');if(videos.some(v=>v.id===id))select.value=id;
 function play(){const v=videos.find(v=>v.id===select.value),iframe=document.createElement('iframe');iframe.src='https://www.youtube-nocookie.com/embed/'+v.id+'?playlist='+videos.slice(videos.indexOf(v)).map(x=>x.id).join(',');iframe.title=v.title;iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';document.getElementById('video').replaceChildren(iframe);document.getElementById('watch').href='https://www.youtube.com/watch?v='+v.id;}
 addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='mindful-select'||!videos.some(v=>v.id===e.data.id)||select.value===e.data.id)return;select.value=e.data.id;play();});
 select.onchange=play;play();
})();
