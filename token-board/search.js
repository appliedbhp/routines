/* Text queries search every searchable library; category browsing stays separate. */
const TokenSearch=(()=>{
 const searchable=['mulberry','abhp','tawasol','material','openmoji'];
 function favorites(icons){return icons.filter(icon=>!/(?:star[ -]+of[ -]+david)/i.test(`${icon.id} ${icon.label}`));}
 async function searchSource(source,query){
  if(['mulberry','abhp','tawasol'].includes(source))return (await SymbolLibrary.search(query,source)).slice(0,48).map(item=>({source,id:String(item._id),label:item.keywords[0].keyword.slice(0,100)}));
  if(!['material','openmoji'].includes(source))return [];
  const prefix=source==='material'?'material-symbols':'openmoji';
  const response=await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefix=${prefix}&limit=48`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Picture service unavailable');const result=await response.json();
  return (result.icons||[]).filter(id=>id.startsWith(prefix+':')).map(name=>({source,id:name.split(':')[1],label:name.split(':')[1].replace(/-/g,' ').slice(0,100)}));
 }
 async function all(query,extended=true){const results=await Promise.allSettled((extended?searchable:['mulberry','abhp','tawasol']).map(source=>searchSource(source,query)));const groups=results.map(r=>r.status==='fulfilled'?r.value:[]);const icons=[];for(let i=0;i<48;i++)for(const group of groups)if(group[i])icons.push(group[i]);return {icons,failed:results.filter(r=>r.status==='rejected').length};}
 async function pixabots(){const response=await fetch('https://pixabots.com/api/pixabot/batch?count=24&size=256',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('PixaBots unavailable');const result=await response.json();return result.pixabots.map(bot=>({source:'pixabots',id:bot.id,label:`PixaBot ${bot.id}`}));}
 return {favorites,searchSource,all,pixabots};
})();
