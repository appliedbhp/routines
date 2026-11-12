import {accountClient} from '../cloud/client.js';
import {betaRequest} from '../beta/api.js';
export const hasQRFreePrinting=access=>access?.isAdministrator===true||['family','classroom','family_plus','classroom_plus'].includes(access?.plan);
let show=true,revision=0;
const policy=globalThis.RoutinesPrintQR={get show(){return show;},ready:null};
const style=document.createElement('style');
style.textContent='html.paid-print-no-qr img[src*="/assets/qr/"],html.paid-print-no-qr .wheel-qr,html.paid-print-no-qr .wheel-qr-caption{display:none!important}';
document.head.append(style);
function apply(access){show=!hasQRFreePrinting(access);document.documentElement.classList.toggle('paid-print-no-qr',!show);dispatchEvent(new Event('routines-print-qr-change'));}
async function refresh(){const ticket=++revision;try{const client=await accountClient();const {data,error}=await client.auth.getSession();if(ticket!==revision)return;if(error)throw error;if(!data.session){apply(null);return;}const access=await betaRequest('state');if(ticket===revision)apply(access);}catch{if(ticket===revision)apply(null);}}
addEventListener('routines-plan-change',e=>{++revision;apply(e.detail);});
addEventListener('online',()=>{policy.ready=refresh();});
policy.ready=(async()=>{try{const client=await accountClient();client.auth.onAuthStateChange(()=>{++revision;apply(null);setTimeout(()=>{policy.ready=refresh();},0);});}catch{}await refresh();})();
