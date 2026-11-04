const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const sharing=import('data:text/javascript;base64,'+readFileSync('homework-planner/sharing.js').toString('base64'));

test('publishing copies class assignments without student information or progress',async()=>{
 const {fromPlanner,chartPayload}=await sharing;
 const board={title:'Student’s planner',person:'Student',week:'2026-11-04',weekends:false,subjects:[{
  name:'Math',image:'private-image',entries:[
   {homework:'yes',assignment:'Problems 1–5',done:true},
   {homework:'no',assignment:'',done:false},
   ...Array.from({length:5},()=>({homework:'',assignment:'',done:false}))
  ]
 }]};
 const published=chartPayload(fromPlanner(board));
 assert.equal(published.title,'Class homework');
 assert.equal(published.week,'2026-11-02');
 assert.deepEqual(published.subjects[0].entries.slice(0,3),[
  {status:'assigned',assignment:'Problems 1–5',due:''},
  {status:'none',assignment:'',due:''},
  {status:'pending',assignment:'',due:''}
 ]);
 assert.doesNotMatch(JSON.stringify(published),/Student|private-image|done/);
});

test('today stays within the published week and respects the weekend setting',async()=>{
 const {visibleDay}=await sharing;
 const chart={week:'2026-11-02',weekends:false};
 assert.equal(visibleDay(chart,new Date('2026-11-02T00:00:00Z')),0);
 assert.equal(visibleDay(chart,new Date('2026-11-06T00:00:00Z')),4);
 assert.equal(visibleDay(chart,new Date('2026-11-07T00:00:00Z')),null);
 assert.equal(visibleDay({...chart,weekends:true},new Date('2026-11-08T00:00:00Z')),6);
 assert.equal(visibleDay(chart,new Date('2026-11-09T00:00:00Z')),null);
});
