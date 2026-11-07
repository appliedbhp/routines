/* Keep original attribution visible when opening an older saved picture. */
let queued=false;
function update(){
 queued=false;
 const legacy=[...document.images].some(img=>img.src.startsWith('https://static.arasaac.org/pictograms/'));
 for(const host of document.querySelectorAll('.sheet-footer,.arasaac-credit,.session-controls')){
  let line=host.querySelector('.legacy-symbol-credit');
  if(legacy&&!line){line=document.createElement('small');line.className='legacy-symbol-credit';line.style.display='block';line.innerHTML='Older pictures: Sergio Palao / <a href="https://arasaac.org/terms-of-use">ARASAAC</a> © Government of Aragón · CC BY-NC-SA.';host.append(line);}
  if(line){line.hidden=!legacy;line.style.display=legacy?'block':'none';}
 }
}
new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(update);}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});update();
