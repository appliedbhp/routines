import {accountClient} from './client.js';
const audience=globalThis.RoutineAudience;
let user=null,revision=0,dismissedFor=null;
const dialog=document.createElement('dialog');dialog.className='portal-dialog no-print';dialog.setAttribute('aria-label','Choose your tools');
const heading=document.createElement('h2');heading.textContent='Who are these tools for?';
const intro=document.createElement('p');intro.textContent='Choose a default age group to personalize your menu across devices. This is a tool preference, not a child profile.';
const form=document.createElement('form'),label=document.createElement('label'),select=document.createElement('select'),submit=document.createElement('button'),status=document.createElement('p');
label.textContent='Default age group';select.required=true;select.append(new Option('Choose an age group',''));
for(const [key,value] of Object.entries(audience.profiles))select.append(new Option(value.label,key));
label.append(select);submit.textContent='Save and show my tools';status.setAttribute('role','status');form.append(label,submit,status);dialog.append(heading,intro,form);document.body.append(dialog);
const later=document.createElement('button');later.type='button';later.textContent='Choose later';later.onclick=()=>{dismissedFor=user?.id;dialog.close();};dialog.append(later);
async function saveAge(age){if(!Object.hasOwn(audience.profiles,age))throw Error('Choose an age group.');const client=await accountClient();const {data,error}=await client.auth.updateUser({data:{routines_age_group:age}});if(error)throw error;user=data.user;audience.save({...audience.read(),age});return user;}
form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{await saveAge(select.value);dialog.close();}catch{status.textContent='Could not save your account preference. Check your connection and try again.';}finally{submit.disabled=false;}};
globalThis.RoutineAccountPreferences={async saveAge(age){if(!user)return false;await saveAge(age);return true;}};
async function refresh(){const current=++revision;try{const client=await accountClient(),{data}=await client.auth.getSession();if(current!==revision)return;user=data.session?.user||null;if(!user){dialog.close();return;}const age=user.user_metadata?.routines_age_group;if(Object.hasOwn(audience.profiles,age)){audience.save({...audience.read(),age});dialog.close();}else if(dismissedFor!==user.id&&!document.querySelector('dialog[open]')){select.value='';dialog.showModal();}}catch{}}
try{const client=await accountClient();client.auth.onAuthStateChange(()=>setTimeout(refresh,0));await refresh();}catch{}
// Auth callbacks schedule work outside Supabase's auth lock. Metadata never grants access.

dialog.addEventListener('cancel',()=>{dismissedFor=user?.id;});
document.addEventListener('close',event=>{if(event.target!==dialog&&user&&!user.user_metadata?.routines_age_group)setTimeout(refresh,0);},true);
