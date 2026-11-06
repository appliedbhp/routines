const {test}=require('node:test'),assert=require('node:assert/strict');
const audience=require('../js/audience.js');
test('age profiles contain exactly the requested tool sets',()=>{
 assert.deepEqual(audience.profiles.young.tools,['routine','chore-chart','task-strip','now-next-later','first-then','choice-board','token-board']);
 assert.deepEqual(audience.profiles.child.tools,['routine','chore-chart','task-strip','now-next-later','choice-board','token-board','self-monitor','homework-planner']);
 for(const age of ['teen','adult'])assert.deepEqual(audience.profiles[age].tools,['routine','homework-planner','self-monitor']);
 assert.equal(audience.allows('child','first-then'),false);assert.equal(audience.allows('all','future-tool'),true);
});
test('missing or invalid local preferences keep all tools visible',()=>{
 assert.deepEqual(audience.normalize({age:'invalid',textOnly:'true'}),{age:'all',textOnly:false});
 assert.deepEqual(audience.read(),{age:'all',textOnly:false});
 assert.deepEqual(audience.normalize({age:'teen',textOnly:true,name:'not stored'}),{age:'teen',textOnly:true});
});
