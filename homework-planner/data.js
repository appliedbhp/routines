const HomeworkData=(()=>{
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 const text=(value,max)=>{if(typeof value!=='string'||value.length>max)throw Error('A name or assignment is missing or too long.');return value;};
 const subject=name=>({name,entries:days.map(()=>({homework:'',assignment:'',done:false}))});
 function defaults(){return {type:'homework-planner',title:'My homework week',person:'',week:'',mode:'simple',weekends:false,times:days.map(()=>''),subjects:['Reading','Math','Writing'].map(subject)};}
 function validate(p){
  if(p?.format!=='homework-planner'||p.version!==1||!p.board)throw Error('Choose a homework planner file exported from this site.');
  const b=p.board;
  if(!['simple','detailed'].includes(b.mode)||typeof b.weekends!=='boolean')throw Error('Invalid planner options.');
  if(!Array.isArray(b.times)||b.times.length!==7||b.times.some(t=>typeof t!=='string'||(t!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))))throw Error('Invalid daily schedule.');
  if(!Array.isArray(b.subjects)||b.subjects.length<1||b.subjects.length>8)throw Error('Use between 1 and 8 subjects.');
  return {type:'homework-planner',title:text(b.title,100),person:text(b.person,100),week:text(b.week,10),mode:b.mode,weekends:b.weekends,times:[...b.times],subjects:b.subjects.map(s=>{if(!Array.isArray(s.entries)||s.entries.length!==7)throw Error('Each subject needs seven days.');return {name:text(s.name,60),entries:s.entries.map(e=>{if(!e||!['','yes','no'].includes(e.homework)||typeof e.done!=='boolean')throw Error('Invalid homework entry.');return {homework:e.homework,assignment:text(e.assignment,500),done:e.done};})};})};
 }
 const serialize=board=>({format:'homework-planner',version:1,board:validate({format:'homework-planner',version:1,board})});
 return {days,subject,defaults,validate,serialize};
})();
