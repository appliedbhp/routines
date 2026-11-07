import {accountClient} from '../cloud/client.js';
import {plan} from '../beta/api.js';
const root=new URL('../',import.meta.url),home=location.pathname===root.pathname||location.pathname===root.pathname+'index.html';
// A quiet invitation on the tool directory and planning pages, never inside a student activity.
if(home||document.body.dataset.planner){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('support/style.css',root);document.head.append(css);
 const footer=document.createElement('aside');footer.className='support-tip-footer no-print';footer.hidden=true;
 const link=document.createElement('a');link.href=new URL('support/',root);link.textContent='Help keep this site free through tips';const note=document.createElement('p');note.textContent='Optional support from parents, educators, and other adults.';footer.append(link,note);document.querySelector('main')?.append(footer);
 let revision=0,eligible=false;
 function render(){const age=globalThis.RoutineAudience?.read().age;footer.hidden=!eligible||['young','child','teen'].includes(age)||!!document.fullscreenElement;}
 async function refresh(){const rev=++revision;eligible=false;render();try{const client=await accountClient(),{data,error}=await client.auth.getSession();if(rev!==revision)return;if(error)throw error;if(!data.session){eligible=true;render();return;}const access=await plan();if(rev===revision){eligible=access.plan==='free';render();}}catch{}}
 try{const client=await accountClient();client.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();}catch{}
 addEventListener('routines-plan-change',e=>{++revision;eligible=e.detail?.plan==='free';render();});addEventListener('routines-audience-change',render);addEventListener('fullscreenchange',render);addEventListener('online',refresh);
}
