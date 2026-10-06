const type = document.body.dataset.support;
const config = SUPPORT_CONFIG[type];
const [minCards, maxCards] = SupportData.limits[type];
const isChoice = type === 'choice-board' || type === 'calm-down';
const boardElement = document.getElementById('board');
const titleInput = document.getElementById('boardTitle');
const personInput = document.getElementById('person');
const status = document.getElementById('status');
const savedSelect = document.getElementById('savedBoards');
const storageKey = `routineVisualTimer.visualSupports.${type}.v1`;
const pending = new Set();
let cards = [];
let activeSavedId = null;
function announce(message) { status.textContent = message; }
function updateHeading() {
  document.getElementById('printTitle').textContent = titleInput.value.trim() || config.name;
  document.getElementById('printPerson').textContent = personInput.value;
}
function newCard(label = '', pictogramId = null, marked = false, manual = false) {
  return {label, pictogramId, marked, manual, revision:0};
}
function bestSymbol(matches, term) {
  const normalize = value => value.toLowerCase().replace(/\b(the|a|an|to)\b/g,'').replace(/\s+/g,' ').trim();
  return matches.find(match => match.keywords?.some(word => normalize(word.keyword || '') === normalize(term))) || matches[0];
}
async function suggest(card, term = card.label) {
  if (!term.trim() || card.manual) return;
  const revision = ++card.revision;
  const task = ARASAAC.search(term).then(matches => {
    if (cards.includes(card) && card.revision === revision && !card.manual) {
      card.pictogramId = bestSymbol(matches, term)?._id || null;
      updatePicture(card);
    }
  });
  pending.add(task);
  try { await task; } finally { pending.delete(task); }
}
function updatePicture(card) {
  const button = card.pictureButton;
  if (!button) return;
  button.setAttribute('aria-label', `Choose picture for ${card.label || 'card'}`);
  button.replaceChildren();
  if (!card.pictogramId) { button.textContent = 'Choose picture'; return; }
  const image = document.createElement('img');
  image.src = ARASAAC.imageUrl(card.pictogramId);
  image.alt = '';
  image.onerror = () => { image.hidden = true; const message=document.createElement('span');message.textContent='Picture unavailable';button.append(message); };
  button.append(image);
}
function moveCard(index, direction) {
  const destination = index + direction;
  if (destination < 0 || destination >= cards.length) return;
  [cards[index], cards[destination]] = [cards[destination], cards[index]];
  render();
  boardElement.querySelectorAll('.edit-label')[destination].focus();
}
function render() {
  boardElement.replaceChildren();
  cards.forEach((card,index) => {
    const article = document.createElement('article');
    article.className = 'card' + (card.marked ? ' marked' : '');
    const slot = document.createElement('p');slot.className='slot';
    slot.textContent = config.slots?.[index] || (type === 'task-strip' ? `Step ${index+1}` : `Option ${index+1}`);
    const picture=document.createElement('button');picture.type='button';picture.className='picture';
    card.pictureButton=picture;updatePicture(card);
    picture.onclick=()=>openPicker(card);
    const label=document.createElement('p');label.className='card-label';label.textContent=card.label || 'Write a label';
    const input=document.createElement('input');input.className='edit-label no-print';input.value=card.label;input.maxLength=100;input.placeholder='Write a label';input.setAttribute('aria-label',`Label for ${slot.textContent.toLowerCase()}`);
    input.oninput=()=>{card.label=input.value;card.revision++;label.textContent=card.label || 'Write a label';picture.setAttribute('aria-label',`Choose picture for ${card.label || 'card'}`);article.querySelectorAll('.card-actions button').forEach(button=>button.setAttribute('aria-label',`${button.textContent}: ${card.label || slot.textContent}`));const mark=article.querySelector('.mark');if(mark)mark.setAttribute('aria-label',`${isChoice ? 'Choose' : 'Mark done'}: ${card.label || slot.textContent}`);};
    input.onchange=()=>suggest(card);
    const actions=document.createElement('div');actions.className='card-actions no-print';
    for (const [name,delta] of [['Move earlier',-1],['Move later',1]]) {
      const button=document.createElement('button');button.textContent=name;button.setAttribute('aria-label',`${name}: ${card.label || slot.textContent}`);button.disabled=index+delta<0 || index+delta>=cards.length;button.onclick=()=>moveCard(index,delta);actions.append(button);
    }
    if (minCards !== maxCards) {
      const remove=document.createElement('button');remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${card.label || slot.textContent}`);remove.disabled=cards.length<=minCards;remove.onclick=()=>{cards.splice(index,1);render();};actions.append(remove);
    }
    article.append(slot,picture,label,input,actions);
    if (isChoice || type === 'task-strip') {
      const mark=document.createElement('button');mark.className='mark no-print';mark.textContent=isChoice ? (card.marked ? 'Selected' : 'Choose') : (card.marked ? 'Done ✓' : 'Mark done');mark.setAttribute('aria-label',`${isChoice ? 'Choose' : 'Mark done'}: ${card.label || slot.textContent}`);mark.setAttribute('aria-pressed',String(card.marked));
      mark.onclick=()=>{const value=!card.marked;if(isChoice)cards.forEach(item=>{item.marked=false;});card.marked=value;render();};article.append(mark);
    }
    boardElement.append(article);
  });
  document.getElementById('addCard').hidden=minCards===maxCards;
  document.getElementById('addCard').disabled=cards.length>=maxCards;
  document.getElementById('clearMarks').hidden=!!config.slots;
  document.getElementById('clearMarks').textContent=type==='task-strip' ? 'Clear completed steps' : 'Clear selection';
}
const exampleSelect=document.getElementById('example');
Object.keys(config.examples).forEach(name=>exampleSelect.append(new Option(name,name)));
function useExample() {
  activeSavedId=null;savedSelect.value='';titleInput.value=exampleSelect.value;personInput.value='';
  const example=config.examples[exampleSelect.value];cards=example.map(([label])=>newCard(label));updateHeading();render();
  cards.forEach((card,index)=>suggest(card,example[index][1]));
  announce('Example loaded. Customize the labels and pictures.');
}
document.getElementById('useExample').onclick=useExample;
document.getElementById('addCard').onclick=()=>{if(cards.length<maxCards){cards.push(newCard());render();boardElement.querySelectorAll('.edit-label')[cards.length-1].focus();}};
document.getElementById('clearMarks').onclick=()=>{cards.forEach(card=>{card.marked=false;});render();announce('Selections cleared.');};
titleInput.oninput=updateHeading;personInput.oninput=updateHeading;
const picker=document.getElementById('iconPicker');
let pickerCard=null;
let searchRevision=0;
async function searchPictures() {
  const revision=++searchRevision;
  const results=document.getElementById('iconResults');const message=document.getElementById('iconStatus');const term=document.getElementById('iconSearch').value.trim();results.replaceChildren();
  if(!term){message.textContent='Enter a word to find a picture.';return;}
  message.textContent='Searching pictures…';const matches=await ARASAAC.search(term);
  if(revision!==searchRevision || !picker.open)return;
  message.textContent=matches.length?'Select a picture below.':'No pictures found. Try another word or check your connection.';
  matches.slice(0,30).forEach(match=>{
    const button=document.createElement('button');button.type='button';button.className='icon-choice';const label=match.keywords?.[0]?.keyword || `Symbol ${match._id}`;button.setAttribute('aria-label',`Use ${label} picture`);
    const image=document.createElement('img');image.src=ARASAAC.imageUrl(match._id);image.alt='';const caption=document.createElement('span');caption.textContent=label;button.append(image,caption);
    button.onclick=()=>{if(pickerCard&&cards.includes(pickerCard)){pickerCard.manual=true;pickerCard.revision++;pickerCard.pictogramId=match._id;updatePicture(pickerCard);}picker.close();};results.append(button);
  });
}
function openPicker(card){pickerCard=card;document.getElementById('iconSearch').value=card.label;picker.showModal();searchPictures();}
document.getElementById('iconSearchForm').onsubmit=event=>{event.preventDefault();searchPictures();};
document.getElementById('closePicker').onclick=()=>picker.close();
document.getElementById('removeIcon').onclick=()=>{if(pickerCard){pickerCard.manual=true;pickerCard.revision++;pickerCard.pictogramId=null;updatePicture(pickerCard);}picker.close();};
picker.addEventListener('close',()=>{pickerCard=null;searchRevision++;});
function readLibrary(){const raw=localStorage.getItem(storageKey);if(!raw)return [];const library=JSON.parse(raw);if(!Array.isArray(library)||library.some(entry=>!entry||typeof entry.id!=='string'))throw new Error('Saved boards could not be read. Export your open board for a backup.');library.forEach(entry=>SupportData.validate(entry.payload,type));return library;}
function refreshLibrary(){savedSelect.replaceChildren(new Option('Choose a saved board',''));try{readLibrary().forEach(entry=>savedSelect.append(new Option(entry.payload.board.title || 'Untitled board',entry.id)));savedSelect.value=activeSavedId || '';}catch(error){announce(`Browser saving is unavailable. ${error.message} Use Export board instead.`);}}
async function currentPayload(){await Promise.allSettled([...pending]);return SupportData.serialize({type,title:titleInput.value,person:personInput.value,cards:cards.map(card=>({label:card.label,pictogramId:card.pictogramId,marked:card.marked}))});}
function openBoard(board){if(picker.open)picker.close();titleInput.value=board.title;personInput.value=board.person;cards=board.cards.map(card=>newCard(card.label,card.pictogramId,card.marked,true));updateHeading();render();}
document.getElementById('saveBoard').onclick=async()=>{
  const button=document.getElementById('saveBoard');button.disabled=true;
  try{const payload=await currentPayload();if(!payload.board.title.trim()){announce('Give your board a name before saving.');return;}const library=readLibrary();const id=activeSavedId || crypto.randomUUID();const entry={id,payload};const index=library.findIndex(item=>item.id===id);if(index<0)library.push(entry);else library[index]=entry;localStorage.setItem(storageKey,JSON.stringify(library));activeSavedId=id;refreshLibrary();announce(`Saved “${payload.board.title}” in this browser.`);}catch(error){announce(`Could not save. ${error.message} You can still export a file.`);}finally{button.disabled=false;}
};
document.getElementById('loadBoard').onclick=()=>{try{const entry=readLibrary().find(item=>item.id===savedSelect.value);if(!entry){announce('Choose a saved board to load.');return;}openBoard(SupportData.validate(entry.payload,type));activeSavedId=entry.id;announce(`Loaded “${entry.payload.board.title}”.`);}catch(error){announce(`Could not load. ${error.message}`);}};
document.getElementById('deleteBoard').onclick=()=>{try{const id=savedSelect.value;const library=readLibrary();const entry=library.find(item=>item.id===id);if(!entry){announce('Choose a saved board to delete.');return;}if(!window.confirm(`Delete the saved copy of “${entry.payload.board.title}”? Your open board will stay on screen.`))return;localStorage.setItem(storageKey,JSON.stringify(library.filter(item=>item.id!==id)));if(activeSavedId===id)activeSavedId=null;refreshLibrary();announce('Saved copy deleted. Your open board is unchanged.');}catch(error){announce(`Could not delete. ${error.message}`);}};
document.getElementById('exportBoard').onclick=async()=>{
  const button=document.getElementById('exportBoard');button.disabled=true;
  try{const payload=await currentPayload();const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`${type}-${payload.board.title.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'') || 'board'}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Board exported with its pictures and selections.');}catch(error){announce(`Could not export. ${error.message}`);}finally{button.disabled=false;}
};
const importFile=document.getElementById('importFile');document.getElementById('importBoard').onclick=()=>importFile.click();
importFile.onchange=async()=>{const file=importFile.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('Choose a file smaller than 1 MB.');const board=SupportData.validate(JSON.parse(await file.text()),type);openBoard(board);activeSavedId=null;savedSelect.value='';announce(`Imported “${board.title}”. Press Save board to keep it in this browser.`);}catch(error){announce(`Could not import. ${error.message} Your current board is unchanged.`);}finally{importFile.value='';}};
document.getElementById('printBoard').onclick=async()=>{const button=document.getElementById('printBoard');button.disabled=true;try{await Promise.allSettled([...pending]);await Promise.allSettled([...boardElement.querySelectorAll('img')].map(image=>image.decode()));window.print();}finally{button.disabled=false;}};
useExample();refreshLibrary();
