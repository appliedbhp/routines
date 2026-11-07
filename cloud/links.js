import {accountClient} from './client.js';
let state={signedIn:false,userId:null,groups:[],links:[],dates:[],values:[],sharedBoards:[],sharedGoals:[],shares:[],error:''},revision=0;
export async function request(action,args={}){const c=await accountClient(),{data,error}=await c.auth.getSession();if(error||!data.session)throw Error('Sign in to link accounts.');const r=await c.functions.invoke('routine-account-links',{body:{action,args}});if(r.error){let message;try{message=(await r.error.context.json()).error;}catch{}throw Error(message||'Account links are unavailable. Check your connection and try again.');}if(r.data?.error)throw Error(r.data.error);return r.data;}
function publish(){dispatchEvent(new Event('routines-links-change'));}
export async function refresh(){const token=++revision;try{const c=await accountClient(),{data}=await c.auth.getSession();if(token!==revision)return;if(!data.session){state={signedIn:false,userId:null,groups:[],links:[],dates:[],values:[],sharedBoards:[],sharedGoals:[],shares:[],error:''};publish();return;}const result=await request('state');if(token!==revision)return;state={signedIn:true,userId:data.session.user.id,...result,error:''};publish();}catch(e){if(token===revision){state={signedIn:false,userId:null,groups:[],links:[],dates:[],values:[],sharedBoards:[],sharedGoals:[],shares:[],error:e.message};publish();}}}
export const read=()=>structuredClone(state);
export async function change(action,args){const result=await request(action,args);await refresh();return result;}
globalThis.RoutineLinks={read,refresh,request,change};
try{const c=await accountClient();c.auth.onAuthStateChange((event)=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)){revision++;state={signedIn:false,userId:null,groups:[],links:[],dates:[],values:[],sharedBoards:[],sharedGoals:[],shares:[],error:''};publish();setTimeout(refresh,0);}});await refresh();}catch{}
addEventListener('focus',refresh);addEventListener('online',refresh);
