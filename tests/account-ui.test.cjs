const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('cloud/ui.js','utf8');
test('account navigation follows signed-in and signed-out state',()=>{
 const signIn={},signOut={},title={},heading={};
 const body=source.match(/function accountState\(signedIn\)\{([^\n]+)\}/)[1];
 const context={signIn,signOut,document:{getElementById:()=>title},q:()=>heading};vm.createContext(context);vm.runInContext(`function accountState(signedIn){${body}}`,context);
 context.accountState(true);assert.equal(signIn.hidden,true);assert.equal(signOut.hidden,false);assert.equal(title.textContent,'My account');
 context.accountState(false);assert.equal(signIn.hidden,false);assert.equal(signOut.hidden,true);assert.equal(heading.textContent,'Sign in to your account');
});
test('password setup waits for a click instead of occupying the initialization lock',()=>{
 const handler=source.match(/q\('\[data-set-password\]'\)\.onclick=([^\n]+);/)[1];let runs=0;
 const onclick=vm.runInNewContext(handler,{run:()=>runs++});assert.equal(runs,0);assert.equal(typeof onclick,'function');onclick();assert.equal(runs,1);
});
