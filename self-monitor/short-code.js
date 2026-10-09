const ShortCode=(()=>{
 async function request(body){const {cloudConfig}=await import('../cloud/config.js');const response=await fetch(cloudConfig.url+'/functions/v1/routine-join-code',{method:'POST',headers:{'Content-Type':'application/json',apikey:cloudConfig.publishableKey},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to create a join code.');return result;}
 return {request};
})();
