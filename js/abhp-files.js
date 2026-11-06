/* .abhp is a versioned JSON document, never executable code. */
(function(root){
 const paths={'routine-visual-timer':'routine','weekly-chore-chart':'chore-chart','token-board':'token-board','homework-planner':'homework-planner','self-monitor':'self-monitor','yearly-planner':'yearly-planner','quarterly-planner':'quarterly-planner','monthly-planner':'monthly-planner','committed-action-tracker':'committed-action-tracker'};
 function destination(p){if(!p||![1,2].includes(p.version))throw Error('Unsupported ABHP file version.');if(p.format==='visual-support-board'&&['first-then','choice-board','task-strip','now-next-later','calm-down'].includes(p.board?.type))return p.board.type;if(paths[p.format])return paths[p.format];throw Error('This file is not a supported board, routine, or setup.');}
 const api={destination};root.ABHPFiles=api;if(typeof module!=='undefined'){module.exports=api;return;}
 const siteRoot=new URL('../',root.ABHPFileScriptURL);
 const pendingKey='routines.abhp.pending.v1';
 async function route(file){if(file.size>5*1024*1024)throw Error('Choose a file smaller than 5 MB.');const text=await file.text(),payload=JSON.parse(text),path=destination(payload);sessionStorage.setItem(pendingKey,JSON.stringify({path,text}));location.assign(new URL(path+'/',siteRoot));}
 api.route=route;
 // Keep existing per-tool validators as the authority for imported data.
 async function receive(){let pending;try{pending=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(!pending||!location.pathname.replace(/index\.html$/, '').endsWith('/'+pending.path+'/'))return;sessionStorage.removeItem(pendingKey);const input=document.querySelector('#importFile,#importRoutineInput');if(!input)throw Error('Use Import file to open this document.');const transfer=new DataTransfer();transfer.items.add(new File([pending.text],'document.abhp',{type:'application/json'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){alert('Could not open file: '+e.message);}}
 if(document.readyState==='complete')receive();else addEventListener('load',receive,{once:true});
 let replaying=false;
 document.addEventListener('change',async event=>{const input=event.target;if(replaying||!input.matches?.('#importFile,#importRoutineInput')||!input.files?.[0]||!input.accept.includes('.abhp'))return;event.stopImmediatePropagation();const file=input.files[0];try{if(file.size>5*1024*1024)throw Error('Choose a file smaller than 5 MB.');const p=JSON.parse(await file.text()),path=destination(p);if(!location.pathname.replace(/index\.html$/, '').endsWith('/'+path+'/')){if(confirm('Open this file in '+path.replaceAll('-',' ')+'?'))await route(file);return;}replaying=true;try{input.dispatchEvent(new Event('change',{bubbles:true}));}finally{replaying=false;}}catch(e){alert('Could not open file: '+e.message);}},true);
})(globalThis);
