const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('js/game-board.js','utf8');
const read=source.slice(source.indexOf('function read(){'),source.indexOf('\nlaunch.onclick='));
function fixture(board,day=0){return vm.runInNewContext(read+';read()', {homework:true,window:{HomeworkGameBoard:{read:()=>board}},gameDay:{value:String(day)},SymbolLibrary:{imageUrl:id=>'symbol:'+id}});}
const entries=()=>Array.from({length:7},()=>({homework:'',assignment:'',done:false}));
function board(){return {title:'Homework',layout:'week',mode:'simple',subjects:[{name:'Math',pictogramId:123,entries:entries()},{name:'Reading',image:'picture.png',entries:entries()}]};}
test('weekly game uses selected day and excludes No and unanswered subjects',()=>{const b=board();b.subjects[0].entries[4].homework='yes';b.subjects[1].entries[4].homework='no';const result=fixture(b,4);assert.equal(result.items.length,1);assert.equal(result.items[0].label,'Math');assert.equal(result.items[0].image,'symbol:123');assert.match(result.title,/Friday/);assert.throws(()=>fixture(b,0),/mark homework Yes/);});
test('single unnamed day uses first entries and preserves assignment order and images',()=>{const b=board();b.layout='day';b.day=-1;b.mode='detailed';b.subjects[0].entries[0].assignment='Page 12';b.subjects[1].entries[0].assignment='Read chapter 2';const result=fixture(b,6);assert.equal(result.title,'Homework');assert.equal(result.items[0].label,'Math: Page 12');assert.equal(result.items[1].label,'Reading: Read chapter 2');assert.equal(result.items[1].image,'picture.png');});
test('blank detailed assignments produce helpful empty-state error',()=>{const b=board();b.mode='detailed';b.subjects[0].entries[0].assignment='   ';assert.throws(()=>fixture(b),/write an assignment/);});
