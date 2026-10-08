/* Text queries search every searchable library; category browsing stays separate. */
const TokenSearch=(()=>{
 const searchable=['material','openmoji','arasaac'];
 function favorites(icons){return icons.filter(icon=>!/(?:star[ -]+of[ -]+david)/i.test(`${icon.id} ${icon.label}`));}
 async function searchSource(source,query){
  const url=source==='arasaac'?`https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(query)}`:`https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefix=${source==='material'?'material-symbols':'openmoji'}&limit=48`;
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Picture service unavailable');const result=await response.json();
  return source==='arasaac'?result.slice(0,48).map(item=>({source,id:String(item._id),label:(item.keywords?.[0]?.keyword||query).slice(0,100)})):(result.icons||[]).filter(id=>id.startsWith((source==='material'?'material-symbols':'openmoji')+':')).map(name=>({source,id:name.split(':')[1],label:name.split(':')[1].replace(/-/g,' ').slice(0,100)}));
 }
 async function all(query){const results=await Promise.allSettled(searchable.map(source=>searchSource(source,query)));const groups=results.map(r=>r.status==='fulfilled'?r.value:[]);const icons=[];for(let i=0;i<48;i++)for(const group of groups)if(group[i])icons.push(group[i]);return {icons,failed:results.filter(r=>r.status==='rejected').length};}
 async function pixabots(){const response=await fetch('https://pixabots.com/api/pixabot/batch?count=24&size=256',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('PixaBots unavailable');const result=await response.json();return result.pixabots.map(bot=>({source:'pixabots',id:bot.id,label:`PixaBot ${bot.id}`}));}
 return {favorites,searchSource,all,pixabots};
})();
