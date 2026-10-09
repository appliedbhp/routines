const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('exit ticket includes encouragement even before the first check-in',()=>{
 const make=()=>({children:[],textContent:'',setAttribute(){},append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]}}),elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id)};
 let printed=false;const ctx=vm.createContext({$,session:{title:'Test session',startedAt:new Date().toISOString(),stage:'paused',message:'On track?',elapsed:2000,total:60000,points:0,records:[],ends:[60000],rules:{yes:1,no:.5,mismatch:0},encouragement:[{kind:'comment',elapsed:1000}]},document:{createElement:make},report:fn=>fn(),timeText:ms=>String(ms),window:{print(){printed=true}},Date});
 vm.runInContext(fs.readFileSync('self-monitor/reactions.js','utf8'),ctx);vm.runInContext(fs.readFileSync('self-monitor/results-summary.js','utf8'),ctx);
 const code=fs.readFileSync('self-monitor/extras.js','utf8').split("$('printExit').onclick=")[1];vm.runInContext("$('printExit').onclick="+code,ctx);$('printExit').onclick();
 const text=n=>typeof n==='string'?n:n.textContent+' '+n.children.map(text).join(' ');assert.match(text($('studentCard')),/Overall score/);assert.match(text($('studentCard')),/No completed check-ins yet/);assert.match(text($('studentCard')),/Encouragement received/);assert.match(text($('studentCard')),/Great comment!/);assert.equal(printed,true);
});
