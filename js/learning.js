import './learning-data.js';
const root=new URL('../',import.meta.url),data=globalThis.RoutineLearning;
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('css/learning.css',root);document.head.append(css);
const id=location.pathname.slice(root.pathname.length).split('/')[0];
const info=data.tools[id];
if(info){
 const row=document.createElement('section');row.className='tool-learning no-print';row.setAttribute('aria-label','About this tool');
 const learn=document.createElement('button');learn.type='button';learn.className='learn-tool';learn.innerHTML='<span aria-hidden="true">✧</span> Learn';learn.setAttribute('aria-label','Learn about '+info[0]);row.append(learn);
 for(const skill of info[1]){const pill=document.createElement('a');pill.className='ef-pill';pill.textContent=data.skills[skill];pill.href=new URL('?skill='+skill+'#all-tools',root);pill.title='Find tools to practice '+data.skills[skill].toLowerCase();row.append(pill);}
 const main=document.querySelector('main'),bar=main.querySelector('.file-bar');if(bar)bar.after(row);else if(main.querySelector('h1'))main.querySelector('h1').after(row);else main.prepend(row);
 const dialog=document.createElement('dialog');dialog.className='learning-dialog no-print';dialog.setAttribute('aria-labelledby','learnTitle');dialog.innerHTML='<h2 id="learnTitle"></h2><p data-what></p><h3>Why it matters</h3><p data-why></p><h3>Try this</h3><p data-try></p><p class="learning-note">These tools offer ways to practice and support everyday skills. There is no single right way to use them.</p><button type="button">Got it</button>';document.body.append(dialog);
 function render(){const text=data.explain(id,globalThis.RoutineAudience.read().age);dialog.querySelector('h2').textContent=text.title;for(const key of ['what','why','try'])dialog.querySelector('[data-'+key+']').textContent=text[key];}
 learn.onclick=()=>{render();dialog.showModal();};dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>learn.focus());addEventListener('routines-audience-change',render);
}
