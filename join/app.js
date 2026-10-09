(()=>{
 const form=document.getElementById('joinForm'),input=document.getElementById('joinCode'),status=document.getElementById('joinStatus');let busy=false;
 async function join(e){e?.preventDefault();if(busy||!form.reportValidity())return;busy=true;form.querySelector('button').disabled=true;status.textContent='Connecting…';
  try{const code=input.value.trim().toUpperCase(),key='routines.join.claim.'+code;let claim=sessionStorage.getItem(key);if(!claim){claim=crypto.randomUUID();sessionStorage.setItem(key,claim);}const result=await ShortCode.request({action:'claim',code,claim});location.replace('../self-monitor/join/#'+result.invitation);}catch(e){status.textContent=e.message;busy=false;form.querySelector('button').disabled=false;}
 }
 form.onsubmit=join;const code=location.hash.slice(1).toUpperCase();history.replaceState(null,'',location.pathname);if(/^[A-HJ-NP-Z2-9]{6}$/.test(code)){input.value=code;join();}
})();
