(() => {
 const cards=[...document.querySelectorAll('.tool-card')],buttons=[...document.querySelectorAll('[data-filter]')],search=document.getElementById('toolSearch');
 let category='all',skill=new URLSearchParams(globalThis.location?.search||'').get('skill')||'';
 const learning=globalThis.RoutineLearning;
 const audience=()=>globalThis.RoutineAudience?.read();
 const toolId=card=>card.getAttribute?.('href')?.replace(/\/$/,'');
 function filter(){const normalize=text=>text.toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim();const term=normalize(search.value);let count=0;for(const card of cards){const matches=(category==='all'||card.dataset.category===category)&&normalize(card.dataset.search).includes(term)&&(!skill||learning?.tools[toolId(card)]?.[1].includes(skill))&&(!audience()||globalThis.RoutineAudience.allows(audience().age,toolId(card),audience().tools));card.hidden=!matches;if(card.parentElement?.classList.contains('tool-card-shell'))card.parentElement.hidden=!matches;if(matches)count++;}document.getElementById('toolCount').textContent=`${count} ${count===1?'tool':'tools'} to make your own`;document.getElementById('noTools').hidden=count!==0;}
 buttons.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));filter();}));
 search.addEventListener('input',filter);
 if(learning){const host=document.createElement('div');host.className='ef-filters';host.setAttribute('aria-label','Filter tools by executive function skill');const label=document.createElement('span');label.className='ef-filter-label';label.textContent='Skills to practice · find related tools';host.append(label);
 if(!Object.hasOwn(learning.skills,skill))skill='';
 const choices=[['','All skills'],...Object.entries(learning.skills)];for(const [key,name] of choices){const b=document.createElement('button');b.type='button';b.className='ef-pill';b.textContent=name;b.dataset.skill=key;b.setAttribute('aria-pressed',String(skill===key));b.onclick=()=>{skill=key;host.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===b)));filter();};host.append(b);}document.querySelector('.library-controls').after(host);
 for(const card of cards){const info=learning.tools[toolId(card)];if(!info)continue;const tags=document.createElement('div');tags.className='tool-card-skills';for(const key of info[1]){const tag=document.createElement('button');tag.type='button';tag.className='ef-pill';tag.textContent=learning.skills[key];tag.setAttribute('aria-label','Find tools for '+learning.skills[key]);tag.onclick=()=>{skill=key;host.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skill===key)));filter();host.scrollIntoView({block:'center'});host.querySelector('[data-skill="'+key+'"]').focus();};tags.append(tag);}const wrap=document.createElement('article');wrap.className='tool-card-shell';card.before(wrap);wrap.append(card,tags);}
 globalThis.addEventListener('routines-audience-change',filter);globalThis.addEventListener('storage',filter);filter();
 }
})();
