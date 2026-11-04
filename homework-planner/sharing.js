export const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const emptyEntry = () => ({status:'pending',assignment:'',due:''});
export const emptySubject = (name='') => ({name,entries:days.map(emptyEntry)});
export const dateKey = date => date.toISOString().slice(0,10);

export function localDay(now = new Date()){
 return new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
}
export function monday(value){
 const date = new Date(value+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(+date)||dateKey(date)!==value)throw Error('Choose a valid date for the week.');
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
 return dateKey(date);
}
export function dayDate(week,day){
 const date=new Date(week+'T12:00:00Z');
 date.setUTCDate(date.getUTCDate()+day);
 return date;
}
export function displayDate(value){
 return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
}
export function visibleDay(chart,today=localDay()){
 const day=Math.floor((today-new Date(chart.week+'T00:00:00Z'))/86400000);
 return day>=0&&day<(chart.weekends?7:5)?day:null;
}
export function fromPlanner(board){
 return {title:'Class homework',week:board.week||dateKey(localDay()),weekends:board.weekends,
  subjects:board.subjects.map(subject=>({name:subject.name,entries:subject.entries.map(entry=>{
   const assignment=entry.assignment.trim();
   if(assignment)return {status:'assigned',assignment,due:''};
   return entry.homework==='no'?{...emptyEntry(),status:'none'}:emptyEntry();
  })}))};
}
export function chartPayload(draft){
 const title=draft.title.trim();
 if(!title)throw Error('Give this chart a class title.');
 const week=monday(draft.week);
 if(week<'2000-01-01'||week>'2100-01-01')throw Error('Choose a week between 2000 and 2099.');
 const subjects=draft.subjects.map(subject=>{
  const name=subject.name.trim();
  if(!name)throw Error('Give each subject a name.');
  return {name,entries:subject.entries.map((entry,day)=>{
   if(day>=5&&!draft.weekends)return emptyEntry();
   if(entry.status!=='assigned')return {...emptyEntry(),status:entry.status};
   const assignment=entry.assignment.trim();
   if(!assignment)throw Error('Enter an assignment wherever Homework is selected.');
   return {status:'assigned',assignment,due:entry.due};
  })};
 });
 return {title,week,weekends:draft.weekends,subjects};
}
export const familyURL=id=>new URL('./family/?chart='+encodeURIComponent(id),import.meta.url);
export const statusText={pending:'Not posted yet',none:'No homework',assigned:'Homework'};
export function element(tag,text){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 return node;
}
