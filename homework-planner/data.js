const HomeworkData=(()=>{
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 const text=(value,max)=>{if(typeof value!=='string'||value.length>max)throw Error('A name or assignment is missing or too long.');return value;};
 const subject=name=>({name,image:'',entries:days.map(()=>({homework:'',assignment:'',done:false}))});
 function defaults(){return {type:'homework-planner',title:'My homework week',person:'',week:'',mode:'simple',weekends:false,layout:'week',day:0,subjects:['Reading','Math','Writing'].map(subject)};}
 function validate(p){
  if(p?.format!=='homework-planner'||p.version!==1||!p.board)throw Error('Choose a homework planner file exported from this site.');
  const b=p.board;
  if(!['simple','detailed'].includes(b.mode)||typeof b.weekends!=='boolean')throw Error('Invalid planner options.');
  const layout=b.layout??'week',day=b.day??0;
  if(!['week','day'].includes(layout)||!Number.isInteger(day)||day<0||day>6)throw Error('Invalid planner layout.');
  if(!Array.isArray(b.subjects)||b.subjects.length<1||b.subjects.length>8)throw Error('Use between 1 and 8 subjects.');
  return {type:'homework-planner',title:text(b.title,100),person:text(b.person,100),week:text(b.week,10),mode:b.mode,weekends:b.weekends,layout,day,subjects:b.subjects.map(s=>{if(!Array.isArray(s.entries)||s.entries.length!==7)throw Error('Each subject needs seven days.');const image=s.image??'';if(typeof image!=='string'||image.length>400000||(image&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)))throw Error('Invalid subject image.');return {name:text(s.name,60),image,entries:s.entries.map(e=>{if(!e||!['','yes','no'].includes(e.homework)||typeof e.done!=='boolean')throw Error('Invalid homework entry.');return {homework:e.homework,assignment:text(e.assignment,500),done:e.done};})};})};
 }
 const serialize=board=>({format:'homework-planner',version:1,board:validate({format:'homework-planner',version:1,board})});
 return {days,subject,defaults,validate,serialize};
})();
