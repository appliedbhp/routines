const {test}=require('node:test'),assert=require('node:assert/strict');
const id='4c628a28-1e44-4cae-83a9-b89179c67116';
const now=Date.parse('2026-11-07T12:00:00Z');
test('invitation parsing deduplicates emails, picks matching links and rejects bad input',async()=>{
 const {invitation,BETA_CLOSE}=await import('../cloud/management/invitations.mjs');
 const value=invitation({kind:'free',emails:'A@example.com, b@example.com; a@example.com\n'},now);assert.deepEqual(value.emails,['a@example.com','b@example.com']);assert.equal(value.url,'https://routines.getadhd.care/account/');
 assert.equal(invitation({kind:'beta',emails:'a@example.com'},now).url,'https://routines.getadhd.care/beta/');
 for(const patch of [{kind:'admin'},{emails:''},{emails:'a@example.com invalid'},{emails:'a@example.com\nBcc: victim@example.com'},{emails:Array.from({length:51},(_,i)=>i+'@example.com').join(',')}])assert.throws(()=>invitation({kind:'free',emails:'a@example.com',...patch},now));
 assert.throws(()=>invitation({kind:'beta',emails:'a@example.com'},BETA_CLOSE));
 assert.doesNotThrow(()=>invitation({kind:'free',emails:'a@example.com'},BETA_CLOSE));
});
function memory(){let row;return {get:async()=>row,create:async v=>{row??=structuredClone(v)},update:async(_,v)=>Object.assign(row,v)};}
test('sends private individual messages and safely replays successful batches',async()=>{
 const {sendInvitationBatch}=await import('../cloud/management/invitations.mjs');let calls=0;const store=memory(),opts={store,apiKey:'test',now,fetcher:async(url,req)=>{calls++;assert.equal(url,'https://api.resend.com/emails/batch');const messages=JSON.parse(req.body);assert.equal(messages.length,2);assert.deepEqual(messages[0].to,['a@example.com']);assert.equal(messages[0].bcc,undefined);assert.match(messages[0].text,/account\//);assert.equal(req.headers['Idempotency-Key'],'routines-invitations-'+id);return new Response(JSON.stringify({data:[{id:'one'},{id:'two'}]}));}};
 const body={id,kind:'free',emails:'b@example.com,a@example.com',confirmed:true};assert.equal((await sendInvitationBatch(body,'admin',opts)).accepted,2);assert.equal((await sendInvitationBatch(body,'admin',opts)).replayed,true);assert.equal(calls,1);
 await assert.rejects(sendInvitationBatch({...body,emails:'other@example.com'},'admin',opts));await assert.rejects(sendInvitationBatch(body,'other-admin',opts));await assert.rejects(sendInvitationBatch({...body,confirmed:false},'admin',opts));assert.equal(calls,1);
});
test('uncertain delivery retries with identical idempotency key and expires before provider key expiry',async()=>{
 const {sendInvitationBatch}=await import('../cloud/management/invitations.mjs');const store=memory(),body={id,kind:'beta',emails:'a@example.com',confirmed:true};let requests=[];
 const opts={store,apiKey:'test',now,fetcher:async(_,r)=>{requests.push(r);throw Error('timeout')}};
 await assert.rejects(sendInvitationBatch(body,'admin',opts));assert.equal((await store.get()).status,'uncertain');
 opts.fetcher=async(_,r)=>{requests.push(r);return new Response(JSON.stringify({data:[{id:'sent'}]}));};await sendInvitationBatch(body,'admin',opts);assert.equal(requests[0].body,requests[1].body);assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);
 await store.update(id,{status:'uncertain'});await assert.rejects(sendInvitationBatch(body,'admin',{...opts,now:now+23*3600000}));assert.equal(requests.length,2);
});
test('invitation actions are behind confirmed-user and administrator checks',()=>{const fs=require('node:fs'),s=fs.readFileSync('cloud/management/index.ts','utf8');assert.ok(s.indexOf("body.action==='invite-send'")>s.indexOf("allowed.data!==true"));assert.ok(s.indexOf("body.action==='list'")>s.indexOf("allowed.data!==true"));});
test('installed file handler uses Routines icons and existing type-aware opener',()=>{const fs=require('node:fs'),m=JSON.parse(fs.readFileSync('manifest.webmanifest'));assert.equal(m.file_handlers[0].action,'/open/');assert.deepEqual(m.file_handlers[0].accept['application/json'],['.abhp']);assert.equal(m.file_handlers[0].launch_type,'multiple-clients');assert.ok(m.file_handlers[0].icons.every(i=>i.src.includes('app-icon-')&&fs.existsSync(i.src)));const {destination}=require('../js/abhp-files.js');assert.equal(destination({format:'routine-visual-timer',version:1}),'routine');assert.equal(destination({format:'visual-support-board',version:1,board:{type:'choice-board'}}),'choice-board');assert.equal(destination({format:'meal-planner',version:1}),'meal-planner');assert.throws(()=>destination({format:'https://evil.example',version:1}));});
