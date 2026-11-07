import {accountClient} from '../cloud/client.js';
import {plan} from '../beta/api.js';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../css/consultation.css',import.meta.url);document.head.append(css);
let button=document.querySelector('.consultation-button');
if(!button){button=document.createElement('a');button.className='consultation-button no-print';button.textContent='Schedule consultation';document.body.append(button);}
button.href='https://calendar.app.google/5GYCTupHziopu9hw9';button.target='_blank';button.rel='noopener noreferrer';button.classList.add('shared-consultation');button.hidden=true;
let revision=0,eligible=false,lastScroll=0,hideTimer;
function render(){button.hidden=!eligible||!lastScroll||Date.now()-lastScroll>=15000;}
addEventListener('scroll',()=>{lastScroll=Date.now();clearTimeout(hideTimer);render();hideTimer=setTimeout(render,15000);},{passive:true,capture:true});
async function refresh(){const current=++revision;eligible=false;render();try{const client=await accountClient(),{data,error}=await client.auth.getSession();if(current!==revision)return;if(error)throw error;if(!data.session){eligible=true;render();return;}const access=await plan();if(current===revision){eligible=access.plan==='free';render();}}catch{/* Keep paid accounts hidden when their plan cannot be checked. */}}
try{const client=await accountClient();client.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();}catch{eligible=true;render();}
addEventListener('routines-plan-change',event=>{++revision;eligible=event.detail?.plan==='free';render();});
addEventListener('online',refresh);addEventListener('focus',refresh);
