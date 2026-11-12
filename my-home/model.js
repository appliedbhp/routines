(function(root){
 const formats=['family','classroom','family_plus','classroom_plus'];
 const paid=a=>a?.isAdministrator===true||formats.includes(a?.plan);
 const uid=()=>globalThis.crypto.randomUUID();
 const blank=()=>({id:uid(),name:'',routine:'Morning / getting ready',room:'',items:[],cue:'',note:'',status:'setting-up'});
 function validate(data){
  if(!data||data.format!=='my-home'||data.version!==1||!Array.isArray(data.plans)||data.plans.length>100)throw Error('Choose a valid My Home .abhp file with up to 100 plans.');
  const text=(v,n)=>{if(typeof v!=='string'||v.length>n)throw Error('This file contains invalid or overly long text.');return v;};
  const plan=p=>{if(!p||!Array.isArray(p.items)||p.items.length>50||!['setting-up','ready'].includes(p.status))throw Error('This plan is not valid.');return {id:text(p.id,100),name:text(p.name,100),routine:text(p.routine,100),room:text(p.room,100),cue:text(p.cue,40),note:text(p.note,1000),status:p.status,items:p.items.map(i=>({id:text(i.id,100),text:text(i.text,500),done:i.done===true}))};};
  const plans=data.plans.map(plan);if(new Set(plans.map(p=>p.id)).size!==plans.length)throw Error('The file has duplicate plans.');
  return {format:'my-home',version:1,plans,draft:data.draft?plan(data.draft):blank()};
 }
 const api={paid,blank,validate,uid};root.MyHomeModel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
