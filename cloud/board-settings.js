/* Shared browser/server boundary: rebuild settings from an allowlist, never upload app state. */
(function(root){
 const VERSION='no-personal-info-v1';
 const ATTESTATION='I confirm this board contains no personal information, including names, classroom or school identifiers, contact details, diagnoses, or information that could identify a child or another person.';
 const fail=()=>{throw Error('This board contains unsupported settings. Please review it before saving.');};
 const str=(v,max=200)=>{if(typeof v!=='string'||v.length>max)fail();return v;};
 const num=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail();return v;};
 const integer=(v,min,max)=>{num(v,min,max);if(!Number.isInteger(v))fail();return v;};
 const bool=v=>{if(typeof v!=='boolean')fail();return v;};
 const list=(v,min,max,fn)=>{if(!Array.isArray(v)||v.length<min||v.length>max)fail();return v.map(fn);};
 const one=(v,choices)=>{if(!choices.includes(v))fail();return v;};
 const picture=v=>{if(v===null||v===undefined)return null;if(!Number.isSafeInteger(v)||v<=0||v>999999999)fail();return v;};
 const color=v=>{if(typeof v!=='string'||!/^#[a-f0-9]{6}$/i.test(v))fail();return v;};
 const styles=['bottts','planets','adventurer','big-smile','critters','clay','croodles','marbles','micah','pixel-art','voxel-art','voxel-bot'];
 function icon(v){
  const source=one(v?.source,['material','openmoji','arasaac','dicebear','pixabots']);
  if(typeof v.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(v.id))fail();
  if(source==='arasaac'&&!/^[1-9][0-9]{0,8}$/.test(v.id))fail();
  if(source==='pixabots'&&!/^[a-z0-9]{4}$/.test(v.id))fail();
  return {source,id:v.id,label:str(v.label,100),...(source==='dicebear'&&v.style?{style:one(v.style,styles)}:{})};
 }
 function clean(p){
  if(!p||typeof p!=='object')fail();
  const b=p.board;let out;
  if(p.format==='visual-support-board'&&p.version===1){
   const limits={'first-then':[2,2],'choice-board':[2,12],'task-strip':[1,12],'now-next-later':[3,3],'calm-down':[2,12]};
   const type=one(b?.type,Object.keys(limits));
   out={format:p.format,version:1,board:{type,title:str(b.title,100),person:'',layout:{rows:integer(b.layout?.rows??0,0,12),columns:integer(b.layout?.columns??0,0,12)},cards:list(b.cards,...limits[type],c=>({label:str(c.label,100),pictogramId:picture(c.pictogramId),marked:false}))}};
  }else if(p.format==='token-board'&&p.version===2){
   out={format:p.format,version:2,board:{type:'token-board',title:str(b.title,100),reward:str(b.reward,100),rewardIcon:icon(b.rewardIcon),font:one(b.font,['Nunito','Fredoka','Patrick Hand','system-ui','Quicksand','Space Grotesk','Silkscreen','Lora','Atkinson Hyperlegible','Lexend','Balsamiq Sans','Chewy','Comic Neue','Fascinate Inline','Flavors','Freckle Face','Ribeye Marrow','Sofadi One','Tenor Sans','Syne Mono']),color:color(b.color),theme:one(b.theme,['classic','ocean','space','garden','arcade','boho']),motion:bool(b.motion),extraSets:integer(b.extraSets,0,3),sound:bool(b.sound),tokens:list(b.tokens,1,12,t=>({icon:icon(t.icon),earned:false}))}};
  }else if(p.format==='homework-planner'&&p.version===1){
   out={format:p.format,version:1,board:{type:'homework-planner',title:str(b.title,100),person:'',week:'',mode:one(b.mode,['simple','detailed']),weekends:bool(b.weekends),layout:one(b.layout,['day','week']),day:integer(b.day,-1,6),subjects:list(b.subjects,1,8,s=>({name:str(s.name,60),image:'',pictogramId:picture(s.pictogramId),entries:Array.from({length:7},()=>({homework:'',assignment:'',done:false}))}))}};
  }else if(p.format==='weekly-chore-chart'&&p.version===1){
   const c=p.chart;out={format:p.format,version:1,chart:{name:str(c.name,100),person:'',week:'',chores:list(c.chores,0,10,c=>({name:str(c.name),pictogramId:picture(c.pictogramId),checked:Array(7).fill(false)}))}};
  }else if(p.format==='self-monitor'&&p.version===1){
   out={format:p.format,version:1,board:{type:'self-monitor',title:str(b.title,100),duration:num(b.duration,1,90),interval:num(b.interval,1,90),timing:one(b.timing,['equal','random']),variation:num(b.variation,0,89),message:str(b.message),yes:num(b.yes,0,3),no:num(b.no,0,3),mismatch:num(b.mismatch,0,3),theme:one(b.theme,['classic','ocean','forest','sunset','space','garden','unicorn','chef','scientist','classroom','autumn','halloween','winter','tropical','eighties','valentine','stpatricks','city']),classicColor:color(b.classicColor),showTimer:bool(b.showTimer),chimes:bool(b.chimes)}};
  }else if(p.format==='routine-visual-timer'&&p.version===1){
   const r=p.routine,s=r.settings;const settings={theme:str(s.theme,30),flexible:bool(s.flexible),quiet:bool(s.quiet),showClock:bool(s.showClock),projTextColor:s.projTextColor===''?'':color(s.projTextColor),sounds:{chime:bool(s.sounds.chime),tick:bool(s.sounds.tick),victory:bool(s.sounds.victory)}};
   for(const k of ['projFontScale','printFontScale','projIconScale','printIconScale'])settings[k]=num(s[k],0,2.05);
   out={format:p.format,version:1,routine:{name:str(r.name),category:one(r.category,['morning','evening','chores','tasks']),autoTotal:bool(r.autoTotal),totalMinutes:num(r.totalMinutes,.01,10080),settings,steps:list(r.steps,1,100,s=>{
    const id=picture(s.pictogramId),positions={};
    for(const mode of ['print','projection'])if(s.positions?.[mode]){positions[mode]={};for(const kind of ['icon','label'])if(s.positions[mode][kind])positions[mode][kind]={x:num(s.positions[mode][kind].x,-8,8),y:num(s.positions[mode][kind].y,-8,8)};}
    return {name:str(s.name),minutes:num(s.minutes,.01,1440),pictogramId:id,imageUrl:id?`https://static.arasaac.org/pictograms/${id}/${id}_300.png`:null,positions};
   })}};
  }else fail();
  if(JSON.stringify(out).length>65536)throw Error('This board is too large for cloud saving.');
  return out;
 }
 const type=p=>p.board?.type||(p.chart?'chore-chart':'routine');
 const title=p=>p.board?.title??p.chart?.name??p.routine?.name;
 const path=p=>type(p)==='routine'?'':`${type(p)}/`;
 const textFields=p=>{const result=[];function visit(v,k){if(v&&typeof v==='object'&&v.source==='dicebear')result.push(`Character seed: ${v.id}`);if(typeof v==='string'&&['title','name','label','message','reward'].includes(k)&&v)result.push(v);else if(Array.isArray(v))v.forEach(x=>visit(x,''));else if(v&&typeof v==='object')Object.entries(v).forEach(([k,x])=>visit(x,k));}visit(p,'');return [...new Set(result)];};
 const api={clean,type,title,path,textFields,VERSION,ATTESTATION};
 if(typeof module!=='undefined')module.exports=api;else root.CloudBoardSettings=api;
})(globalThis);
