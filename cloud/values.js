import {accountClient} from './client.js';
import '../values-blaster/values.js';
const normalize=globalThis.ValuesBlaster.normalize;
let currentUser=null,values=[],revision=0;
function publish(){dispatchEvent(new CustomEvent('routines-values-change',{detail:{signedIn:!!currentUser,userId:currentUser?.id||null,values:[...values]}}));}
async function refresh(){const token=++revision;try{const client=await accountClient();const {data,error}=await client.auth.getUser();if(token!==revision)return;if(error||!data.user){currentUser=null;values=[];}else{currentUser=data.user;values=normalize(currentUser.user_metadata?.routines_values);}publish();}catch{if(token===revision){currentUser=null;values=[];publish();}}}
globalThis.RoutineValues={read:()=>({signedIn:!!currentUser,userId:currentUser?.id||null,values:[...values]}),refresh,async save(selected){const clean=normalize(selected);if(!Array.isArray(selected)||clean.length!==selected.length)throw Error('Choose values from the list before saving.');const client=await accountClient();const {data:session,error:authError}=await client.auth.getUser();if(authError||!session.user)throw Error('Sign in to save your values to your account.');const {data,error}=await client.auth.updateUser({data:{routines_values:clean}});if(error)throw Error('Could not save your values. Check your connection and try again.');currentUser=data.user;values=normalize(data.user.user_metadata?.routines_values);publish();return [...values];}};
await import('../planning/account-values.js');
// Values are preferences, never authorization claims or board records.
try{const client=await accountClient();client.auth.onAuthStateChange(()=>setTimeout(refresh,0));await refresh();}catch{publish();}
addEventListener('online',refresh);
