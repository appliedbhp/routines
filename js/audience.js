/* Local display preferences. Add future tools to the appropriate audience lists. */
(function(root){
 const key='routines.audience.v1';
 const profiles={
  all:{label:'All ages · show all tools',tools:null},
  young:{label:'Young child · 0–5',tools:['routine','chore-chart','task-strip','now-next-later','first-then','choice-board','token-board']},
  child:{label:'Child · 6–12',tools:['routine','chore-chart','task-strip','now-next-later','choice-board','token-board','self-monitor','homework-planner']},
  teen:{label:'Teen · 13+',tools:['routine','homework-planner','self-monitor','yearly-planner','quarterly-planner','monthly-planner','weekly-planner','daily-planner','meal-planner','committed-action-tracker','values-blaster','my-character','maintenance','touchpoints']},
  adult:{label:'Adult',tools:['implementation-intentions','homework-planner','self-monitor','yearly-planner','quarterly-planner','monthly-planner','weekly-planner','daily-planner','meal-planner','committed-action-tracker','values-blaster','my-character','maintenance','touchpoints']}
 };
 const themes={eighties:['80s','#b90085','#bafaff','#fff5fc','#30204b'],classic:['Classic','#2459d3','#eff4ff','#f8fafc','#202b3c'],ocean:['Ocean','#086b8c','#dff3fa','#f0f9fc','#153747'],forest:['Forest','#326346','#e5f2e7','#f3f8f2','#233d2c'],sunset:['Sunset','#a74224','#ffeadf','#fff6ef','#4e3026'],space:['Space','#5b47a8','#ece8fb','#f5f3fc','#2c2547'],unicorn:['Unicorn','#995083','#f9e6f4','#fff5fc','#4e2847']};
 function normalize(value={}){return {age:Object.hasOwn(profiles,value.age)?value.age:'all',textOnly:value.textOnly===true,theme:Object.hasOwn(themes,value.theme)?value.theme:'classic',...(Array.isArray(value.tools)?{tools:[...new Set(value.tools.filter(x=>typeof x==='string'&&/^[a-z-]+$/.test(x)))].slice(0,100)}:{})};}
 function read(){try{return normalize(JSON.parse(root.localStorage.getItem(key))||{});}catch{return normalize();}}
 function allows(age,tool,selected=read().tools){if(Array.isArray(selected))return selected.includes(tool);return !profiles[age]?.tools||profiles[age].tools.includes(tool);}
 const api={key,profiles,themes,normalize,read,allows,save(value){const next=normalize(value);try{root.localStorage.setItem(key,JSON.stringify(next));}catch{}root.dispatchEvent(new CustomEvent('routines-audience-change',{detail:next}));return next;}};
 root.RoutineAudience=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
