/* Local display preferences. Add future tools to the appropriate audience lists. */
(function(root){
 const key='routines.audience.v1';
 const profiles={
  all:{label:'All ages · show all tools',tools:null},
  young:{label:'Young child · 0–5',tools:['routine','chore-chart','task-strip','now-next-later','first-then','choice-board','token-board']},
  child:{label:'Child · 6–12',tools:['routine','chore-chart','task-strip','now-next-later','choice-board','token-board','self-monitor','homework-planner']},
  teen:{label:'Teen · 13+',tools:['routine','homework-planner','self-monitor']},
  adult:{label:'Adult',tools:['routine','homework-planner','self-monitor']}
 };
 function normalize(value={}){return {age:Object.hasOwn(profiles,value.age)?value.age:'all',textOnly:value.textOnly===true};}
 function read(){try{return normalize(JSON.parse(root.localStorage.getItem(key))||{});}catch{return normalize();}}
 function allows(age,tool){return !profiles[age]?.tools||profiles[age].tools.includes(tool);}
 const api={key,profiles,normalize,read,allows,save(value){const next=normalize(value);try{root.localStorage.setItem(key,JSON.stringify(next));}catch{}root.dispatchEvent(new CustomEvent('routines-audience-change',{detail:next}));return next;}};
 root.RoutineAudience=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
