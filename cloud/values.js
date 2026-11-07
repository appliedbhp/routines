import {accountClient} from './client.js';
import {request} from './links.js';
import '../values-blaster/values.js';
const normalize=globalThis.ValuesBlaster.normalize;
let currentUser=null,values=[],revision=0,limit=2;
function publish(){dispatchEvent(new CustomEvent('routines-values-change',{detail:{signedIn:!!currentUser,userId:currentUser?.id||null,values:[...values],limit}}));}
async function refresh(){const token=++revision;try{const client=await accountClient(),{data,error}=await client.auth.getUser();if(token!==revision)return;if(error||!data.user){currentUser=null;values=[];}else{const resources=await request('resources');if(token!==revision)return;currentUser=data.user;values=normalize(resources.values);limit=resources.plan.valueLimit;}publish();}catch{if(token===revision){currentUser=null;values=[];publish();}}}
globalThis.RoutineValues={read:()=>({signedIn:!!currentUser,userId:currentUser?.id||null,values:[...values],limit}),refresh,async save(selected){const clean=normalize(selected);if(!Array.isArray(selected)||clean.length!==selected.length)throw Error('Choose values from the list before saving.');await request('values-save',{values:clean});await refresh();return [...values];}};
await import('../planning/account-values.js');
try{const client=await accountClient();client.auth.onAuthStateChange(()=>setTimeout(refresh,0));await refresh();}catch{publish();}
addEventListener('online',refresh);
await import('../planning/account-goals.js');
