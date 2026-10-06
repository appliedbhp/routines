const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../chore-chart/data.js'),'utf8') + '\nthis.data = ChoreChartData;', context);
const data = context.data;
const chart = {name:'My chart',person:'Demo family',week:'October 6',chores:[{name:'Make bed',pictogramId:5481,checked:[true,false,false,false,false,false,true]},{name:'No picture',pictogramId:null,checked:Array(7).fill(false)}]};
test('file roundtrip preserves names, week, icons, no-icon choice, and checkmarks',()=>{
 const result = data.validate(JSON.parse(JSON.stringify(data.serialize(chart))));
 assert.equal(JSON.stringify(result),JSON.stringify(chart));
});
test('rejects malformed versions, oversized charts, invalid symbols, and checkmarks',()=>{
 for (const change of [p=>p.version=2,p=>p.chart.chores=Array(11).fill(chart.chores[0]),p=>p.chart.chores[0].pictogramId='javascript:alert(1)',p=>p.chart.chores[0].checked=[true],p=>p.chart.chores[0].checked[0]='true',p=>p.chart.name='a'.repeat(101)]) {
  const payload = JSON.parse(JSON.stringify(data.serialize(chart))); change(payload); assert.throws(()=>data.validate(payload));
 }
});
test('drops unknown fields and arbitrary image URLs from imported records',()=>{
 const payload = JSON.parse(JSON.stringify(data.serialize(chart)));payload.chart.chores[0].imageUrl='javascript:alert(1)';payload.chart.extra='ignored';
 const result=data.validate(payload); assert.equal(result.extra,undefined);assert.equal(result.chores[0].imageUrl,undefined);
});
