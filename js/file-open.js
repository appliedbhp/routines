/* File contents remain local and route through the existing per-tool import validators. */
(()=>{
 const header=document.querySelector('.workspace-header,.app-header');
 const dialog=document.createElement('dialog');dialog.className='file-upload-dialog';dialog.setAttribute('aria-label','Open a saved file');dialog.innerHTML='<h2>Open a saved file</h2><p>Drop one .abhp or older .json file here. We’ll open the matching tool.</p><label class="file-drop-zone">Choose a file<input type="file" accept=".abhp,.json,application/json"></label><p>Files open on this device; they are not uploaded to the cloud.</p><p role="status" aria-live="polite"></p><button type="button">Close</button>';document.body.append(dialog);
 const status=dialog.querySelector('[role=status]');dialog.querySelector('button').onclick=()=>dialog.close();
 const open=document.createElement('button');open.type='button';open.className='workspace-open-file no-print';open.textContent='↑ Open file';open.onclick=()=>{status.textContent='';dialog.showModal();};header?.append(open);
 async function load(files){if(globalThis.ABHPPageOpen){await globalThis.ABHPPageOpen(files);return;}if(files.length!==1){status.textContent='Choose one saved file at a time.';if(!dialog.open)dialog.showModal();return;}try{await ABHPFiles.route(files[0]);}catch(e){status.textContent=e instanceof SyntaxError?'This is not a readable ABHP or JSON file.':e.message;if(!dialog.open)dialog.showModal();}}
 dialog.querySelector('input').onchange=e=>{if(e.target.files.length)load(e.target.files);e.target.value='';};
 const overlay=document.createElement('div');overlay.className='file-drop-overlay no-print';overlay.textContent='Drop your saved file to open its tool';overlay.hidden=true;document.body.append(overlay);let depth=0;
 const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
 document.addEventListener('dragenter',e=>{if(hasFiles(e)){e.preventDefault();depth++;overlay.hidden=false;}});
 document.addEventListener('dragover',e=>{if(hasFiles(e)){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
 document.addEventListener('dragleave',()=>{if(--depth<=0){depth=0;overlay.hidden=true;}});
 document.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();depth=0;overlay.hidden=true;load(e.dataTransfer.files);});
 addEventListener('blur',()=>{depth=0;overlay.hidden=true;});
})();
