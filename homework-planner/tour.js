(()=>{
 const launch=document.getElementById('homeworkTour');
 const steps=[
  ['#planner','Set up the class week','Choose the week and subjects. Use a detailed planner if you want to enter assignments here first, or start a class chart directly in Share with families.'],
  ['#shareHomework','Create the teacher reference','Open Share with families and sign in. Choose New week or Use current planner. Pick a day, then mark each subject Homework, No homework, or Not posted yet. Add an assignment and due date when relevant.'],
  ['#shareHomework','Publish and share one link','Review the week, confirm it contains class homework only, and publish. Copy the family link. To make a correction, reopen the same chart and choose Update chart so the link and QR code keep working.'],
  ['#shareHomework','Prepare the two copies','Open the family link. Choose Prepare student PDF for a blank chart with None and Not posted yet boxes. Choose Prepare family PDF for the teacher’s entries and Verified boxes. Select Save homework PDF after preparing either copy.'],
  ['#homeworkSkillsTitle','Teach one skill together','Have the student record homework at school and compare their copy with the teacher chart at home. Pick one skill to practice and agree on a cue both adults can use. The guide below links to the EF Roadmap.']
 ];
 const box=document.createElement('section');
 box.className='homework-tour-tip no-print';
 box.setAttribute('role','dialog');box.setAttribute('aria-labelledby','homeworkTourTitle');box.setAttribute('aria-describedby','homeworkTourText');
 box.hidden=true;
 box.innerHTML='<div class="homework-tour-top"><span data-count></span><button type="button" data-close aria-label="Close teacher tour">×</button></div><h2 id="homeworkTourTitle"></h2><p id="homeworkTourText"></p><div class="homework-tour-actions"><button type="button" data-skip>Skip tour</button><div><button type="button" data-back>Back</button><button type="button" data-next>Next</button></div></div>';
 document.body.append(box);
 const q=selector=>box.querySelector(selector);
 let index=0,target,frame=0;
 function position(){
  if(box.hidden)return;
  const r=target.getBoundingClientRect(),gap=12,margin=12,width=box.offsetWidth,height=box.offsetHeight;
  const left=Math.max(margin,Math.min(r.left,innerWidth-width-margin));
  const below=r.bottom+gap,above=r.top-gap-height;
  const placement=below>=margin&&below+height<=innerHeight-margin?'below':above>=margin&&above+height<=innerHeight-margin?'above':'floating';
  box.dataset.placement=placement;
  box.style.left=left+'px';
  box.style.top=(placement==='below'?below:placement==='above'?above:innerHeight-height-margin)+'px';
 }
 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(position);}
 function show(){
  target?.classList.remove('homework-tour-target');
  const [selector,title,description]=steps[index];
  target=document.querySelector(selector);
  target.classList.add('homework-tour-target');
  q('[data-count]').textContent='Teacher tour · '+(index+1)+' of '+steps.length;
  q('h2').textContent=title;q('p').textContent=description;
  q('[data-back]').disabled=index===0;q('[data-next]').textContent=index===steps.length-1?'Finish':'Next';
  box.hidden=false;target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  position();q('[data-next]').focus({preventScroll:true});
 }
 function close(){
  box.hidden=true;target?.classList.remove('homework-tour-target');launch.focus();
 }
 launch.onclick=()=>{index=0;show();};
 q('[data-close]').onclick=q('[data-skip]').onclick=close;
 q('[data-back]').onclick=()=>{if(index>0){index--;show();}};
 q('[data-next]').onclick=()=>{if(index===steps.length-1)close();else{index++;show();}};
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',schedule);
 document.addEventListener('keydown',event=>{if(!box.hidden&&event.key==='Escape'){event.preventDefault();close();}});
})();
