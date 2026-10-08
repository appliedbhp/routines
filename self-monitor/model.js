const SelfMonitor = (() => {
  function schedule(duration, interval, variation=0, random=Math.random) {
    if(![duration,interval,variation].every(Number.isFinite)||duration<1||duration>90||interval<1||interval>90||variation<0||variation>=interval)throw Error('Use 1–90 minutes; random variation must be smaller than the interval.');
    const ends=[];let time=0;
    while(time<duration*60000){time=Math.min(duration*60000,time+(interval+(random()*2-1)*variation)*60000);ends.push(Math.round(time));}
    return ends;
  }
  function points(student,adult,rules){return student===adult?(student?rules.yes:rules.no):rules.mismatch;}
  function fill(total,index){return Math.max(0,Math.min(1,total-index));}
  function advance(elapsed,delta,boundary){return Math.min(boundary,elapsed+Math.max(0,delta));}
  function validateSetup(b){
    if(!b||typeof b.title!=='string'||!b.title.trim()||b.title.length>100||typeof b.message!=='string'||!b.message.trim()||b.message.length>200)throw Error('Enter a setup name and check-in message.');
    if(!['equal','random'].includes(b.timing)||!['ocean','forest','sunset','space'].includes(b.theme)||typeof b.showTimer!=='boolean')throw Error('Invalid display or interval options.');
    if(!Number.isInteger(b.duration)||!Number.isInteger(b.interval)||!Number.isFinite(b.variation)||b.variation<0||b.variation>89)throw Error('Invalid timing settings.');
    schedule(b.duration,b.interval,b.timing==='random'?b.variation:0,()=>.5);
    for(const value of [b.yes,b.no,b.mismatch])if(!Number.isFinite(value)||value<0||value>3||value*2%1!==0)throw Error('Points must be between 0 and 3 in half-point steps.');
    return {type:'self-monitor',title:b.title,duration:b.duration,interval:b.interval,timing:b.timing,variation:b.variation,message:b.message,yes:b.yes,no:b.no,mismatch:b.mismatch,theme:b.theme,showTimer:b.showTimer};
  }
  return {schedule,points,fill,advance,validateSetup};
})();
