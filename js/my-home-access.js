import {accountClient} from '../cloud/client.js';
import {betaRequest} from '../beta/api.js';
export const isMyHomePaid=a=>a?.isAdministrator===true||['family','classroom','family_plus','classroom_plus'].includes(a?.plan);
let state={status:'loading',allowed:false,userId:null},revision=0,subscribed=false;
const lock='<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M6 9V6a6 6 0 0 1 12 0v3h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2zm3 0h6V6a3 3 0 0 0-6 0zm3 5a2 2 0 0 0-1 3.73V20h2v-2.27A2 2 0 0 0 12 14"/></svg>';
const home='<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="m12 2 11 9-2 2-2-1.64V22h-5v-7h-4v7H5V11.36L3 13l-2-2z"/></svg>';
function apply(next){state=next;document.querySelectorAll('[data-tool="my-home"] .nav-icon,.tool-card[href="my-home/"] .tool-preview').forEach(el=>{el.innerHTML=state.allowed?home:lock;});document.querySelectorAll('[data-tool="my-home"],.tool-card[href="my-home/"]').forEach(el=>{el.title=state.allowed?'My Home':'My Home · Paid feature';el.setAttribute('aria-label',el.title);});dispatchEvent(new CustomEvent('routines-my-home-access',{detail:state}));}
export function syncMyHomeIcons(){apply(state);}
export function currentMyHomeAccess(){return state;}
export async function refreshMyHomeAccess(){const ticket=++revision;apply({status:'loading',allowed:false,userId:state.userId});try{const client=await accountClient();if(!subscribed){subscribed=true;client.auth.onAuthStateChange(()=>{++revision;apply({status:'loading',allowed:false,userId:null});setTimeout(refreshMyHomeAccess,0);});}const {data,error}=await client.auth.getSession();if(error)throw error;if(ticket!==revision)return state;if(!data.session){apply({status:'ready',allowed:false,userId:null});return state;}const access=await betaRequest('state');if(ticket===revision)apply({status:'ready',allowed:isMyHomePaid(access),userId:data.session.user.id});}catch{if(ticket===revision)apply({status:'error',allowed:false,userId:null});}return state;}
addEventListener('routines-plan-change',refreshMyHomeAccess);
addEventListener('online',refreshMyHomeAccess);
addEventListener('offline',()=>{++revision;apply({status:'error',allowed:false,userId:null});});
// Recheck after returning to a tab; never grant access from a local plan label.
let lastCheck=Date.now();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastCheck>60000){lastCheck=Date.now();refreshMyHomeAccess();}});
refreshMyHomeAccess();
