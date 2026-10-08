/* Runs as a classic script so each existing editor's validated import functions remain authoritative. */
globalThis.CloudBoardAdapter={
 async current(){
  if(document.body.dataset.support)return await currentPayload();
  if(document.getElementById('exportChart'))return await currentChart();
  if(document.getElementById('exportRoutineBtn'))return {format:'routine-visual-timer',version:1,routine:normalizeRoutine(routineRecord())};
  throw Error('Open a visual editor to save a board.');
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
