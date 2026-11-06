import {accountClient} from '../cloud/client.js';
const styles=['playful','subtle','words','off'],key='routines.praise.v1';
function normalize(value){return styles.includes(value)?value:null;}
export function read(){try{const auth=JSON.parse(localStorage.getItem('routines.cloud.auth.v1')||'null');const stored=auth?.user?auth.user.user_metadata?.routines_praise:localStorage.getItem(key);return normalize(stored)||(['teen','adult'].includes(globalThis.RoutineAudience?.read().age)?'subtle':'playful');}catch{return 'playful';}}
export async function save(value){if(!normalize(value))throw Error('Choose a praise style.');const c=await accountClient(),{data}=await c.auth.getSession();if(data.session){const result=await c.auth.updateUser({data:{routines_praise:value}});if(result.error)throw Error('Could not save your praise preference. Try again.');}else localStorage.setItem(key,value);dispatchEvent(new Event('routines-praise-change'));}
globalThis.RoutinePraise={read,save};
try{const c=await accountClient();c.auth.onAuthStateChange(()=>setTimeout(()=>dispatchEvent(new Event('routines-praise-change')),0));}catch{}
addEventListener('routines-audience-change',()=>dispatchEvent(new Event('routines-praise-change')));
