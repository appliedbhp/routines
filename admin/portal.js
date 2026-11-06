import {accountClient,accountStorageKey} from '../cloud/client.js';
import {previewTools,tiers} from './tiers.js';

const root=new URL('../',import.meta.url);
const header=document.querySelector('.workspace-header,.app-header');
const adminPage=document.getElementById('adminWorkspace');
const adminTools=document.getElementById('adminTools');
const adminStatus=document.getElementById('adminStatus');
const byId=id=>document.getElementById(id);
const paths={
 settings:'<circle cx="12" cy="12" r="3"/><path d="m10 3-.6 2.5-2 .9-2.4-.8-2 3.4 1.9 1.7v2.6L3 15l2 3.4 2.4-.8 2 .9L10 21h4l.6-2.5 2-.9 2.4.8 2-3.4-1.9-1.7v-2.6L21 9l-2-3.4-2.4.8-2-.9L14 3z"/>',
 admin:'<path d="M12 22s7-3 7-9V5l-7-3-7 3v8c0 6 7 9 7 9z"/><path d="m9 12 2 2 4-4"/>',
 view:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>'
};
function make(tag,text){
 const element=document.createElement(tag);
 if(text!==undefined)element.textContent=text;
 return element;
}
function icon(tag,kind,label){
 const control=make(tag);
 if(tag==='button')control.type='button';
 control.title=label;control.setAttribute('aria-label',label);
 control.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+paths[kind]+'</svg>';
 return control;
}
function modal(title){
 const dialog=make('dialog');dialog.className='portal-dialog no-print';dialog.setAttribute('aria-label',title);
 const head=make('header'),close=make('button','Close');close.type='button';close.onclick=()=>dialog.close();
 head.append(make('h2',title),close);dialog.append(head);document.body.append(dialog);return dialog;
}

const style=make('link');style.rel='stylesheet';style.href=new URL('portal.css',import.meta.url);document.head.append(style);
const controls=make('div');controls.className='portal-header-actions no-print';
const settings=icon('button','settings','Settings');
const admin=icon('a','admin','Administration');admin.href=new URL('admin/',root);admin.className='portal-admin-icon';
const view=icon('button','view','Preview pricing tier');
admin.hidden=view.hidden=true;
controls.append(settings,admin,view);header?.append(controls);
const adminLink=icon('a','admin','Administration');adminLink.href=admin.href;adminLink.className='portal-admin-link';adminLink.hidden=true;
const adminLabel=make('span','Administration');adminLabel.className='nav-label';adminLink.append(adminLabel);
if(adminPage){adminLink.setAttribute('aria-current','page');admin.setAttribute('aria-current','page');}
document.getElementById('visual-navigation')?.append(adminLink);

const settingsDialog=modal('Settings');
const audience=globalThis.RoutineAudience;
const ageLabel=make('label','Age group'),age=make('select');age.id='audienceAge';
for(const [value,profile] of Object.entries(audience.profiles))age.add(new Option(profile.label,value));
age.value=audience.read().age;ageLabel.append(age);
const textLabel=make('label'),textOnly=make('input');textOnly.type='checkbox';textOnly.checked=audience.read().textOnly;
textLabel.className='portal-text-only';textLabel.append(textOnly,make('span','Routine timer: text only (hide pictures)'));
const preferenceNote=make('p','Personalizes the side menu on this browser. All tools remain available from All tools. No birthdate or child profile is collected.');preferenceNote.className='portal-note';
const saved=make('p');saved.setAttribute('role','status');
function saveAudience(){audience.save({age:age.value,textOnly:textOnly.checked});saved.textContent='Settings saved on this browser.';}
age.onchange=saveAudience;textOnly.onchange=saveAudience;
addEventListener('routines-audience-change',event=>{age.value=event.detail.age;textOnly.checked=event.detail.textOnly;});
addEventListener('storage',event=>{if(event.key===audience.key||event.key===null){const pref=audience.read();age.value=pref.age;textOnly.checked=pref.textOnly;}});
settingsDialog.append(ageLabel,textLabel,preferenceNote,saved);
const account=make('a','Account and sign-in');account.href=new URL('account/',root);
const privacy=make('a','Privacy policy');privacy.href=new URL('routine/#privacy-policy',root);
const navButton=make('button','Toggle sidebar');navButton.type='button';
navButton.onclick=()=>{settingsDialog.close();document.querySelector('.sidebar-toggle')?.click();};
for(const control of [account,privacy,navButton]){
 const row=make('p');row.append(control);settingsDialog.append(row);
}
settings.onclick=()=>settingsDialog.showModal();

