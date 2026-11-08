import {plan,planName} from '../beta/api.js';
import {accountClient} from './client.js';
import {cloudConfig} from './config.js';
import '../js/symbol-library.js';
import './board-settings.js';
const S=globalThis.CloudBoardSettings,root=new URL('../',import.meta.url);
// Fail closed until authentication delivery and authorization tests are complete.
if(cloudConfig.enabled||(cloudConfig.accountEnabled&&document.getElementById('cloudAccount')))start().catch(()=>{const host=document.getElementById('cloudAccount');if(host)host.textContent='Cloud accounts could not load. Please check your connection and reload.';});
else if(document.getElementById('cloudAccount'))document.getElementById('cloudAccount').textContent='Cloud accounts are being prepared. Browser saving and file export remain available.';
async function start(){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('cloud/style.css',root);document.head.append(css);
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('cloud/adapter.js',root);script.onload=resolve;script.onerror=reject;document.head.append(script);});
 const editor=!!document.querySelector('#exportBoard,#exportChart,#exportRoutineBtn');
 const entry=document.createElement('button');entry.type='button';entry.className='cloud-entry no-print';entry.setAttribute('aria-label','My cloud boards');entry.title='My cloud boards';
 entry.innerHTML='<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.9 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';
 const header=document.querySelector('.workspace-header,.app-header');
 if(header){header.classList.add('has-cloud-entry');header.append(entry);}else document.body.append(entry);
 const accountHost=document.getElementById('cloudAccount');
 const dialog=document.createElement(accountHost?'section':'dialog');dialog.className='cloud-dialog no-print';dialog.setAttribute('aria-labelledby','cloudTitle');
 dialog.innerHTML=`<header><h2 id="cloudTitle">My cloud boards</h2><button type="button" data-close aria-label="Close cloud boards">Close</button></header>
 <p data-plan>Free account · two boards total across all visual tools.</p><p role="status" aria-live="polite" data-status></p>
 <form data-login>
 <div class="auth-options" aria-label="Sign-in options"><button type="button" data-auth-choice="password" aria-pressed="true">Email &amp; password</button><button type="button" data-auth-choice="signup" aria-pressed="false">Create account</button><button type="button" data-auth-choice="link" aria-pressed="false">Email me a magic link</button></div><label hidden>Account access<select data-auth-mode><option value="password">Sign in with a password</option><option value="signup">Create a password account</option><option value="link">Email me a sign-in link</option><option value="reset">Set or reset my password</option></select></label><button type="button" data-auth-choice="reset" class="auth-reset">Forgot password?</button>
 <label>Your adult account email<input data-email type="email" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="254"></label>
 <label data-password-field>Password<input data-password type="password" autocomplete="current-password" required maxlength="72"><button type="button" data-show-password aria-pressed="false">Show password</button></label>
 <label data-adult class="cloud-check" hidden><input type="checkbox"> I am an adult creating or accessing my own account. <a href="${new URL('routine/#privacy-policy',root)}">Privacy details</a></label>
 <p data-auth-help>Enter your email and password to sign in.</p><button type="submit" data-auth-submit>Sign in</button></form>
 <form data-recovery hidden><label>New password<input data-new-password type="password" autocomplete="new-password" required minlength="12" maxlength="72"></label><p>Use at least 12 characters.</p><button type="submit">Save password</button></form>
 <section data-library hidden><p data-user></p><div data-slots></div><button type="button" data-set-password>Set or reset password</button><button type="button" data-signout>Sign out on this device</button></section>
 <section data-review hidden><h3>Review before saving</h3><p>Only settings will upload. Person/team names, dates, checkmarks, earned tokens, homework entries, custom images, and session results are excluded. Review all remaining text below. Go back to the editor to remove anything personal.</p><ul data-text></ul><details><summary>See every setting being uploaded</summary><pre data-preview></pre></details><label class="cloud-check"><input type="checkbox" data-attest> <span data-statement></span></label><div class="cloud-actions"><button type="button" data-save disabled>Confirm and save</button><button type="button" data-back>Back</button></div></section>`;
 if(accountHost){accountHost.replaceChildren(dialog);dialog.classList.add('cloud-account-page');dialog.showModal=()=>{};dialog.close=()=>{};dialog.querySelector('[data-close]').hidden=true;}else document.body.append(dialog);
 const q=s=>dialog.querySelector(s),status=q('[data-status]');q('[data-statement]').textContent=S.ATTESTATION;
 let limit=2;
 let client,user,rows=[],pending=null,busy=false,authRevision=0,recovery=false;
 const message=(t,kind='info')=>{status.textContent=t;status.dataset.kind=kind;};
 const accountNav=document.createElement('nav');accountNav.className='workspace-account';accountNav.setAttribute('aria-label','Account');
 const signIn=document.createElement('a');signIn.href=new URL('account/',root);signIn.title='Sign in';signIn.setAttribute('aria-label','Sign in');
 const signOut=document.createElement('button');signOut.type='button';signOut.title='Sign out on this device';signOut.setAttribute('aria-label','Sign out on this device');signOut.hidden=true;
 const icon=out=>`<svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${out?'M17 7l-1.41 1.41L18.17 11H9v2h9.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4z':'M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5zM20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z'}"/></svg>`;
 signIn.innerHTML=icon(false)+'<span class="nav-label">Sign in</span>';signOut.innerHTML=icon(true)+'<span class="nav-label">Sign out</span>';
 accountNav.append(signIn,signOut);(document.querySelector('.workspace-sidebar-footer')||document.querySelector('.workspace-sidebar'))?.append(accountNav);
 function accountState(signedIn){signIn.hidden=signedIn;signOut.hidden=!signedIn;const title=document.getElementById('accountPageTitle');if(title)title.textContent=signedIn?'My account':'Sign in';q('#cloudTitle').textContent=signedIn?'My cloud boards':'Sign in to your account';}
 signOut.onclick=()=>{dialog.showModal();q('[data-signout]').click();};
 async function sdk(){
  if(!navigator.onLine)throw Error("Cloud accounts need internet. Use a local save or downloaded offline copy instead.");
  if(!client){client=await accountClient();
   client.auth.onAuthStateChange((event,session)=>{accountState(!!session?.user);if(event==='PASSWORD_RECOVERY'){recovery=true;showRecovery();}if(event==='SIGNED_OUT'){recovery=false;q('[data-recovery]').hidden=true;dispatchEvent(new Event('board-cloud-signedout'));authRevision++;user=null;rows=[];pending=null;q('[data-slots]').replaceChildren();q('[data-user]').textContent='';q('[data-review]').hidden=true;q('[data-library]').hidden=true;q('[data-login]').hidden=false;q('[data-attest]').checked=false;q('[data-save]').disabled=true;}});
  }return client;
 }
 async function refresh(){
  pending=null;q('[data-review]').hidden=true;q('[data-attest]').checked=false;q('[data-save]').disabled=true;
  const c=await sdk(),{data,error}=await c.auth.getUser();user=error?null:data.user;accountState(!!user);
  if(recovery){showRecovery();return;}
  q('[data-login]').hidden=!!user;q('[data-library]').hidden=!user;q('[data-slots]').replaceChildren();rows=[];
  if(!user){limit=2;q('[data-plan]').textContent='Free account · two boards total across all visual tools.';return;}
  const access=await plan();limit=access.boardLimit;q('[data-plan]').textContent=planName(access)+' · '+limit+' cloud board slots.';
  dispatchEvent(new Event('routines-account-signed-in'));
  const response=await c.from('routine_cloud_boards').select('slot,payload,revision,updated_at').order('slot');
  if(response.error)throw Error('Cloud boards could not be loaded. Try again.');rows=response.data;
  q('[data-user]').textContent=`${user.email} · ${rows.length} saved · ${limit} available board slots`;
  for(const slot of [...new Set([...Array.from({length:limit},(_,i)=>i+1),...rows.map(r=>r.slot)])].sort((a,b)=>a-b)){
   const row=rows.find(r=>r.slot===slot),card=document.createElement('article');card.className='cloud-slot';
   const h=document.createElement('h3');h.textContent=row?S.title(row.payload):`Empty board slot ${slot}`;card.append(h);
   if(row){const description=document.createElement('p');description.textContent=`${S.type(row.payload).replaceAll('-',' ')} · Updated ${new Date(row.updated_at).toLocaleString()}`;card.append(description);
    action(card,'Open board',()=>open(row));
    action(card,'Export settings',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(row.payload,null,2)],{type:'application/json'}));a.href=url;a.download='board-settings.abhp';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    action(card,'Delete from cloud',async()=>{if(!confirm(`Delete “${S.title(row.payload)}” from the cloud? This cannot be undone. Export it first if you need a backup.`))return;const {data,error}=await client.from('routine_cloud_boards').delete().eq('slot',slot).eq('revision',row.revision).select('slot');if(error||!data.length)throw Error('This board changed or could not be deleted. Refresh and try again.');await refresh();message('Cloud copy deleted. Local boards are unchanged.');});
   }
   if(editor&&slot<=limit)action(card,row?'Replace with current board':'Save current board here',()=>review(row,slot));
   q('[data-slots]').append(card);
  }
 }
 async function review(row,slot,override=null){
  if(slot>limit)throw Error('This slot is above your current plan. You can still open or export it.');
  const original=override?null:await CloudBoardAdapter.current(),payload=S.clean(override||original);
  pending={payload,original,slot,revision:row?.revision??null,userId:user.id,authRevision};
  q('[data-text]').replaceChildren();for(const text of S.textFields(payload)){const li=document.createElement('li');li.textContent=text;q('[data-text]').append(li);}
  q('[data-preview]').textContent=JSON.stringify(payload,null,2);q('[data-attest]').checked=false;q('[data-save]').disabled=true;q('[data-review]').hidden=false;q('[data-library]').hidden=true;
  message(row?'Saving will replace the board in this slot.':'Review your settings-only cloud copy.');q('[data-attest]').focus();
 }
 globalThis.CloudBoardUI={
  async list(){await refresh();return {rows:[...rows],signedIn:!!user,limit};},
  open:row=>{dialog.showModal();return run(()=>open(row));},
  account:()=>entry.click(),
  async save(target=null,override=null){dialog.showModal();await run(async()=>{await refresh();if(!user){message('Sign in, then choose a cloud slot.');return;}if(target){const row=rows.find(r=>r.slot===target.slot);if(user.id!==target.userId||row?.revision!==target.revision)throw Error('This cloud board changed or your account changed. Reopen it or use Save as.');await review(row,target.slot,override);}else if(override){const slot=Array.from({length:limit},(_,i)=>i+1).find(n=>!rows.some(r=>r.slot===n));if(!slot)throw Error('Your cloud slots are full. Delete a copy you no longer need first.');await review(null,slot,override);}else message('Choose a slot for your settings-only cloud copy.');});},
  async rename(row,name){dialog.showModal();await run(async()=>{await refresh();const fresh=rows.find(r=>r.slot===row.slot);if(!fresh||fresh.revision!==row.revision)throw Error('This board changed. Reopen the library.');await review(fresh,row.slot,BoardFiles.rename(row.payload,name));});},
  async remove(row){const c=await sdk();const {data,error}=await c.from('routine_cloud_boards').delete().eq('slot',row.slot).eq('revision',row.revision).select('slot');if(error||!data.length)throw Error('This board changed or could not be deleted. Reopen the library.');dispatchEvent(new CustomEvent('board-cloud-deleted',{detail:{slot:row.slot}}));}
 };
 dispatchEvent(new Event('routines-cloud-ready'));
 function action(parent,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>run(fn);parent.append(b);}
 async function run(fn){if(busy)return;busy=true;dialog.setAttribute('aria-busy','true');const submit=q('[data-auth-submit]'),label=submit.textContent;submit.disabled=true;submit.textContent='Please wait…';try{await fn();}catch(e){message(e.message||'That action could not be completed. Try again.','error');}finally{busy=false;submit.disabled=false;submit.textContent=label;dialog.removeAttribute('aria-busy');}}
 async function open(row){
  if(row.payload.format==='side-quest'){location.assign(new URL('side-quest/?saved='+row.slot,root));return;}
  const path=new URL(S.path(row.payload),root),here=location.pathname.replace(/index\.html$/,'');
  if(path.pathname!==here){path.searchParams.set('cloudSlot',String(row.slot));location.assign(path);return;}
  if(!confirm('Open this cloud board? Unsaved edits in the current visual will be replaced.'))return;
  CloudBoardAdapter.open(S.clean(row.payload));dispatchEvent(new CustomEvent('board-cloud-opened',{detail:{payload:S.clean(row.payload),slot:row.slot,revision:row.revision,userId:user.id,count:rows.length,limit}}));dialog.close();
 }
 entry.onclick=()=>run(async()=>{dialog.showModal();message('Loading…');await refresh();if(!recovery)message(user?'Your cloud boards are private to this account.':'Sign in to save and open your two free boards.');});
 q('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{pending=null;q('[data-attest]').checked=false;q('[data-save]').disabled=true;q('[data-password]').value='';q('[data-new-password]').value='';entry.focus();});
 q('[data-back]').onclick=()=>run(refresh);
 q('[data-attest]').onchange=()=>{q('[data-save]').disabled=!q('[data-attest]').checked;};
 const authReturn=new URL('account/',root).href;
 const authMode=q('[data-auth-mode]'),password=q('[data-password]'),adult=q('[data-adult] input');
 q('[data-show-password]').onclick=()=>{const show=password.type==='password';password.type=show?'text':'password';q('[data-show-password]').textContent=show?'Hide password':'Show password';q('[data-show-password]').setAttribute('aria-pressed',String(show));};
 const authLabels={password:'Sign in',signup:'Create account',link:'Send sign-in link',reset:'Send password setup link'};
 authMode.onchange=()=>{
  password.type='password';q('[data-show-password]').textContent='Show password';q('[data-show-password]').setAttribute('aria-pressed','false');
  const mode=authMode.value,usesPassword=mode==='password'||mode==='signup';
  q('[data-password-field]').hidden=!usesPassword;password.disabled=!usesPassword;password.required=usesPassword;
  password.autocomplete=mode==='signup'?'new-password':'current-password';password.minLength=mode==='signup'?12:0;password.value='';
  q('[data-adult]').hidden=!(mode==='signup'||mode==='link');adult.disabled=q('[data-adult]').hidden;adult.required=!adult.disabled;
  q('[data-auth-submit]').textContent=authLabels[mode];
  q('[data-auth-help]').textContent=mode==='link'?'No password needed. We’ll email you a one-use sign-in link. New here? This also creates your free account.':mode==='signup'?'Create your free account with a password of at least 12 characters.':mode==='reset'?'We’ll email you a link to set or reset your password.':'Enter your email and password to sign in.';
  dialog.querySelectorAll('[data-auth-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.authChoice===mode)));message('');
 };
 function showRecovery(){
  q('[data-login]').hidden=true;q('[data-library]').hidden=true;q('[data-review]').hidden=true;
  q('[data-recovery]').hidden=false;
  if(!dialog.open)dialog.showModal();
  q('[data-new-password]').focus();message('Choose a new password for your account.');
 }
 async function sendReset(c,email){
  const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:authReturn});
  if(error)throw Error('Could not send the password setup link. Please wait and try again.');
  message('If this address has an account, a password setup link was requested for '+email+'. Check spam or junk too. Use the newest email link.','success');
 }
 q('[data-login]').onsubmit=e=>{e.preventDefault();run(async()=>{
  const email=q('[data-email]').value.trim(),mode=authMode.value;message(mode==='password'?'Signing you in…':mode==='signup'?'Creating your account…':'Requesting your email link…');const c=await sdk();
  if(mode==='reset'){await sendReset(c,email);return;}
  if(mode==='link'){
   const {error}=await c.auth.signInWithOtp({email,options:{emailRedirectTo:authReturn,data:{routines_account:true}}});
   if(error)throw Error('Could not send a sign-in link. Please wait a minute and try again.');
   message('Sign-in link requested for '+email+'. Check your inbox and spam or junk folder. Open the newest link on the device you want to sign in on. If it does not arrive, check the address and try again after a minute.','success');return;
  }
  if(mode==='signup'){
   const {error}=await c.auth.signUp({email,password:password.value,options:{emailRedirectTo:authReturn,data:{routines_account:true}}});
   if(error)throw Error(error.code==='weak_password'?'Choose a stronger password and try again.':'Could not create the account. Check your email and password or try again later.');
   password.value='';message('Check '+email+' for a verification link before signing in. Check spam or junk too. Already have an account? Choose Sign in or Forgot password.','success');return;
  }
  const {error}=await c.auth.signInWithPassword({email,password:password.value});
  if(error)throw Error('Sign-in failed. Check your email and password, or choose Set or reset my password.');
  password.value='';await refresh();message('You’re signed in. Open a saved board below or choose a tool from the menu.','success');
 });};
 q('[data-set-password]').onclick=()=>run(async()=>{if(user?.email)await sendReset(await sdk(),user.email);});
 q('[data-recovery]').onsubmit=e=>{e.preventDefault();run(async()=>{
  if(!recovery)throw Error('Open a fresh password setup link from your email.');
  const c=await sdk(),field=q('[data-new-password]');
  const {error}=await c.auth.updateUser({password:field.value});
  if(error)throw Error(error.code==='weak_password'?'Choose a stronger password and try again.':error.code==='same_password'?'Choose a password different from your current one.':'Could not change the password. Try again or request a fresh link.');
  field.value='';recovery=false;q('[data-recovery]').hidden=true;await refresh();message('Password saved. You can now sign in with it.');
 });};
 dialog.querySelectorAll('[data-auth-choice]').forEach(button=>button.onclick=()=>{authMode.value=button.dataset.authChoice;authMode.onchange();});
 try{const requested=sessionStorage.getItem('routines.account.mode');if(accountHost&&requested==='reset'){authMode.value='reset';sessionStorage.removeItem('routines.account.mode');}}catch{}
 const returnError=new URLSearchParams(location.hash.slice(1)).has('error')||new URLSearchParams(location.search).has('error');
 authMode.onchange();
 q('[data-signout]').onclick=()=>run(async()=>{const {error}=await client.auth.signOut({scope:'local'});if(error)throw Error('Sign-out failed. Try again.');await refresh();message('Signed out on this device.');});
 q('[data-save]').onclick=()=>run(async()=>{
  if(!pending||!q('[data-attest]').checked)throw Error('Review the board and confirm the privacy statement.');
  const snapshot=pending,{data,error}=await client.auth.getUser();
  if(error||data.user?.id!==snapshot.userId||authRevision!==snapshot.authRevision)throw Error('Your sign-in changed. Reopen cloud boards and review again.');
  q('[data-attest]').checked=false;q('[data-save]').disabled=true;
  const response=await client.functions.invoke('cloud-board-save',{body:{slot:snapshot.slot,revision:snapshot.revision,payload:snapshot.payload,attested:true,attestationVersion:S.VERSION}});
  if(response.error){let details;try{details=await response.error.context?.json();}catch{}throw Error(details?.error||'Cloud save failed. Your local board is unchanged. Review and try again.');}
  await refresh();const saved=rows.find(r=>r.slot===snapshot.slot);dispatchEvent(new CustomEvent('board-cloud-saved',{detail:{payload:snapshot.original,slot:snapshot.slot,revision:saved?.revision,userId:user.id,count:rows.length,limit}}));message('Settings saved to the cloud. Session results remain on this device.');dialog.close();
 });
 // Sign-in return and cross-tool opening never auto-upload any local data.
 if(!accountHost){try{const c=await sdk();const {data}=await c.auth.getSession();accountState(!!data.session?.user);}catch{accountState(false);}}
 if(accountHost||new URLSearchParams(location.search).has('cloudSlot')){
  await run(async()=>{dialog.showModal();await refresh();if(recovery)return;const slot=Number(new URLSearchParams(location.search).get('cloudSlot'));history.replaceState(null,'',location.pathname);const row=rows.find(r=>r.slot===slot);if(row)await open(row);else if(!user)message(returnError?'This email link could not sign you in. It may have expired or already been used. Request a new magic link or use your password.':'Choose how you’d like to sign in. New here? Choose Create account.',returnError?'error':'info');else message('You’re signed in. Your saved boards are below.','success');});
 }
}
