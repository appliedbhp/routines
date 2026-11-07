import {accountClient} from '../cloud/client.js';
import {plan} from '../beta/api.js';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../css/consultation.css',import.meta.url);document.head.append(css);
let button=document.querySelector('.consultation-button');
if(!button){button=document.createElement('a');button.className='consultation-button no-print';button.textContent='Schedule consultation';document.body.append(button);}
button.href='https://calendar.app.google/5GYCTupHziopu9hw9';button.target='_blank';button.rel='noopener noreferrer';button.classList.add('shared-consultation');button.hidden=true;
let revision=0;
async function refresh(){const current=++revision;button.hidden=true;try{const client=await accountClient(),{data,error}=await client.auth.getSession();if(current!==revision)return;if(error)throw error;if(!data.session){button.hidden=false;return;}const access=await plan();if(current===revision)button.hidden=access.plan!=='free';}catch{/* Avoid showing an upgrade prompt to a paid user while account access is unavailable. */}}
try{const client=await accountClient();client.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();}catch{button.hidden=false;}
addEventListener('routines-plan-change',event=>{button.hidden=event.detail?.plan!=='free';});
addEventListener('online',refresh);addEventListener('focus',refresh);