const preview=modal('Portal preview');
const context=make('p');context.className='portal-note';
const tier=make('select'),label=make('label','Pricing tier');
for(const [key,value] of Object.entries(tiers))tier.add(new Option(value.name,key));
label.append(tier);
const content=make('section');content.setAttribute('aria-live','polite');
preview.append(context,label,content);
let authorized=false,checkRevision=0,searchRevision=0;

function renderPreview(){
 const plan=tiers[tier.value];
 const heading=make('h3',plan.name),price=make('p',plan.price),summary=make('p',plan.summary);
 const tools=make('ul');tools.className='portal-tools';
 for(const tool of [...previewTools,...(tier.value==='paid'?['Self-Monitoring']:[])])tools.append(make('li',tool));
 const options=make('ul');
 for(const option of plan.settings)options.append(make('li',option));
 content.replaceChildren(heading,price,summary,make('h4','All Tools'),tools,make('h4','Account features'),options);
}
tier.onchange=renderPreview;
preview.addEventListener('close',()=>{context.textContent='';content.replaceChildren();});
function showPreview(value,email){
 if(!authorized)return;
 tier.value=value;label.hidden=!!email;
 context.textContent=email
  ?'Account: '+email+'. Showing the free-account layout. Billing is not connected. Private boards and actions are excluded.'
  :'Read-only preview of the planned tier. Your account access and billing stay the same.';
 renderPreview();
 if(!preview.open)preview.showModal();
}
view.onclick=()=>showPreview(tier.value||'guest');

function updateAccess(allowed,message){
 authorized=allowed;
 admin.hidden=view.hidden=adminLink.hidden=!allowed;
 if(adminTools)adminTools.hidden=!allowed;
 if(adminStatus){adminStatus.textContent=message||'';adminStatus.hidden=allowed;}
 if(!allowed){
  searchRevision++;byId('searchResult')?.replaceChildren();
  if(byId('searchStatus'))byId('searchStatus').textContent='';
  if(byId('adminEmail'))byId('adminEmail').value='';
  if(preview.open)preview.close();context.textContent='';
 }
}
function storedSession(){
 try{return !!localStorage.getItem(accountStorageKey);}catch{return false;}
}
async function checkAccess(force=false){
 const revision=++checkRevision;
 if(!force&&!adminPage&&!storedSession())return;
 try{
  const client=await accountClient(),{data:session}=await client.auth.getSession();
  if(revision!==checkRevision)return;
  if(!session?.session){updateAccess(false,'Sign in with an administrator account to continue.');return;}
  const {data,error}=await client.rpc('routines_is_administrator');
  if(revision!==checkRevision)return;
  if(error)throw error;
  updateAccess(data===true,'This account does not have administrator access.');
 }catch{
  if(revision===checkRevision)updateAccess(false,'Administrator access could not be checked. Reload and try again.');
 }
}
addEventListener('routines-account-signed-in',()=>checkAccess(true));
addEventListener('board-cloud-signedout',()=>{checkRevision++;updateAccess(false,'Sign in with an administrator account to continue.');});
addEventListener('storage',event=>{if(event.key===accountStorageKey)checkAccess(true);});
checkAccess();

byId('adminSearch')?.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!authorized)return;
 const revision=++searchRevision,status=byId('searchStatus'),result=byId('searchResult');
 const email=byId('adminEmail').value.trim();
 status.textContent='Searching…';result.replaceChildren();
 try{
  const client=await accountClient();
  const {data,error}=await client.rpc('routines_admin_find_account',{email_address:email});
  if(revision!==searchRevision||!authorized)return;
  if(error)throw error;
  status.textContent=data?'':'No account found for that email.';
  if(!data)return;
  const row=make('div');row.className='portal-result';
  const button=make('button','View as');button.type='button';button.setAttribute('aria-label','View as '+data.email);
  button.onclick=()=>showPreview('free',data.email);
  row.append(make('strong',data.email),make('span',data.confirmed?'Verified email':'Email awaiting verification'),button);
  result.append(row);
 }catch{
  if(revision===searchRevision)status.textContent='Could not search accounts. Check your sign-in and try again.';
 }
});
