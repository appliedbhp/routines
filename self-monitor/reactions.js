/* Fixed reactions only: no arbitrary remote text, HTML, or media. */
const MonitorReactions=(()=>{
 const choices=Object.freeze({heart:{emoji:'❤️',label:'Heart'},clap:{emoji:'👏',label:'Clapping hands'},smile:{emoji:'😊',label:'Smile'},laugh:{emoji:'😄',label:'Laughter'},thumbs:{emoji:'👍',label:'Thumbs up'},star:{emoji:'🌟',label:'Shining star'}});
 function gate(){let last=-Infinity;const seen=new Set();return message=>{if(message?.type!=='reaction'||!Object.hasOwn(choices,message.kind)||typeof message.id!=='string'||!/^[-\w]{1,64}$/.test(message.id)||seen.has(message.id)||Date.now()-last<1200)return false;last=Date.now();seen.add(message.id);if(seen.size>32)seen.delete(seen.values().next().value);return true;};}
 return {choices,gate};
})();
if(typeof module!=='undefined')module.exports=MonitorReactions;
