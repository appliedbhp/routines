import {cloudConfig} from '../cloud/config.js';
const form=document.getElementById('tipForm'),custom=document.getElementById('customAmount'),label=document.getElementById('customLabel'),button=document.getElementById('tipCheckout'),status=document.getElementById('tipStatus');
let id=crypto.randomUUID(),busy=false;
form.onchange=()=>{if(busy)return;id=crypto.randomUUID();label.hidden=form.elements.amount.value!=='custom';custom.required=!label.hidden;status.textContent='';};
custom.oninput=()=>{if(!busy)id=crypto.randomUUID();};
const returned=new URLSearchParams(location.search).get('checkout');
if(returned==='returned')status.textContent='Thank you for supporting Routines. Check Stripe’s confirmation for your payment status; some payment methods take longer to complete.';
if(returned==='cancelled')status.textContent='Checkout closed. You can keep using Routines for free.';
form.onsubmit=async e=>{e.preventDefault();if(busy)return;if(!navigator.onLine){status.textContent='Connect to the internet to leave a tip.';return;}busy=true;const amount=form.elements.amount.value==='custom'?custom.value:form.elements.amount.value;const controls=[...form.querySelectorAll('input,button')];controls.forEach(c=>c.disabled=true);status.textContent='Opening secure checkout…';try{
 const response=await fetch(cloudConfig.url+'/functions/v1/routines-tips',{method:'POST',headers:{'Content-Type':'application/json',apikey:cloudConfig.publishableKey},body:JSON.stringify({amount,id})});const result=await response.json();if(!response.ok)throw Error(result.error||'Checkout could not be opened.');const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Checkout could not be opened safely.');location.assign(url.href);
 }catch(error){status.textContent=error.message||'Unable to connect. Please try again.';busy=false;controls.forEach(c=>c.disabled=false);}};
