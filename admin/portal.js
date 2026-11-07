import {plan,planName as betaPlanName} from '../beta/api.js';
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

const settingsDialog=modal('Settings');settingsDialog.classList.add('settings-dialog');
const audience=globalThis.RoutineAudience;
import('../cloud/preferences.js');
const layout=make('div');layout.className='settings-layout';
const settingsNav=make('nav');settingsNav.setAttribute('aria-label','Settings sections');
const accountPanel=make('section'),userPanel=make('section'),storagePanel=make('section');storagePanel.id='settingsStorage';accountPanel.id='settingsAccount';userPanel.id='settingsUser';
const accountTab=make('button','Account'),userTab=make('button','User'),storageTab=make('button','Storage');
const settingsPairs=[[accountTab,accountPanel],[userTab,userPanel],[storageTab,storagePanel]];
for(const [button,panel] of settingsPairs){button.type='button';button.setAttribute('aria-controls',panel.id);button.onclick=()=>{for(const [b,p] of settingsPairs){p.hidden=p!==panel;b.setAttribute('aria-pressed',String(p===panel));}if(panel===storagePanel)globalThis.refreshStorageSettings?.();};settingsNav.append(button);}
const panels=make('div');panels.append(accountPanel,userPanel,storagePanel);layout.append(settingsNav,panels);settingsDialog.append(layout);accountTab.click();
accountPanel.append(make('h3','Account'));
const identity=make('dl'),username=make('dd','Not signed in'),email=make('dd','Not signed in');identity.append(make('dt','Username'),username,make('dt','Email'),email);
const password=make('a','Set or reset password');password.href=new URL('account/',root);password.onclick=()=>{try{sessionStorage.setItem('routines.account.mode','reset');}catch{}};
const privacy=make('a','Privacy policy');privacy.href=new URL('routine/#privacy-policy',root);
const login=make('a','Log in');login.href=new URL('account/',root);
const logout=make('button','Log out on this device');logout.type='button';logout.hidden=true;
const accountStatus=make('p');accountStatus.setAttribute('role','status');
logout.onclick=async()=>{logout.disabled=true;try{const client=await accountClient();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;await loadAccount();accountStatus.textContent='Logged out on this device.';}catch{accountStatus.textContent='Could not log out. Check your connection and try again.';}finally{logout.disabled=false;}};
const planCard=make('section');planCard.className='settings-account-plan';planCard.setAttribute('aria-label','Account plan');
const planName=make('strong','Sign in to view your plan'),planDetails=make('p','Free accounts include 2 cloud boards, 5 saved dates, and saved values.');
const upgrade=make('a','View beta & lifetime offers');upgrade.href=new URL('beta/',root);upgrade.setAttribute('aria-describedby','accountUpgradeNote');
const upgradeNote=make('p','Optional one-time lifetime offers are available to eligible beta members. No recurring charges.');upgradeNote.id='accountUpgradeNote';upgradeNote.className='portal-note';
planCard.append(make('h4','Your plan'),planName,planDetails,upgrade,upgradeNote);
accountPanel.append(identity,planCard,make('h4','Password'),make('p','Passwords are never displayed. Use the secure email link to set or reset yours.'),password,make('h4','Privacy'),privacy,make('hr'),login,logout,accountStatus);
async function loadAccount(){try{const client=await accountClient(),{data:sessionData,error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;let user=null;if(sessionData.session){const {data,error}=await client.auth.getUser();if(error)throw error;user=data.user;}username.textContent=user?(user.user_metadata?.username||user.user_metadata?.display_name||'Not set (sign in with email)'):'Not signed in';email.textContent=user?.email||'Not signed in';login.hidden=!!user;logout.hidden=!user;const access=user?await plan():null;planName.textContent=access?betaPlanName(access):'Sign in to view your plan';planDetails.textContent=access?access.boardLimit+' cloud boards, 5 saved dates, and saved values. '+(access.betaActive?'Free beta access through '+new Date(access.expiresAt).toLocaleDateString()+'.':''):'Free accounts include 2 cloud boards, 5 saved dates, and saved values.';}catch{planName.textContent='Reconnect to view your plan';username.textContent='Unavailable';email.textContent='Sign in or reconnect to view your account';login.hidden=false;logout.hidden=true;}}
import('./linked-settings.js').then(m=>m.mount(accountPanel));
import('./email-preferences.js').then(m=>m.mount(accountPanel));
import('./praise-settings.js').then(m=>m.mount(userPanel));
userPanel.append(make('h3','User'));
const ageLabel=make('label','Default age group'),age=make('select');age.id='audienceAge';
for(const [value,profile] of Object.entries(audience.profiles))age.add(new Option(profile.label,value));ageLabel.append(age);
const themeLabel=make('label','Default theme'),theme=make('select');for(const [key,palette] of Object.entries(audience.themes))theme.add(new Option(palette[0],key));themeLabel.append(theme);
const textLabel=make('label'),textOnly=make('input');textOnly.type='checkbox';textLabel.className='portal-text-only';textLabel.append(textOnly,make('span','Routine timer: text only (hide pictures)'));
const note=make('p','Your age preference syncs with your account when signed in. Theme and display preferences stay on this browser. The theme colors the whole site and becomes the starting theme in tools that support it. Saved boards keep their own theme.');note.className='portal-note';
const saved=make('p');saved.setAttribute('role','status');
function syncPreferences(){const pref=audience.read();age.value=pref.age;textOnly.checked=pref.textOnly;theme.value=pref.theme;}
function savePreferences(){audience.save({...audience.read(),age:age.value,textOnly:textOnly.checked,theme:theme.value});saved.textContent='Settings saved on this browser.';}
textOnly.onchange=theme.onchange=savePreferences;
age.onchange=async()=>{savePreferences();try{if(await globalThis.RoutineAccountPreferences?.saveAge(age.value))saved.textContent='Age preference saved to your account.';}catch{saved.textContent='Saved on this browser. Could not update your account; try again when connected.';}};
addEventListener('routines-audience-change',syncPreferences);addEventListener('storage',event=>{if(event.key===audience.key||event.key===null)syncPreferences();});syncPreferences();
userPanel.append(ageLabel,themeLabel,textLabel,note,saved);
settings.onclick=()=>{settingsDialog.showModal();loadAccount();globalThis.refreshCharacterSettings?.();globalThis.refreshStorageSettings?.();};
import('./settings-extras.js').then(m=>m.mount({userPanel,storagePanel,settingsDialog,root}));

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
