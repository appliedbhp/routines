const examples = {
  daily: ['Make bed', 'Put clothes in hamper', 'Put away toys', 'Bring dishes to the sink', 'Pack bag for tomorrow'],
  bedroom: ['Make bed', 'Put away books', 'Put away toys', 'Clear desk', 'Put clothes in hamper', 'Put clean clothes away'],
  family: ['Set the table', 'Clear the table', 'Wipe the table', 'Water plants', 'Sort laundry', 'Sweep the floor'],
  classroom: ['Put away supplies', 'Tidy the reading corner', 'Help pass out materials', 'Wipe desk', 'Check the floor for litter'],
  selfcare: ['Brush teeth in the morning', 'Get dressed', 'Put shoes away', 'Pack bag', 'Brush teeth before bed'],
  blank: ['', '', '', '', '', ''],
};
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const rows = document.getElementById('rows');
const pendingIcons = new Set();
let activeSavedId = null;
const keywords = {
  'Make bed': 'make bed', 'Put clothes in hamper': 'laundry', 'Put away toys': 'tidy up',
  'Bring dishes to the sink': 'dishes', 'Pack bag for tomorrow': 'backpack',
  'Put away books': 'books', 'Clear desk': 'desk', 'Put clean clothes away': 'clothes',
  'Set the table': 'set the table', 'Clear the table': 'clear the table',
  'Wipe the table': 'clean table', 'Water plants': 'water plants', 'Sort laundry': 'laundry',
  'Sweep the floor': 'sweep', 'Put away supplies': 'tidy up', 'Tidy the reading corner': 'books',
  'Help pass out materials': 'distribute', 'Wipe desk': 'clean table',
  'Check the floor for litter': 'rubbish', 'Brush teeth in the morning': 'brush teeth',
  'Get dressed': 'get dressed', 'Put shoes away': 'shoes', 'Pack bag': 'backpack',
  'Brush teeth before bed': 'brush teeth',
};
function symbolKeyword(name) { return keywords[name] || name.trim(); }
function bestSymbol(matches, term) {
  const normalize = value => value.toLowerCase().replace(/\b(the|a|an|to)\b/g, '').replace(/\s+/g, ' ').trim();
  const target = normalize(term);
  return matches.find(match => match.keywords?.some(keyword => normalize(keyword.keyword || '') === target)) || matches[0];
}
const picker = document.getElementById('iconPicker');
let choosePicture;
let searchRevision = 0;
async function searchPictures() {
  const current = ++searchRevision;
  const results = document.getElementById('iconResults');
  const status = document.getElementById('iconStatus');
  const term = document.getElementById('iconSearch').value.trim();
  results.replaceChildren();
  if (!term) { status.textContent = 'Enter a word to find a picture.'; return; }
  status.textContent = 'Searching pictures…';
  const matches = await ARASAAC.search(term);
  if (current !== searchRevision || !picker.open) return;
  status.textContent = matches.length ? 'Select a picture below.' : 'No pictures found. Try another word or check your internet connection.';
  matches.slice(0, 30).forEach(match => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-choice';
    const label = match.keywords?.[0]?.keyword || `Symbol ${match._id}`;
    button.setAttribute('aria-label', `Use ${label} picture`);
    const image = document.createElement('img');
    image.src = ARASAAC.imageUrl(match._id);
    image.alt = '';
    const caption = document.createElement('span');
    caption.textContent = label;
    button.append(image, caption);
    button.onclick = () => { choosePicture?.(match._id); picker.close(); };
    results.append(button);
  });
}
function openPicker(name, onChoose) {
  choosePicture = onChoose;
  document.getElementById('iconSearch').value = symbolKeyword(name);
  picker.showModal();
  searchPictures();
}
document.getElementById('iconSearchForm').onsubmit = event => { event.preventDefault(); searchPictures(); };
document.getElementById('closePicker').onclick = () => picker.close();
document.getElementById('removeIcon').onclick = () => { choosePicture?.(null); picker.close(); };
picker.addEventListener('close', () => { searchRevision++; choosePicture = null; });
function addRow(name = '', saved = null) {
  if (rows.children.length >= 10) {
    document.getElementById('status').textContent = 'Use up to 10 chores per chart so your printed page stays readable.';
    return;
  }
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'chore-cell';
  const input = document.createElement('input');
  input.value = name;
  input.maxLength = 200;
  input.placeholder = 'Write a chore';
  input.setAttribute('aria-label', 'Chore name');
  const remove = document.createElement('button');
  remove.className = 'remove no-print';
  remove.textContent = '×';
  remove.setAttribute('aria-label', 'Remove this chore');
  remove.onclick = () => row.remove();
  const icon = document.createElement('button');
  icon.type = 'button';
  icon.className = 'chore-icon';
  icon.innerHTML = '<span>Picture</span>';
  icon.setAttribute('aria-label', `Choose picture for ${name || 'chore'}`);
  let revision = 0;
  let manualIcon = saved !== null;
  function setPicture(id) {
    row.dataset.pictogramId = id ? String(id) : '';
    icon.replaceChildren();
    if (!id) {
      const placeholder = document.createElement('span');
      placeholder.textContent = 'Picture';
      icon.append(placeholder);
      return;
    }
    const image = document.createElement('img');
    image.src = ARASAAC.imageUrl(id);
    image.alt = '';
    image.onerror = () => {
      // Keep the selected ID for export/retry even when its image is offline.
      image.hidden = true;
      const placeholder = document.createElement('span');
      placeholder.textContent = 'Picture unavailable';
      icon.append(placeholder);
    };
    icon.append(image);
  }
  async function suggestPicture() {
    const current = ++revision;
    const term = symbolKeyword(input.value);
    if (!term || manualIcon) return;
    const task = ARASAAC.search(term).then(results => {
      if (current === revision && !manualIcon && row.isConnected) setPicture(bestSymbol(results, term)?._id);
    });
    pendingIcons.add(task);
    try { await task; } finally { pendingIcons.delete(task); }
  }
  icon.onclick = () => openPicker(input.value, id => {
    manualIcon = true;
    revision++;
    setPicture(id);
  });
  input.addEventListener('change', () => { if (!manualIcon) suggestPicture(); });
  input.addEventListener('input', () => {
    revision++;
    icon.setAttribute('aria-label', `Choose picture for ${input.value || 'chore'}`);
  });
  wrap.append(icon, input, remove);
  cell.append(wrap);
  row.append(cell);
  days.forEach((day, dayIndex) => {
    const dayCell = document.createElement('td');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = saved?.checked[dayIndex] || false;
    const updateLabel = () => check.setAttribute('aria-label', `${input.value || 'Chore'} completed on ${day}`);
    updateLabel();
    input.addEventListener('input', updateLabel);
    dayCell.append(check);
    row.append(dayCell);
  });
  rows.append(row);
  if (saved) setPicture(saved.pictogramId);
  else suggestPicture();
}
function loadExample() {
  activeSavedId = null;
  document.getElementById('savedCharts').value = '';
  document.getElementById('chartName').value = document.getElementById('example').selectedOptions[0].textContent;
  updateTitle();
  rows.replaceChildren();
  examples[document.getElementById('example').value].forEach(name => addRow(name));
  document.getElementById('status').textContent = 'Example loaded. Edit any chore to make it your own.';
}
document.getElementById('load').onclick = loadExample;
document.getElementById('add').onclick = () => addRow();
document.getElementById('clear').onclick = () => {
  rows.querySelectorAll('input[type=checkbox]').forEach(input => { input.checked = false; });
  document.getElementById('status').textContent = 'Checkmarks cleared.';
};
document.getElementById('print').onclick = async () => {
  const button = document.getElementById('print');
  button.disabled = true;
  try {
    await Promise.allSettled([...pendingIcons]);
    await Promise.allSettled([...rows.querySelectorAll('img')].map(image => image.decode()));
    window.print();
  } finally { button.disabled = false; }
};
const SAVED_CHARTS_KEY = 'routineVisualTimer.savedChoreCharts.v1';
function announce(message) { document.getElementById('status').textContent = message; }
function updateTitle() {
  document.querySelector('.chart-name').textContent = document.getElementById('chartName').value.trim() || 'My weekly chore chart';
}
document.getElementById('chartName').addEventListener('input', updateTitle);
function readLibrary() {
  const raw = localStorage.getItem(SAVED_CHARTS_KEY);
  if (!raw) return [];
  const library = JSON.parse(raw);
  if (!Array.isArray(library) || library.some(entry => !entry || typeof entry.id !== 'string')) {
    throw new Error('The saved chart library could not be read. Export your current chart for a backup.');
  }
  library.forEach(entry => ChoreChartData.validate(entry.payload));
  return library;
}
function refreshSavedCharts(selected = activeSavedId) {
  const select = document.getElementById('savedCharts');
  select.replaceChildren(new Option('Choose a saved chart', ''));
  try {
    readLibrary().forEach(entry => select.append(new Option(entry.payload.chart.name || 'Untitled chart', entry.id)));
    select.value = selected || '';
  } catch (error) { announce(error.message || 'Browser storage is unavailable. Use Export chart instead.'); }
}
async function currentChart() {
  await Promise.allSettled([...pendingIcons]);
  return ChoreChartData.serialize({
    name: document.getElementById('chartName').value,
    person: document.getElementById('personName').value,
    week: document.getElementById('weekOf').value,
    chores: [...rows.children].map(row => ({
      name: row.querySelector('.chore-cell input').value,
      pictogramId: row.dataset.pictogramId ? Number(row.dataset.pictogramId) : null,
      checked: [...row.querySelectorAll('input[type=checkbox]')].map(input => input.checked),
    })),
  });
}
function openChart(chart) {
  // Validate first so a bad file never replaces the current chart.
  chart = ChoreChartData.validate(ChoreChartData.serialize(chart));
  if (picker.open) picker.close();
  rows.replaceChildren();
  document.getElementById('chartName').value = chart.name;
  document.getElementById('personName').value = chart.person;
  document.getElementById('weekOf').value = chart.week;
  chart.chores.forEach(chore => addRow(chore.name, chore));
  updateTitle();
}
document.getElementById('saveChart').onclick = async () => {
  const button = document.getElementById('saveChart');
  button.disabled = true;
  try {
    const payload = await currentChart();
    if (!payload.chart.name.trim()) { announce('Give your chart a name before saving.'); return; }
    const library = readLibrary();
    const id = activeSavedId || crypto.randomUUID();
    const entry = {id, payload};
    const index = library.findIndex(item => item.id === id);
    if (index < 0) library.push(entry); else library[index] = entry;
    localStorage.setItem(SAVED_CHARTS_KEY, JSON.stringify(library));
    activeSavedId = id;
    refreshSavedCharts();
    announce(`Saved “${payload.chart.name}” in this browser.`);
  } catch (error) { announce(`Could not save this chart. ${error.message} You can still export it as a file.`); }
  finally { button.disabled = false; }
};
document.getElementById('loadChart').onclick = () => {
  try {
    const id = document.getElementById('savedCharts').value;
    const entry = readLibrary().find(item => item.id === id);
    if (!entry) { announce('Choose a saved chart to load.'); return; }
    openChart(ChoreChartData.validate(entry.payload));
    activeSavedId = id;
    announce(`Loaded “${entry.payload.chart.name}”.`);
  } catch (error) { announce(`Could not load this chart. ${error.message}`); }
};
document.getElementById('deleteChart').onclick = () => {
  try {
    const id = document.getElementById('savedCharts').value;
    if (!id) { announce('Choose a saved chart to delete.'); return; }
    const library = readLibrary();
    const entry = library.find(item => item.id === id);
    if (!entry || !window.confirm(`Delete the saved copy of “${entry.payload.chart.name}”? The chart currently open will stay on screen.`)) return;
    localStorage.setItem(SAVED_CHARTS_KEY, JSON.stringify(library.filter(item => item.id !== id)));
    if (activeSavedId === id) activeSavedId = null;
    refreshSavedCharts();
    announce('Saved copy deleted. Your open chart is unchanged.');
  } catch (error) { announce(`Could not delete the saved copy. ${error.message}`); }
};
document.getElementById('exportChart').onclick = async () => {
  const button = document.getElementById('exportChart');
  button.disabled = true;
  try {
    const payload = await currentChart();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (payload.chart.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'weekly-chore-chart') + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Chart exported with its pictures and checkmarks.');
  } catch (error) { announce(`Could not export this chart. ${error.message}`); }
  finally { button.disabled = false; }
};
const importFile = document.getElementById('importFile');
document.getElementById('importChart').onclick = () => importFile.click();
importFile.onchange = async () => {
  const file = importFile.files[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Choose a chart file smaller than 1 MB.');
    const chart = ChoreChartData.validate(JSON.parse(await file.text()));
    openChart(chart);
    activeSavedId = null;
    document.getElementById('savedCharts').value = '';
    announce(`Imported “${chart.name}”. Press Save chart to keep it in this browser.`);
  } catch (error) { announce(`Could not import this file. ${error.message} Your current chart is unchanged.`); }
  finally { importFile.value = ''; }
};

loadExample();
refreshSavedCharts();
