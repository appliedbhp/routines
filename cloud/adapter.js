/* Runs as a classic script so each existing editor's validated import functions remain authoritative. */
globalThis.CloudBoardAdapter={
 async current(){
  if(document.body.dataset.support)return await currentPayload();
  if(document.getElementById('exportChart'))return await currentChart();
  if(document.getElementById('exportRoutineBtn'))return {format:'routine-visual-timer',version:1,routine:normalizeRoutine(routineRecord())};
  throw Error('Open a visual editor to save a board.');
 },
 blank(p){
  p=JSON.parse(JSON.stringify(p));
  if(p.routine){p.routine.name="Untitled routine";p.routine.steps=[{name:"Step 1",minutes:5,imageUrl:null,pictogramId:null,positions:{}}];p.routine.totalMinutes=5;}
  else if(p.chart){p.chart={name:"Untitled chore chart",person:"",week:"",chores:[]};}
  else if(p.format==="token-board")p.board=TokenData.defaults();
  else if(p.format==="homework-planner"){p.board=HomeworkData.defaults();p.board.subjects=[HomeworkData.subject("")];}
  else if(p.format==="visual-support-board"){p.board.title="Untitled board";p.board.person="";p.board.cards=p.board.cards.slice(0,SupportData.limits[p.board.type][0]).map(()=>({label:"",pictogramId:null,marked:false}));}
  else if(p.format==="self-monitor"){p.board={...SelfMonitor.validateSetup({type:"self-monitor",title:"My self-monitor session",duration:30,interval:5,timing:"equal",variation:1,message:"Are you on track?",yes:1,no:.5,mismatch:0,theme:"classic",showTimer:true,chimes:true,classicColor:"#3185fc"})};}
  this.open(p);return p;
 },
 open(p){
  switch(p.format){
   case 'routine-visual-timer':openRoutine(normalizeRoutine(p.routine));break;
   case 'weekly-chore-chart':openChart(ChoreChartData.validate(p));activeSavedId=null;refreshSavedCharts();break;
   case 'visual-support-board':openBoard(SupportData.validate(p,document.body.dataset.support));activeSavedId=null;savedSelect.value='';break;
   case 'token-board':tokenBoard=TokenData.validate(p);savedTokenId=null;tokenMode='edit';sync();refresh();break;
   case 'homework-planner':planner=HomeworkData.validate(p);savedId=null;sync();refresh();break;
   case 'self-monitor':openSetup(readSetup(p));savedId=null;refreshSetups();break;
   default:throw Error('Unsupported board.');
  }
 }
};
