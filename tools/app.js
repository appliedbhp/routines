(() => {
 const cards=[...document.querySelectorAll('.tool-card')],buttons=[...document.querySelectorAll('[data-filter]')],search=document.getElementById('toolSearch');
 let category='all';
 function filter(){const normalize=text=>text.toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim();const term=normalize(search.value);let count=0;for(const card of cards){const matches=(category==='all'||card.dataset.category===category)&&normalize(card.dataset.search).includes(term);card.hidden=!matches;if(matches)count++;}document.getElementById('toolCount').textContent=`${count} ${count===1?'tool':'tools'} to make your own`;document.getElementById('noTools').hidden=count!==0;}
 buttons.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));filter();}));
 search.addEventListener('input',filter);
})();
