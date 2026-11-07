const {test}=require('node:test'),assert=require('node:assert/strict');
const audience=require('../js/audience.js');
test('age profiles contain exactly the requested tool sets',()=>{
 assert.deepEqual(audience.profiles.young.tools,['routine','chore-chart','task-strip','now-next-later','first-then','choice-board','token-board']);
 assert.deepEqual(audience.profiles.child.tools,['routine','chore-chart','task-strip','now-next-later','choice-board','token-board','self-monitor','homework-planner']);
 assert.deepEqual(audience.profiles.teen.tools,['routine','homework-planner','self-monitor','yearly-planner','quarterly-planner','monthly-planner','weekly-planner','daily-planner','meal-planner','committed-action-tracker','values-blaster','my-character','maintenance','touchpoints']);
 assert.deepEqual(audience.profiles.adult.tools,['implementation-intentions',...audience.profiles.teen.tools.filter(tool=>tool!=='routine')]);
 assert.equal(audience.allows('child','first-then'),false);assert.equal(audience.allows('all','future-tool'),true);
});
test('missing or invalid local preferences keep all tools visible',()=>{
 assert.deepEqual(audience.normalize({age:'invalid',textOnly:'true'}),{age:'all',textOnly:false,theme:'classic'});
 assert.deepEqual(audience.read(),{age:'all',textOnly:false,theme:'classic'});
 assert.deepEqual(audience.normalize({age:'teen',textOnly:true,name:'not stored'}),{age:'teen',textOnly:true,theme:'classic'});
});

test('theme preferences support existing tool themes and reject unknown values',()=>{
 assert.equal(audience.normalize({theme:'ocean'}).theme,'ocean');
 assert.equal(audience.normalize({theme:'unknown'}).theme,'classic');
 assert.equal(audience.normalize({age:'child',textOnly:true,theme:'forest'}).theme,'forest');
});
test('tool defaults select supported themes and preserve a restored self-monitor session',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync('js/workspace.js','utf8');const start=source.indexOf('  function defaultToolTheme(){'),end=source.indexOf("  if(document.readyState",start);let restored=false,changes=0;
 const select={tagName:'SELECT',options:[{value:'classic'},{value:'ocean'}],value:'classic',dispatchEvent(){changes++;}};
 const context={audience:{read:()=>({theme:'ocean'})},sessionStorage:{getItem:()=>restored?'saved':null},document:{getElementById:id=>id==='setupName'?{}:id==='theme'?select:null},Event:class{}};
 vm.runInNewContext(source.slice(start,end)+';defaultToolTheme();',context);assert.equal(select.value,'ocean');assert.equal(changes,1);
 restored=true;select.value='forest';context.defaultToolTheme();assert.equal(select.value,'forest');assert.equal(changes,1);
});
test('custom tool selection overrides age defaults and can be reset',()=>{assert.equal(audience.allows('young','daily-planner',['daily-planner']),true);assert.equal(audience.allows('all','routine',[]),false);assert.deepEqual(audience.normalize({tools:['routine','routine',null]}).tools,['routine']);assert.equal(audience.allows('young','routine',undefined),true);});
