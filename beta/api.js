import {accountClient} from '../cloud/client.js';
import {cloudConfig} from '../cloud/config.js';
export async function betaRequest(action,args={}){
 if(!navigator.onLine)throw Error('Connect to the internet to use this feature.');
 let token='';if(!['signup','signin','verify','health'].includes(action))try{const c=await accountClient();const {data}=await c.auth.getSession();token=data.session?.access_token||'';}catch{}
 const headers={'Content-Type':'application/json',apikey:cloudConfig.publishableKey};if(token)headers.Authorization='Bearer '+token;
 let response;try{response=await fetch(cloudConfig.url+'/functions/v1/routines-beta',{method:'POST',headers,body:JSON.stringify({...args,action})});}catch{throw Error('Unable to connect. Please check your internet connection and try again.');}const result=await response.json();if(!response.ok)throw Error(result.error||'Please try again.');return result;
}
export async function plan(){const result=await betaRequest('state');globalThis.RoutinesPlan=result;dispatchEvent(new CustomEvent('routines-plan-change',{detail:result}));return result;}
export function planName(p){const name=p.plan==='classroom'?'Classroom':p.plan==='family'?'Family':'Free';return name+(p.lifetimeTier?' · Lifetime':p.betaActive?' · Beta':' plan');}
