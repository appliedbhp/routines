import {accountClient} from '../cloud/client.js';
import {cloudConfig} from '../cloud/config.js';
import {chartPayload,days,dayDate,dateKey,displayDate,element,emptySubject,familyURL,fromPlanner,localDay,monday,statusText} from './sharing.js';

const launch=document.getElementById('shareHomework');
const dialog=element('dialog');
dialog.className='homework-share-dialog no-print';
dialog.setAttribute('aria-labelledby','homeworkShareTitle');
dialog.innerHTML=`<header><h2 id="homeworkShareTitle">Share with families</h2><button type="button" data-close>Close</button></header>
<p role="status" data-message></p>
<section data-signin hidden><p>Sign in with an adult account to publish a weekly class chart.</p><a href="../account/">Sign in or create an account</a></section>
<section data-editor hidden>
<div class="homework-share-line"><label>Published charts<select data-charts></select></label><button type="button" data-new>New week</button><button type="button" data-copy-planner>Use current planner</button></div>
<div class="homework-share-line"><label>Class chart title<input data-title maxlength="100"></label><label>Week of<input data-week type="date"></label><label class="homework-check"><input data-weekends type="checkbox"> Include weekends</label></div>
<div class="homework-share-line"><label>Editing day<select data-day></select></label><button type="button" data-add>Add subject</button></div>
<div data-subjects></div>
<p>Anyone with the link can see this chart. Review each day before publishing.</p>
<label class="homework-check"><input data-attest type="checkbox"> I’m an adult and this chart contains class homework only, with no student names or personal details.</label>
<div class="homework-share-line"><button type="button" class="primary" data-publish>Publish chart</button><button type="button" data-revoke hidden>Unpublish</button></div>
<div class="homework-share-line" data-link hidden><label>Family link<input data-url type="url" readonly></label><button type="button" data-copy>Copy link</button><a data-preview target="_blank" rel="noopener noreferrer">Open family view ↗</a></div>
</section>`;
document.body.append(dialog);
const q=name=>dialog.querySelector('[data-'+name+']');
const message=text=>{q('message').textContent=text;};
const table='routine_homework_charts';
const fields='id,title,week,weekends,subjects,revision,updated_at';
let client,user,charts=[],draft,active,day=0,dirty=false,busy=false;

