import {cloudConfig} from './config.js';
import './board-settings.js';
const S=globalThis.CloudBoardSettings,root=new URL('../',import.meta.url);
// Fail closed until authentication delivery and authorization tests are complete.
if(cloudConfig.enabled||(cloudConfig.accountEnabled&&document.getElementById('cloudAccount')))start().catch(()=>{const host=document.getElementById('cloudAccount');if(host)host.textContent='Cloud accounts could not load. Please check your connection and reload.';});
else if(document.getElementById('cloudAccount'))document.getElementById('cloudAccount').textContent='Cloud accounts are being prepared. Browser saving and file export remain available.';
async function start(){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('cloud/style.css',root);document.head.append(css);
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('cloud/adapter.js',root);script.onload=resolve;script.onerror=reject;document.head.append(script);});
 const editor=!!document.querySelector('#exportBoard,#exportChart,#exportRoutineBtn');
 const entry=document.createElement('button');entry.type='button';entry.className='cloud-entry no-print';entry.setAttribute('aria-label','My cloud boards · Free');entry.title='My cloud boards · Free';
 entry.innerHTML='<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.9 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';
 const header=document.querySelector('.workspace-header,.app-header');
 if(header){header.classList.add('has-cloud-entry');header.append(entry);}else document.body.append(entry);
 const dialog=document.createElement('dialog');dialog.className='cloud-dialog no-print';dialog.setAttribute('aria-labelledby','cloudTitle');
 dialog.innerHTML=`<header><h2 id="cloudTitle">My cloud boards</h2><button type="button" data-close aria-label="Close cloud boards">Close</button></header>
 <p>Free account · two boards total across all visual tools.</p><p role="status" aria-live="polite" data-status></p>
 <form data-login><label>Your adult account email<input type="email" autocomplete="email" required maxlength="254"></label><label class="cloud-check"><input type="checkbox" required> I am an adult creating or accessing my own account. I understand my email is used for sign-in and my saved board settings are stored in the cloud.</label><button>Send sign-in link</button><p>Check your email, then open the sign-in link. <a href="${new URL('#privacy-policy',root)}">Privacy details</a></p></form>
 <section data-library hidden><p data-user></p><div data-slots></div><button type="button" data-signout>Sign out on this device</button></section>
 <section data-review hidden><h3>Review before saving</h3><p>Only settings will upload. Person/team names, dates, checkmarks, earned tokens, homework entries, custom images, and session results are excluded. Review all remaining text below. Go back to the editor to remove anything personal.</p><ul data-text></ul><details><summary>See every setting being uploaded</summary><pre data-preview></pre></details><label class="cloud-check"><input type="checkbox" data-attest> <span data-statement></span></label><div class="cloud-actions"><button type="button" data-save disabled>Confirm and save</button><button type="button" data-back>Back</button></div></section>`;
 document.body.append(dialog);
 const q=s=>dialog.querySelector(s),status=q('[data-status]');q('[data-statement]').textContent=S.ATTESTATION;
 let client,user,rows=[],pending=null,busy=false,authRevision=0;
 const message=t=>{status.textContent=t;};
 async function sdk(){
  if(!client){const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4');client=createClient(cloudConfig.url,cloudConfig.publishableKey,{auth:{storageKey:'routines.cloud.auth.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){authRevision++;user=null;rows=[];pending=null;q('[data-slots]').replaceChildren();q('[data-user]').textContent='';q('[data-review]').hidden=true;q('[data-library]').hidden=true;q('[data-login]').hidden=false;q('[data-attest]').checked=false;q('[data-save]').disabled=true;}});
  }return client;
 }
 async function refresh(){
  pending=null;q('[data-review]').hidden=true;q('[data-attest]').checked=false;q('[data-save]').disabled=true;
  const c=await sdk(),{data,error}=await c.auth.getUser();user=error?null:data.user;
  q('[data-login]').hidden=!!user;q('[data-library]').hidden=!user;q('[data-slots]').replaceChildren();rows=[];
  if(!user)return;
  const response=await c.from('routine_cloud_boards').select('slot,payload,revision,updated_at').order('slot');
  if(response.error)throw Error('Cloud boards could not be loaded. Try again.');rows=response.data;
  q('[data-user]').textContent=`${user.email} · ${rows.length} of 2 boards saved`;
  for(const slot of [1,2]){
   const row=rows.find(r=>r.slot===slot),card=document.createElement('article');card.className='cloud-slot';
   const h=document.createElement('h3');h.textContent=row?S.title(row.payload):`Empty board slot ${slot}`;card.append(h);
   if(row){const description=document.createElement('p');description.textContent=`${S.type(row.payload).replaceAll('-',' ')} · Updated ${new Date(row.updated_at).toLocaleString()}`;card.append(description);
    action(card,'Open board',()=>open(row));
    action(card,'Export settings',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(row.payload,null,2)],{type:'application/json'}));a.href=url;a.download='board-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    action(card,'Delete from cloud',async()=>{if(!confirm(`Delete “${S.title(row.payload)}” from the cloud? This cannot be undone. Export it first if you need a backup.`))return;const {data,error}=await client.from('routine_cloud_boards').delete().eq('slot',slot).eq('revision',row.revision).select('slot');if(error||!data.length)throw Error('This board changed or could not be deleted. Refresh and try again.');await refresh();message('Cloud copy deleted. Local boards are unchanged.');});
   }
   if(editor)action(card,row?'Replace with current board':'Save current board here',async()=>{
    const payload=S.clean(await CloudBoardAdapter.current());
    pending={payload,slot,revision:row?.revision??null,userId:user.id,authRevision};
    q('[data-text]').replaceChildren();for(const text of S.textFields(payload)){const li=document.createElement('li');li.textContent=text;q('[data-text]').append(li);}
    q('[data-preview]').textContent=JSON.stringify(payload,null,2);q('[data-attest]').checked=false;q('[data-save]').disabled=true;q('[data-review]').hidden=false;q('[data-library]').hidden=true;
    message(row?'Saving will replace the board in this slot.':'Review your settings-only cloud copy.');q('[data-attest]').focus();
   });
   q('[data-slots]').append(card);
  }
 }
 function action(parent,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>run(fn);parent.append(b);}
 async function run(fn){if(busy)return;busy=true;dialog.setAttribute('aria-busy','true');try{await fn();}catch(e){message(e.message||'That action could not be completed. Try again.');}finally{busy=false;dialog.removeAttribute('aria-busy');}}
 async function open(row){
  const path=new URL(S.path(row.payload),root),here=location.pathname.replace(/index\.html$/,'');
  if(path.pathname!==here){path.searchParams.set('cloudSlot',String(row.slot));location.assign(path);return;}
  if(!confirm('Open this cloud board? Unsaved edits in the current visual will be replaced.'))return;
  CloudBoardAdapter.open(S.clean(row.payload));dialog.close();
 }
 entry.onclick=()=>run(async()=>{dialog.showModal();message('Loading…');await refresh();message(user?'Your cloud boards are private to this account.':'Sign in to save and open your two free boards.');});
 q('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{pending=null;q('[data-attest]').checked=false;q('[data-save]').disabled=true;entry.focus();});
 q('[data-back]').onclick=()=>run(refresh);
 q('[data-attest]').onchange=()=>{q('[data-save]').disabled=!q('[data-attest]').checked;};
 q('[data-login]').onsubmit=e=>{e.preventDefault();run(async()=>{
  const c=await sdk(),email=q('input[type=email]').value.trim();const {error}=await c.auth.signInWithOtp({email,options:{emailRedirectTo:new URL('account/',root).href}});
  if(error)throw Error('Could not send a sign-in link. Please wait a minute and try again.');message('Check your email for a sign-in link. You can close this window; your current visual stays here.');
 });};
 q('[data-signout]').onclick=()=>run(async()=>{const {error}=await client.auth.signOut({scope:'local'});if(error)throw Error('Sign-out failed. Try again.');await refresh();message('Signed out on this device.');});
 q('[data-save]').onclick=()=>run(async()=>{
  if(!pending||!q('[data-attest]').checked)throw Error('Review the board and confirm the privacy statement.');
  const snapshot=pending,{data,error}=await client.auth.getUser();
  if(error||data.user?.id!==snapshot.userId||authRevision!==snapshot.authRevision)throw Error('Your sign-in changed. Reopen cloud boards and review again.');
  q('[data-attest]').checked=false;q('[data-save]').disabled=true;
  const response=await client.functions.invoke('cloud-board-save',{body:{slot:snapshot.slot,revision:snapshot.revision,payload:snapshot.payload,attested:true,attestationVersion:S.VERSION}});
  if(response.error){let details;try{details=await response.error.context?.json();}catch{}throw Error(details?.error||'Cloud save failed. Your local board is unchanged. Review and try again.');}
  await refresh();message('Settings saved to the cloud. Session results remain on this device.');
 });
 // Sign-in return and cross-tool opening never auto-upload any local data.
 if(document.getElementById('cloudAccount')||new URLSearchParams(location.search).has('cloudSlot')){
  await run(async()=>{dialog.showModal();await refresh();const slot=Number(new URLSearchParams(location.search).get('cloudSlot'));history.replaceState(null,'',location.pathname);const row=rows.find(r=>r.slot===slot);if(row)await open(row);else if(!user)message('Sign in to open your cloud boards.');});
 }
}
