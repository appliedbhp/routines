const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = process.env.TIMER_PROJECT || path.resolve(__dirname, '..');
function harness() {
  let now = new Date('2026-09-09T10:00:00Z').getTime();
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, { value:'', style:{}, textContent:'', setAttribute(){}, classList:{toggle(){}} }); return elements.get(id); };
  const context = vm.createContext({ console, URL, Blob, Object, Set, Audio:class { cloneNode(){ return {play(){ return Promise.resolve(); },pause(){}}; } },
    Date:class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now(){return now;} },
    document:{getElementById:get}, setInterval:()=>1, clearInterval(){}, setTimeout:()=>1, clearTimeout(){} });
  vm.runInContext(fs.readFileSync(path.join(root,'js/themes.js'),'utf8'),context);
  let source=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  source=source.replace(/\(async function init\(\) \{[\s\S]*?\}\)\(\);/, '');
  vm.runInContext(source,context);
  vm.runInContext(`renderWheelInto = (id, opts) => { captured = opts; }; state.steps = [{id:'a',name:'One',minutes:5},{id:'b',name:'Two',minutes:5}]; state.totalMinutes=10;`,context);
  return { run:code=>vm.runInContext(code,context), advance:ms=>now+=ms, get };
}
test('resume preserves progress and shifts time anchors by the pause duration immediately',()=>{
  const h=harness(); h.run('startTimer()');h.advance(60000);h.run('pauseTimer()');
  const before=h.run('captured.boundaryBaseTime.getTime()');
  h.advance(120000);h.run('startTimer()');
  assert.equal(h.run('getElapsedMinutes()'),1);
  assert.equal(h.run('captured.boundaryBaseTime.getTime()')-before,120000);
  assert.equal(h.get('stagePlayBtn').disabled,true);assert.equal(h.get('stagePauseBtn').disabled,false);
});
test('flexible mode holds at the boundary, rebases after waiting, and completes only on Next',()=>{
  const h=harness();h.run('state.flexible=true; startTimer()');h.advance(420000);h.run('tickProjection()');
  assert.equal(h.run('getElapsedMinutes()'),5);assert.equal(h.get('projCurrentName').textContent,'One');
  assert.equal(h.get('projCurrentTime').textContent,'Ready for next step');
  h.run('nextStep()');assert.equal(h.get('projCurrentName').textContent,'Two');
  assert.equal(h.run('getElapsedMinutes()'),5);h.advance(60000);assert.equal(h.run('getElapsedMinutes()'),6);
  h.run('nextStep()');assert.equal(h.get('projCurrentName').textContent,'All done!');
  assert.equal(h.run('state.timer.running'),false);assert.equal(h.get('stageNextBtn').disabled,true);
});
test('Next while paused stays paused and timed completion stops its interval',()=>{
  const h=harness();h.run('state.flexible=true; nextStep()');assert.equal(h.run('state.timer.running'),false);
  assert.equal(h.run('getElapsedMinutes()'),5);
  h.run('state.flexible=false; resetTimer(); startTimer()');h.advance(600000);h.run('tickProjection(true)');
  assert.equal(h.run('state.timer.running'),false);assert.equal(h.run('state.timer.intervalId'),null);
});
test('export format roundtrips settings and positions, dropping unknown properties',()=>{
  const h=harness();h.run(`state.theme='boho'; state.flexible=true; state.steps[0].positions={print:{label:{x:0.2,y:-0.1}}}; record=normalizeRoutine(JSON.parse(JSON.stringify(routineRecord('Test'))));`);
  assert.equal(h.run('record.settings.theme'),'boho');assert.equal(h.run('record.settings.flexible'),true);
  assert.equal(h.run('record.steps[0].positions.print.label.x'),0.2);
  assert.equal(h.run('record.steps[0].id'),undefined);
});
test('imports reject bad durations, unsafe image schemes, and invalid position offsets',()=>{
  for (const mutate of [`r.steps[0].minutes=-1`,`r.steps[0].imageUrl='javascript:alert(1)'`,`r.steps[0].positions={print:{icon:{x:Infinity,y:0}}}`,`r.steps=[]`]) {
    const h=harness();assert.throws(()=>h.run(`r=routineRecord('Test');${mutate}; normalizeRoutine(r)`),/Invalid routine/);
    assert.equal(h.run('state.steps.length'),2);
  }
});
test('quiet mode blocks audio and per-sound settings are respected',()=>{
  const h=harness();h.run(`plays=0; soundCache.chime.cloneNode=()=>({play:()=>{plays++;return Promise.resolve()},pause:()=>{}});playSound('chime')`);
  assert.equal(h.run('plays'),0);h.run(`state.quiet=false;state.sounds.chime=false;playSound('chime')`);assert.equal(h.run('plays'),0);
  h.run(`state.sounds.chime=true;playSound('chime')`);assert.equal(h.run('plays'),1);
});
test('timed Next skips to the next boundary, rebases anchors, and preserves pause state',()=>{
  const h=harness();h.run('startTimer()');h.advance(60000);h.run('nextStep()');
  assert.equal(h.run('getElapsedMinutes()'),5);assert.equal(h.get('projCurrentName').textContent,'Two');
  assert.equal(h.run('state.timer.running'),true);assert.equal(h.get('stageNextBtn').hidden,false);
  assert.equal(h.run('captured.boundaryBaseTime.getTime()'),new Date('2026-09-09T09:56:00Z').getTime());
  h.run('pauseTimer(); nextStep()');assert.equal(h.run('state.timer.running'),false);
  assert.equal(h.get('projCurrentName').textContent,'All done!');assert.equal(h.get('stageNextBtn').disabled,true);
});