function control(label,input){
 const wrapper=element('label',label);wrapper.append(input);return wrapper;
}
function fresh(){
 return {title:'Class homework',week:monday(dateKey(localDay())),weekends:false,subjects:['Reading','Math','Writing'].map(emptySubject)};
}
function openDraft(chart,source){
 active=chart;draft=structuredClone(source||chart||fresh());day=0;dirty=!!source;
 q('title').value=draft.title;q('week').value=draft.week;q('week').disabled=!!chart;q('weekends').checked=draft.weekends;
 q('charts').value=chart?.id||'';q('attest').checked=false;
 q('publish').textContent=chart?'Update chart':'Publish chart';q('revoke').hidden=!chart;
 q('link').hidden=!chart;
 if(chart){const url=familyURL(chart.id).href;q('url').value=url;q('preview').href=url;}
 render();
}
function render(){
 let week;
 try{week=monday(draft.week);}catch{}
 q('day').replaceChildren(...days.slice(0,draft.weekends?7:5).map((name,i)=>new Option(week?name+' · '+displayDate(dateKey(dayDate(week,i))):name,i)));
 q('day').value=day;q('add').disabled=draft.subjects.length>=8;
 const rows=draft.subjects.map((subject,index)=>{
  const row=element('div');row.className='homework-share-subject';row.setAttribute('role','group');
  const labelRow=()=>row.setAttribute('aria-label',(subject.name||'Subject '+(index+1))+' on '+days[day]);
  labelRow();
  const entry=subject.entries[day],name=element('input');name.maxLength=60;name.value=subject.name;
  name.oninput=()=>{subject.name=name.value;labelRow();changed();};
  const status=element('select');
  status.append(...Object.entries(statusText).map(([value,label])=>new Option(label,value)));
  status.value=entry.status;
  const assignment=element('textarea');assignment.rows=2;assignment.maxLength=500;assignment.value=entry.assignment;
  const due=element('input');due.type='date';due.value=entry.due;
  const details=element('div');details.className='homework-share-assignment';details.hidden=entry.status!=='assigned';
  details.append(control('Assignment',assignment),control('Due date (optional)',due));
  status.onchange=()=>{entry.status=status.value;details.hidden=entry.status!=='assigned';changed();};
  assignment.oninput=()=>{entry.assignment=assignment.value;changed();};
  due.oninput=()=>{entry.due=due.value;changed();};
  const remove=element('button','Remove subject');remove.type='button';remove.disabled=draft.subjects.length===1;
  remove.onclick=()=>{if(!confirm('Remove this subject and its entries for the entire week?'))return;draft.subjects.splice(index,1);changed();render();};
  row.append(control('Subject',name),control('Status',status),remove,details);
  return row;
 });
 q('subjects').replaceChildren(...rows);
}
function changed(){dirty=true;q('attest').checked=false;}
function allowReplace(){return !dirty||confirm('Discard the unpublished edits to this chart?');}
function listCharts(){
 q('charts').replaceChildren(new Option('New chart',''),...charts.map(chart=>new Option(chart.week+' · '+chart.title,chart.id)));
 q('charts').value=active?.id||'';
}
function run(action){return async()=>{
 if(busy)return;
 busy=true;q('editor').inert=true;
 try{message('');await action();}catch(error){message(error.message||'That action could not finish. Try again.');}
 finally{busy=false;q('editor').inert=false;}
};}
const open=run(async()=>{
 dialog.showModal();q('signin').hidden=true;q('editor').hidden=true;
 if(!cloudConfig.accountEnabled&&!cloudConfig.enabled)throw Error('Publishing is currently unavailable.');
 message('Checking your account…');
 client=await accountClient();
 const {data,error:authError}=await client.auth.getSession();
 if(authError)throw Error('Could not check your account. Reload and try again.');
 const session=data.session;
 if(!session||session.user.is_anonymous){user=null;active=null;draft=null;message('');q('signin').hidden=false;return;}
 const {data:verified,error:verifyError}=await client.auth.getUser();
 if(verifyError||!verified.user)throw Error('Could not verify your account. Sign in and try again.');
 const sameUser=user===verified.user.id;
 user=verified.user.id;
 const {data:rows,error}=await client.from(table).select(fields).order('week',{ascending:false}).order('updated_at',{ascending:false});
 if(error)throw Error('Published charts could not load. Try again in a moment.');
 charts=rows;
 if(!sameUser||!draft||!dirty)openDraft(charts.find(chart=>chart.id===active?.id)||charts[0]||null);
 listCharts();message('');q('editor').hidden=false;
});
launch.onclick=open;
q('close').onclick=()=>{if(!busy)dialog.close();};
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
q('charts').onchange=()=>{if(allowReplace()){openDraft(charts.find(chart=>chart.id===q('charts').value)||null);dirty=false;message('');}else q('charts').value=active?.id||'';};
q('new').onclick=()=>{if(allowReplace()){openDraft(null);dirty=false;message('');}};
q('copy-planner').onclick=()=>{if(allowReplace()){openDraft(null,fromPlanner(currentPayload().board));message('Planner copied. Review the class title and every assignment before publishing.');}};
q('title').oninput=()=>{draft.title=q('title').value;changed();};
q('week').onchange=()=>{draft.week=q('week').value;changed();render();};
q('weekends').onchange=()=>{draft.weekends=q('weekends').checked;if(!draft.weekends&&day>=5)day=0;changed();render();};
q('day').onchange=()=>{day=Number(q('day').value);render();};
q('add').onclick=()=>{if(draft.subjects.length<8){draft.subjects.push(emptySubject());changed();render();q('subjects').lastElementChild.querySelector('input').focus();}};
q('publish').onclick=run(async()=>{
 const payload=chartPayload(draft);
 if(!q('attest').checked)throw Error('Confirm that this chart contains class homework only.');
 const {data:verified,error:verifyError}=await client.auth.getUser();
 if(verifyError||verified.user?.id!==user)throw Error('Your account changed. Close and reopen sharing.');
 const {week,...changes}=payload;
 const request=active?client.from(table).update(changes).eq('id',active.id).eq('revision',active.revision):client.from(table).insert(payload);
 const {data,error}=await request.select(fields).maybeSingle();
 if(error)throw Error('The chart could not be published. Check your connection and try again.');
 if(!data)throw Error('The chart was changed or unpublished elsewhere. Close and reopen sharing.');
 charts=[data,...charts.filter(chart=>chart.id!==data.id)].sort((a,b)=>b.week.localeCompare(a.week));
 openDraft(data);listCharts();message('Published. The family link is ready to share.');
});
q('revoke').onclick=run(async()=>{
 if(!active||!confirm('Unpublish this chart? Its link and QR code will stop opening the homework.'))return;
 const {data,error}=await client.from(table).delete().eq('id',active.id).eq('revision',active.revision).select('id').maybeSingle();
 if(error||!data)throw Error('Could not unpublish this chart. It may have changed elsewhere.');
 charts=charts.filter(chart=>chart.id!==active.id);openDraft(null);dirty=false;listCharts();message('Chart unpublished.');
});
q('copy').onclick=async()=>{
 q('url').focus();q('url').select();
 try{await navigator.clipboard.writeText(q('url').value);message('Family link copied.');}
 catch{message('Copy the selected family link.');}
};
addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
if(new URLSearchParams(location.search).has('share'))open();
