const MonitorPaidAccess=(()=>{
 function allowed(access){return access?.isAdministrator===true||access?.twoDevice===true||['family','classroom'].includes(access?.plan);}
 function prompt(){
  let dialog=document.getElementById('twoDeviceUpgrade');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='twoDeviceUpgrade';dialog.className='two-device-upgrade';dialog.setAttribute('aria-labelledby','twoDeviceUpgradeTitle');
   dialog.innerHTML='<h2 id="twoDeviceUpgradeTitle">Use two devices with a paid plan</h2><p>Let the learner rate on one screen while an adult rates and sends encouragement from another.</p><p>Two-device self-monitoring is included with Family, Classroom, active beta access, and administrator accounts. The adult joining your session does not need a paid account.</p><p>Your current timer is unchanged. One-device self-monitoring stays free.</p><div class="upgrade-actions"><a href="../beta/">View paid plans</a><a href="../account/">Sign in to your paid account</a><button type="button" autofocus>Keep using one device</button></div>';
   dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close();};document.body.append(dialog);
  }
  if(!dialog.open)dialog.showModal();
 }
 return {allowed,prompt};
})();
if(typeof module!=='undefined')module.exports=MonitorPaidAccess;
