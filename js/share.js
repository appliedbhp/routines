/* Prepare a local attachment; sending remains in the user's chosen mail app. */
(() => {
  const kind = document.body.dataset.support ? 'board' : document.getElementById('exportChart') ? 'chart' : 'routine';
  const exportButton = document.getElementById({board:'exportBoard',chart:'exportChart',routine:'exportRoutineBtn'}[kind]);
  if (!exportButton) return;
  const button = document.createElement('button');button.type='button';button.className='secondary-btn';button.textContent='Share by email';exportButton.after(button);
  const dialog=document.createElement('dialog');dialog.className='share-dialog no-print';dialog.setAttribute('aria-labelledby','share-title');
  const heading=document.createElement('h2');heading.id='share-title';heading.textContent='Share this visual';
  const message=document.createElement('p');message.setAttribute('role','status');
  const native=document.createElement('button');native.textContent='Attach file & choose email app';
  const download=document.createElement('button');download.textContent='Download attachment';
  const draft=document.createElement('button');draft.textContent='Download email with attachment (.eml)';
  const email=document.createElement('a');email.textContent='Open prefilled email';
  const directions=document.createElement('textarea');directions.readOnly=true;directions.setAttribute('aria-label','Email instructions');
  const close=document.createElement('button');close.textContent='Done';close.onclick=()=>dialog.close();
  dialog.append(heading,message,native,download,draft,email,directions,close);document.body.append(dialog);
  button.onclick=async()=>{
    button.disabled=true;download.disabled=true;draft.disabled=true;native.hidden=true;email.removeAttribute('href');directions.value='';
    try {
      const payload=kind==='board'?await currentPayload():kind==='chart'?await currentChart():{format:'routine-visual-timer',version:1,routine:normalizeRoutine(routineRecord())};
      const title=kind==='board'?payload.board.title:kind==='chart'?payload.chart.name:payload.routine.name;
      const filename=`${kind}-${(title || 'visual').replace(/[^a-z0-9_-]+/gi,'-').slice(0,80)}.json`;
      const file=new File([JSON.stringify(payload,null,2)],filename,{type:'application/json'});
      const path=kind==='board'?`${payload.board.type}/`:kind==='chart'?'chore-chart/':'';
      const importLabel=`Import ${kind}`;const saveLabel=kind==='routine'?'Save':`Save ${kind}`;
      const body=`I'm sharing “${title || 'My visual'}” with you.\n\nHow to open it:\n1. Download the attached ${filename} file to your device.\n2. Open https://routines.getadhd.care/${path} in your browser.${kind==='routine'?' Select Builder.':''}\n3. Select “${importLabel}” and choose the downloaded JSON file.\n4. The visual opens immediately. Review it, then select “${saveLabel}” to keep it in this browser.\n5. Next time, open the same page in the same browser, choose it from the saved ${kind==='routine'?'routines':kind==='chart'?'charts':'boards'} menu, and select “Load${kind==='routine'?'':` ${kind}`}”.\n\nSaved visuals stay in that browser on that device. Keep the attached file as a backup.`;
      directions.value=body;
      download.disabled=false;draft.disabled=false;
      draft.onclick=()=>{
        const base64=value=>btoa(Array.from(new TextEncoder().encode(value),byte=>String.fromCharCode(byte)).join('')).match(/.{1,76}/g).join('\r\n');
        const boundary=`visual-${crypto.randomUUID()}`;
        const subject=base64(`A visual for you: ${title || 'My visual'}`).replace(/\r\n/g,'');
        const eml=['X-Unsent: 1',`Subject: =?UTF-8?B?${subject}?=`,'MIME-Version: 1.0',`Content-Type: multipart/mixed; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',base64(body),`--${boundary}`,'Content-Type: application/json',`Content-Disposition: attachment; filename="${filename}"`,'Content-Transfer-Encoding: base64','',base64(JSON.stringify(payload,null,2)),`--${boundary}--`,''].join('\r\n');
        const url=URL.createObjectURL(new Blob([eml],{type:'message/rfc822'}));const link=document.createElement('a');link.href=url;link.download=filename.replace(/\.json$/,'.eml');document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        message.textContent='Email file downloaded with the JSON attachment and instructions included. Open it in a compatible desktop email app, then choose Edit as new or Forward if needed, add the recipient, and send.';
      };
      email.href=`mailto:?subject=${encodeURIComponent(`A visual for you: ${title || 'My visual'}`)}&body=${encodeURIComponent(body)}`;
      download.onclick=()=>{const url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message.textContent=`Downloaded ${filename}. This browser cannot attach it automatically: open the prefilled email and attach the file, or download the email file with its attachment already included.`;};
      const canShare=!!(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}));native.hidden=!canShare;
      message.textContent=canShare?'Choose your email app to attach the file with these instructions. If your app omits the message, copy the instructions below.':'This browser cannot attach a file to email automatically. Download the attachment, open the prefilled email, and attach the downloaded file before sending.';
      native.onclick=async()=>{try{await navigator.share({files:[file],title:`A visual for you: ${title}`,text:body});}catch(error){message.textContent=error.name==='AbortError'?'Sharing canceled. Your visual is unchanged.':'Sharing was unavailable. Download the attachment and use the prefilled email instead.';}};
      dialog.showModal();
      // The unsupported-browser path exports automatically; email opening is a separate explicit action.
      if(!canShare)download.click();
    } catch(error) {message.textContent=`Could not prepare this visual: ${error.message}`;native.hidden=true;email.removeAttribute('href');download.disabled=true;dialog.showModal();}
    finally {button.disabled=false;}
  };
})();
