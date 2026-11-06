const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Planning=require('../planning/model.js');global.Planning=Planning;const PlanningRender=require('../planning/render.js');
test('completed printing remains available after blank printing even without afterprint',()=>{
 const board=Planning.defaults('meal-planner');board.meal.value='Connection';board.meal.days[0][0]='Oatmeal and berries';
 const nodes={},classes=new Set(),listeners={};let prints=0;
 for(const id of ['plannerPages','printBoard','printBlank','blankButton'])nodes[id]={innerHTML:'original completed editor',before(n){nodes[n.id]=n;},after(n){nodes[n.id]=n;}};
 const context=vm.createContext({board,type:'meal-planner',Planning,PlanningRender,structuredClone,$:id=>nodes[id],document:{body:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},createElement:()=>({remove(){delete nodes[this.id];}})},window:{print(){prints++;}},addEventListener:(name,fn)=>listeners[name]=fn});
 const source=fs.readFileSync('planning/app.js','utf8'),start=source.indexOf(' function resetPrint()'),end=source.indexOf(" $('sharePlanner')",start);vm.runInContext(source.slice(start,end),context);
 nodes.blankButton.onclick();assert.equal(prints,1);assert.equal(nodes.plannerPages.innerHTML,'original completed editor');assert.doesNotMatch(nodes.blankPrintPages.innerHTML,/Oatmeal and berries/);assert.ok(classes.has('printing-blank'));
 // Some browsers do not deliver afterprint reliably. The next completed print must still work.
 nodes.completedButton.onclick();assert.equal(prints,2);assert.equal(classes.has('printing-blank'),false);assert.equal(nodes.blankPrintPages,undefined);assert.match(nodes.plannerPages.innerHTML,/Oatmeal and berries/);assert.match(nodes.plannerPages.innerHTML,/Connection/);
 nodes.printBoard.onclick();assert.equal(prints,3);nodes.printBlank.onclick();listeners.afterprint();assert.equal(classes.has('printing-blank'),false);assert.equal(board.meal.days[0][0],'Oatmeal and berries');
});
