import {invitation,BETA_CLOSE} from '../cloud/management/invitations.mjs';
export function invitationPanel(host,{request,onError=()=>{},onChanged=()=>{}}){
 const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
 host.replaceChildren(el('h2','Invitations'),el('p','Paste email addresses, choose an invitation, and review before sending. Each person receives a separate email.'));
 const form=el('form');form.className='admin-form';
 const choices=el('fieldset'),legend=el('legend','Invitation type');choices.append(legend);
 for(const [value,title]of [['free','Free account'],['beta','Beta access']]){const label=el('label'),radio=el('input');radio.type='radio';radio.name='invitation-kind';radio.value=value;radio.checked=value==='free';radio.disabled=value==='beta'&&Date.now()>=BETA_CLOSE;label.append(radio,document.createTextNode(title));choices.append(label);}
 const label=el('label','Email addresses'),emails=el('textarea');emails.rows=6;emails.required=true;emails.maxLength=15000;emails.placeholder='alex@example.com\nsam@example.com';label.append(emails);
 const note=el('p','Up to 50 per batch. Separate addresses with commas, spaces, semicolons, or new lines. Duplicates are removed.');
 const review=el('button','Review invitation');review.type='submit';
 const preview=el('section');preview.hidden=true;preview.className='admin-preview';preview.setAttribute('aria-label','Invitation preview');
 const result=el('p');result.setAttribute('role','status');result.setAttribute('aria-live','polite');
 form.append(choices,label,note,review,preview,result);host.append(form);
 let draft=null,busy=false,locked=false;
 const inputs=()=>[...form.querySelectorAll('input,textarea')];
 form.addEventListener('input',()=>{if(locked)return;draft=null;preview.hidden=true;preview.replaceChildren();result.textContent='';});
 form.onsubmit=e=>{e.preventDefault();if(busy||locked)return;try{
  const value=invitation({kind:form.elements['invitation-kind'].value,emails:emails.value});draft={...value,id:crypto.randomUUID()};preview.hidden=false;preview.replaceChildren(el('h3',value.subject),el('p',value.emails.length+' recipient(s): '+value.emails.join(', ')));
  const text=el('div',value.text);text.style.whiteSpace='pre-wrap';const send=el('button','Send '+value.emails.length+' invitation'+(value.emails.length===1?'':'s'));send.type='button';preview.append(text,send);
  send.onclick=async()=>{if(busy)return;busy=true;locked=true;inputs().forEach(i=>i.disabled=true);review.disabled=true;send.disabled=true;result.textContent='Sending invitations…';try{
   const response=await request('invite-send',{id:draft.id,kind:draft.kind,emails:draft.emails.join('\n'),confirmed:true});
   result.textContent=response.accepted+' invitation(s) accepted by the email provider. Inbox delivery may take a few minutes.';
   send.remove();const again=el('button','Start another invitation');again.type='button';again.onclick=()=>invitationPanel(host,{request,onError,onChanged});preview.append(again);await onChanged();
  }catch(error){result.textContent=error.message;onError(error.message);send.disabled=false;send.textContent='Retry this batch';}finally{busy=false;}};
 }catch(error){result.textContent=error.message;onError(error.message);}};
}
