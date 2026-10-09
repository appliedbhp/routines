const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('reentering presentation preserves the active session and requests connection recovery',async()=>{
 const session={stage:'running',elapsed:42000,points:1,records:[{number:1}]},els=new Map(),events=[];const $=id=>{if(!els.has(id))els.set(id,{focus(){}});return els.get(id)};
 const ctx=vm.createContext({$,session,projection(){},Event,document:{documentElement:{requestFullscreen:async()=>{}}},window:{dispatchEvent:e=>events.push(e.type),scrollTo(){}}});
 const source=fs.readFileSync('self-monitor/extras.js','utf8');vm.runInContext(source.slice(source.indexOf("$('project').onclick="),source.indexOf('async function exitProjection')),ctx);
 await $('project').onclick();await $('project').onclick();assert.equal(ctx.session,session);assert.equal(session.elapsed,42000);assert.equal(session.points,1);assert.equal(session.records.length,1);assert.deepEqual(events,['self-monitor-presentation','self-monitor-presentation']);
});
