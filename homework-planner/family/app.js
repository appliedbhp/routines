import {cloudConfig} from '../../cloud/config.js';
import {dateKey,dayDate,days,displayDate,element,familyURL,statusText,visibleDay} from '../sharing.js';

const byId=id=>document.getElementById(id);
const linkId=new URLSearchParams(location.search).get('chart');
let chart;

function dayLabel(day){
 return days[day]+' · '+displayDate(dateKey(dayDate(chart.week,day)));
}
function describe(entry){
 return entry.status==='assigned'?entry.assignment:statusText[entry.status];
}
function dueText(entry){
 return entry.status==='assigned'&&entry.due?'Due '+displayDate(entry.due):'';
}
function render(week=false){
 byId('today').setAttribute('aria-pressed',String(!week));
 byId('fullWeek').setAttribute('aria-pressed',String(week));
 const count=chart.weekends?7:5,today=visibleDay(chart),target=byId('assignments');
 target.replaceChildren();
 if(!week&&today===null){
  target.append(element('p','This chart is for a different week or there are no classes listed for today. Open Full week to see the assignments.'));
  return;
 }
 const visible=week?Array.from({length:count},(_,day)=>day):[today];
 for(const day of visible){
  const section=element('section');section.className='family-day';
  section.append(element('h2',dayLabel(day)));
  const entries=element('dl');
  for(const subject of chart.subjects){
   const entry=subject.entries[day],row=element('div'),description=element('dd',describe(entry));
   if(entry.status==='pending')description.classList.add('family-muted');
   const due=dueText(entry);
   if(due)description.append(element('small',due));
   row.append(element('dt',subject.name),description);entries.append(row);
  }
  section.append(entries);target.append(section);
 }
}
function printCopy(student){
 const target=byId('printCopy'),heading=element('h1',chart.title);
 const count=chart.weekends?7:5;
 const table=element('table'),thead=element('thead'),head=element('tr'),body=element('tbody');
 const subjectHeading=element('th','Subject');subjectHeading.scope='col';head.append(subjectHeading);
 for(let day=0;day<count;day++){
  const column=element('th',dayLabel(day));column.scope='col';head.append(column);
 }
 thead.append(head);
 for(const subject of chart.subjects){
  const row=element('tr'),label=element('th',subject.name);label.scope='row';row.append(label);
  for(const entry of subject.entries.slice(0,count)){
   const cell=element('td');
   if(student){cell.className='family-write-space';}
   else{
    cell.append(element('span',describe(entry)));
    const due=dueText(entry);
    if(due)cell.append(element('small',due));
    if(entry.status!=='pending'){
     const verify=element('div');verify.className='family-verify';
     const box=element('span');box.className='family-check-box';
     verify.append(box,' Verified');cell.append(verify);
    }
   }
   row.append(cell);
  }
  body.append(row);
 }
 table.append(thead,body);
 const footer=element('footer'),code=element('div'),url=familyURL(linkId);
 const qr=qrcode(0,'M');qr.addData(url.href);qr.make();
 code.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});
 const caption=element('div');
 caption.append(element('strong','Scan to check this week’s homework.'),element('p','The link opens the teacher’s latest chart for this week.'));
 footer.append(code,caption);
 const instructions=student?'Student copy · Write each assignment or mark No homework.':'Family copy · Mark Verified after comparing with the student’s copy.';
 const pageSize=element('style');pageSize.textContent='@page { size: letter landscape; margin: .45in; }';
 target.replaceChildren(pageSize,heading,element('p',byId('week').textContent),element('p',instructions));
 if(!student)target.append(element('p',byId('updated').textContent));
 target.append(table,footer);window.print();
}
async function load(){
 if(!linkId||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(linkId))throw Error('This homework link is incomplete. Ask the teacher for a new copy.');
 const response=await fetch(cloudConfig.url+'/rest/v1/rpc/routine_homework_by_link',{
  method:'POST',cache:'no-store',headers:{apikey:cloudConfig.publishableKey,'Content-Type':'application/json'},
  body:JSON.stringify({link_id:linkId})
 });
 if(!response.ok)throw Error('Could not open the homework chart. Check your connection and try again.');
 chart=await response.json();
 if(!chart)throw Error('This chart is unavailable. Ask the teacher for the current homework link.');
 byId('classTitle').textContent=chart.title;
 byId('week').textContent='Week of '+new Intl.DateTimeFormat(undefined,{dateStyle:'long',timeZone:'UTC'}).format(dayDate(chart.week,0));
 byId('updated').textContent='Updated '+new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(chart.updated_at));
 byId('today').onclick=()=>render(false);byId('fullWeek').onclick=()=>render(true);
 byId('printStudent').onclick=()=>printCopy(true);byId('printParent').onclick=()=>printCopy(false);
 render();byId('loadStatus').hidden=true;byId('familyTools').hidden=false;
}
load().catch(error=>{byId('loadStatus').textContent=error.message==='Failed to fetch'?'Could not open the homework chart. Check your connection and try again.':error.message;});
