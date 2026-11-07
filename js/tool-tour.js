const tours={
 'self-monitor':[
 ['#duration','Set a session length','Choose how long to practice staying on track. Set the check-in interval, then choose equal or random timing.'],
 ['#message','Make the check-in your own','Edit the student question. The student answers first; the adult independently rates whether the student is on track. Matching Yes answers earn 1 point and matching No answers earn ½ point by default. You can change the scoring.'],
 ['#theme','Choose the look','Start with your Settings theme or pick a different one for this session. Hide timer hides the numbers while keeping the ring visible.'],
 ['#deviceMode','Choose one or two devices','Use one device together, or choose two devices and show the QR code for the adult to join. The adult can rate check-ins and send encouragement from their phone.'],
 ['#sessionView','Run, pause, and review','Run Session opens the full-screen view. Pause reveals Reset. After the session, print an exit ticket to review points and each person’s on-track ratings. File lets you save, export, import, or share the setup.']
 ],
 'homework-planner':[
 ['#mode','Choose your planner','Simple uses Yes and No buttons to track whether there is homework. Detailed gives you space to write the assignments.'],
 ['#layout','Choose the days','Use a single day or a week. Select a starting date when you want printed weekday headings to include dates.'],
 ['#planner','Add subjects and homework','Edit subjects directly in the planner and add Mulberry, ABHP, and Tawasol pictures. In the simple version, choose the check for Yes or the cancel symbol for No; choose it again to clear it.'],
 ['.file-quick-actions','Save and print','Use File to save on this device or in the cloud, export an .abhp file, or open a saved planner. Print offers portrait and landscape PDFs.'],
 ['#shareHomework','Work with families','Share with families creates a teacher reference and a family link. The separate Teacher tour explains publishing a class week and preparing student and family copies.']
 ],
 routine:[
 ['#presetSelect','Start with a routine','Choose a ready-made routine and select Use routine, or build your own steps.'],
 ['#stepList','Make the steps fit your day','Add or edit steps, pictures, labels, and durations. Put them in the order you want to follow.'],
 ['#autoTotalCheckbox','Check the total time','Auto adds up your steps. You can also set a total duration yourself; the wheel shows how time is divided between the steps.'],
 ['.file-quick-actions','Save or make a printable','Use File to save, open, export, or share your routine. Print lets you adjust the theme and the size and placement of pictures and text before printing.'],
 ['.file-quick-actions','Run the routine','Run Session starts the full-screen timer. Pause and resume as needed, skip to the next step, or use Flexible schedule to advance at your own pace.']
 ]
};
let dialog,target,opener,index,steps;
function clearTarget(){target?.classList.remove('tool-tour-target');target=null;}
function showStep(){
 clearTarget();const [selector,title,description]=steps[index];
 target=document.querySelector(selector);
 if(target?.getClientRects().length){target.classList.add('tool-tour-target');target.scrollIntoView({block:'center',behavior:'instant'});}
 dialog.querySelector('h2').textContent=title;dialog.querySelector('p').textContent=description;
 dialog.querySelector('[data-count]').textContent=`Step ${index+1} of ${steps.length}`;
 dialog.querySelector('[data-back]').disabled=index===0;
 dialog.querySelector('[data-next]').textContent=index===steps.length-1?'Finish':'Next';
 dialog.querySelector('[data-next]').focus({preventScroll:true});
}
export function openTour(tool){
 if(!tours[tool])return;
 if(!dialog){
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../css/tool-tour.css',import.meta.url);document.head.append(css);
  dialog=document.createElement('dialog');dialog.className='tool-tour no-print';dialog.setAttribute('aria-labelledby','toolTourTitle');dialog.setAttribute('aria-describedby','toolTourText');
  dialog.innerHTML='<header><span data-count></span><button type="button" data-close aria-label="Close help tour">×</button></header><h2 id="toolTourTitle"></h2><p id="toolTourText"></p><footer><button type="button" data-back>Back</button><button type="button" data-next>Next</button></footer>';
  document.body.append(dialog);
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-back]').onclick=()=>{if(index>0){index--;showStep();}};
  dialog.querySelector('[data-next]').onclick=()=>{if(index===steps.length-1)dialog.close();else{index++;showStep();}};
  dialog.addEventListener('close',()=>{clearTarget();opener?.focus({preventScroll:true});});
 }
 opener=document.activeElement;steps=tours[tool];index=0;dialog.showModal();showStep();
}
