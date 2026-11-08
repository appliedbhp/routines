import {accountClient} from '../cloud/client.js';
import {betaRequest} from '../beta/api.js';
import {pages,eligible,matches,card} from './ads-model.mjs';
const root=new URL('../',import.meta.url),path=location.pathname.slice(root.pathname.length).split('/')[0],page=!path||path==='index.html'?'home':path;
if(pages[page]){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('css/ads.css',root);document.head.append(css);
 let revision=0,allowed=false,ads=[],nodes=[];
 function render(){nodes.forEach(n=>n.remove());nodes=[];if(!allowed||document.fullscreenElement)return;const main=document.querySelector('main');if(!main)return;const age=globalThis.RoutineAudience?.read().age||'all';for(const placement of ['top','bottom']){const ad=ads.find(a=>a.placement===placement&&matches(a,age,page));if(!ad)continue;const n=card(ad);nodes.push(n);if(placement==='top')main.before(n);else main.after(n);}}
 async function refresh(){const rev=++revision;allowed=false;render();try{const client=await accountClient(),{data,error}=await client.auth.getSession();if(error)throw error;const access=data.session?await betaRequest('state'):{plan:'free'};if(rev!==revision)return;if(!eligible(access))return;const result=await client.from('routine_ads').select('id,title,body,button,url,image,image_alt,ages,pages,placement,active,priority').eq('active',true).order('priority',{ascending:false}).order('created_at',{ascending:false});if(result.error)throw result.error;if(rev!==revision)return;ads=result.data;allowed=true;render();}catch{/* Hide ads when account status cannot be verified. */}}
 try{const client=await accountClient();client.auth.onAuthStateChange(()=>{++revision;allowed=false;render();setTimeout(refresh,0);});refresh();}catch{}
 addEventListener('routines-plan-change',()=>{++revision;allowed=false;render();refresh();});addEventListener('routines-audience-change',render);addEventListener('fullscreenchange',render);addEventListener('online',refresh);addEventListener('focus',refresh);
}
