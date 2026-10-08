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
  return {schedule,points,fill,advance};
})();
