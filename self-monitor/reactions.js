/* Fixed reactions only: no arbitrary remote text, HTML, or media. */
const MonitorReactions=(()=>{
 const choices=Object.freeze({heart:{emoji:'❤️',label:'Heart'},clap:{emoji:'👏',label:'Clapping hands'},smile:{emoji:'😊',label:'Smile'},laugh:{emoji:'😄',label:'Laughter'},thumbs:{emoji:'👍',label:'Thumbs up'},star:{emoji:'🌟',label:'Shining star'},comment:{emoji:'💬',label:'Great comment!',phrase:true},hand:{emoji:'🙋',label:'Thanks for raising your hand!',phrase:true},goodwork:{emoji:'✨',label:'Keep up the good work!',phrase:true}});
 function gate(){let last=-Infinity;const seen=new Set();return message=>{if(message?.type!=='reaction'||!Object.hasOwn(choices,message.kind)||typeof message.id!=='string'||!/^[-\w]{1,64}$/.test(message.id)||seen.has(message.id)||Date.now()-last<1200)return false;last=Date.now();seen.add(message.id);if(seen.size>32)seen.delete(seen.values().next().value);return true;};}
 function history(value){return Array.isArray(value)?value.filter(r=>r&&Object.hasOwn(choices,r.kind)&&Number.isFinite(r.elapsed)&&r.elapsed>=0&&r.elapsed<=5400000).slice(-300).map(r=>({kind:r.kind,elapsed:r.elapsed})):[];}
 function renderHistory(target,value){target.replaceChildren();const entries=history(value);for(const r of entries){const item=document.createElement('li'),reaction=choices[r.kind],sec=Math.floor(r.elapsed/1000);item.textContent=`${reaction.emoji} ${reaction.label} · ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;target.append(item);}if(!entries.length){const item=document.createElement('li');item.textContent='Encouragement will appear here.';target.append(item);}}
 return {choices,gate,history,renderHistory};
})();
if(typeof module!=='undefined')module.exports=MonitorReactions;
