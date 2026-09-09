const CATEGORIES = {
  morning: { label: "Morning Routine", tabKeyword: "sun", suggestions: ["Make Bed", "Get Dressed", "Breakfast", "Brush Teeth", "Backpack", "Put On Shoes"] },
  evening: { label: "Evening Routine", tabKeyword: "moon", suggestions: ["Bath", "Brush Teeth", "Read", "Go to Bed", "Sleep"] },
  chores: { label: "Chores", tabKeyword: "broom", suggestions: ["Take Out Trash", "Wash Dishes", "Feed Dog", "Clean Toilet"] },
  tasks: { label: "Tasks", tabKeyword: "pencil", suggestions: ["Writing", "Reading", "Circle Time", "Recess"] },
};

// TimeTimer affiliate — required by the Refersion program terms.
const AFFILIATE_URL = "https://bit.ly/3Plh1Y4";
const QR_IMAGE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(AFFILIATE_URL)}`;

const PROJECTION_INNER_RADIUS = 1.3; // in — smaller hub than the print spec, for the clock + countdown
const PRINT_OUTER_MARGIN = 0.08; // in — room for the full outline stroke on every side
const PRINT_INNER_RADIUS = 1.75; // in — print hub: 3.5in diameter
const PRINT_OUTER_RADIUS = 3.5; // in — print ring: 7in diameter
const PROJECTION_OUTER_MARGIN = 0.75; // in — extra viewBox canvas reserved for boundary-time labels, so they scale with the SVG instead of relying on CSS overflow

const SIZE_SCALES = [
  { label: "S", value: 1 },
  { label: "M", value: 1.3 },
  { label: "L", value: 1.65 },
  { label: "XL", value: 2.05 },
];

const BRAND_NAME = "Applied Behavioral Health Practice";
const BRAND_URL = "https://routines.getadhd.care";

const SAVE_KEY = "routineVisualTimer.savedRoutines";

const SOUND_FILES = {
  chime: "assets/audio/chime.mp3",
  tick: "assets/audio/tick.mp3",
  victory: "assets/audio/victory.mp3",
};
const soundCache = {};
Object.entries(SOUND_FILES).forEach(([key, src]) => {
  const a = new Audio(src);
  a.preload = "auto";
  soundCache[key] = a;
});
const playingSounds = new Set();
function playSound(key) {
  if (state.quiet || !state.sounds[key]) return;
  const base = soundCache[key];
  if (!base) return;
  try {
    const node = base.cloneNode(true);
    playingSounds.add(node);
    node.onended = () => playingSounds.delete(node);
    node.play().catch(() => playingSounds.delete(node));
  } catch (e) {
    /* audio unavailable — non-fatal */
  }
}

const state = {
  category: "morning",
  totalMinutes: 30,
  autoTotal: true,
  steps: [],
  view: "builder",
  theme: "classic",
  flexible: false,
  flexIndex: 0,
  quiet: true,
  sounds: { chime: true, tick: true, victory: true },
  showClock: true,
  projFontScale: 1.3,
  projIconScale: 1.3,
  projTextColor: "", // "" = theme default (white on the dark stage)
  printFontScale: 1.3,
  printIconScale: 1.3,
  timer: { running: false, startedAt: null, elapsedMinutesAtPause: 0, intervalId: null, discColor: "#e53935" },
  iconPickerTargetId: null,
};

// Sound-transition tracking (reset whenever the projection timer resets)
let lastStepIndexForSound = null;
let lastTickSecond = null;
let victoryPlayed = false;

let uidCounter = 1;
const uid = () => `id-${Date.now().toString(36)}-${uidCounter++}`;

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stepSum() {
  return state.steps.reduce((a, s) => a + (Number(s.minutes) || 0), 0);
}

function syncAutoTotal() {
  if (state.autoTotal) state.totalMinutes = stepSum();
}

async function addStepFromKeyword(name) {
  const step = { id: uid(), name, minutes: 5, imageUrl: null, pictogramId: null };
  state.steps.push(step);
  syncAutoTotal();
  renderBuilder();
  renderWheelForCurrentView();
  const results = await ARASAAC.search(name);
  if (results[0]) {
    step.pictogramId = results[0]._id;
    step.imageUrl = ARASAAC.imageUrl(results[0]._id);
    syncAutoTotal();
    renderBuilder();
    renderWheelForCurrentView();
  }
}

function addBlankStep() {
  state.steps.push({ id: uid(), name: "New step", minutes: 5, imageUrl: null, pictogramId: null });
  syncAutoTotal();
  renderBuilder();
  renderWheelForCurrentView();
}

function removeStep(id) {
  state.steps = state.steps.filter((s) => s.id !== id);
  syncAutoTotal();
  renderBuilder();
  renderWheelForCurrentView();
}

// Full update: rebuilds the step list DOM too. Use for structural changes
// (icon swap) — NOT for live typing, since rebuilding the list mid-keystroke
// steals focus from the input the user is typing in.
function updateStep(id, patch) {
  const step = state.steps.find((s) => s.id === id);
  if (!step) return;
  Object.assign(step, patch);
  syncAutoTotal();
  renderBuilder();
  renderWheelForCurrentView();
}

// Quiet update: mutates state and refreshes the wheel + totals, but leaves
// the step-list DOM (and therefore the focused input) untouched. Use this
// for the name/minutes fields' oninput handlers.
function updateStepQuiet(id, patch) {
  const step = state.steps.find((s) => s.id === id);
  if (!step) return;
  Object.assign(step, patch);
  syncAutoTotal();
  renderTotalsUI();
  renderWheelForCurrentView();
}

function switchCategory(cat) {
  state.category = cat;
  renderCategoryTabs();
  renderSuggestionChips();
  renderWheelForCurrentView();
}

function switchView(view) {
  state.view = view;
  document.body.dataset.view = view;
  document.querySelectorAll(".view-tab").forEach((el) => el.classList.toggle("active", el.dataset.view === view));
  document.querySelectorAll(".view-panel").forEach((el) => el.classList.toggle("active", el.dataset.view === view));
  if (view === "projection") {
    resetTimer();
  } else {
    pauseTimer();
  }
  renderWheelForCurrentView();
  if (view === "projection") requestAnimationFrame(fitProjection);
}

function renderWheelForCurrentView() {
  if (state.view === "builder") {
    renderWheelInto("builderWheel", {
      centerMode: "label",
      centerLabel: [CATEGORIES[state.category].label, `${state.totalMinutes} min`],
    });
  }
  if (state.view === "print") renderPrintView();
  if (state.view === "projection") renderProjectionWheel();
  renderTotalsUI();
}

function renderWheelInto(elId, opts) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { svg, overflowing } = Wheel.render(state.steps, state.totalMinutes, opts);
  if (el.querySelector(".is-dragging")) return;
  el.innerHTML = svg;
  fitWheelLabels(el);
  if (opts.layoutMode) bindWheelPositions(el, opts.layoutMode);
  const warn = document.getElementById("overflowWarning");
  if (warn) warn.hidden = !overflowing;
  return svg;
}

// ---------- Builder UI ----------

function renderCategoryTabs() {
  const wrap = document.getElementById("categoryTabs");
  wrap.innerHTML = "";
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const btn = document.createElement("button");
    btn.className = "category-tab" + (key === state.category ? " active" : "");
    btn.textContent = cat.label;
    btn.onclick = () => switchCategory(key);
    wrap.appendChild(btn);
  });
}

function renderSuggestionChips() {
  const wrap = document.getElementById("suggestionChips");
  wrap.innerHTML = "";
  CATEGORIES[state.category].suggestions.forEach((word) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = `+ ${word}`;
    chip.onclick = () => addStepFromKeyword(word);
    wrap.appendChild(chip);
  });
}

function renderTotalsUI() {
  const sum = stepSum();
  document.getElementById("stepSumDisplay").textContent = `${sum} min`;
  const totalInput = document.getElementById("totalMinutesInput");
  totalInput.value = state.totalMinutes;
  totalInput.disabled = state.autoTotal;
  document.getElementById("autoTotalCheckbox").checked = state.autoTotal;
}

function renderBuilder() {
  const list = document.getElementById("stepList");
  list.innerHTML = "";
  state.steps.forEach((step) => {
    const row = document.createElement("div");
    row.className = "step-row";

    const thumb = document.createElement("button");
    thumb.className = "step-thumb";
    thumb.title = "Change icon";
    thumb.innerHTML = step.imageUrl ? `<img src="${escapeHTML(step.imageUrl)}" alt="">` : `<span class="thumb-placeholder">?</span>`;
    thumb.onclick = () => openIconPicker(step.id);
    row.appendChild(thumb);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = step.name;
    nameInput.className = "step-name-input";
    nameInput.oninput = (e) => updateStepQuiet(step.id, { name: e.target.value });
    row.appendChild(nameInput);

    const minutesInput = document.createElement("input");
    minutesInput.type = "number";
    minutesInput.min = "1";
    minutesInput.value = step.minutes;
    minutesInput.className = "step-minutes-input";
    minutesInput.oninput = (e) => updateStepQuiet(step.id, { minutes: Number(e.target.value) });
    row.appendChild(minutesInput);

    const minLabel = document.createElement("span");
    minLabel.className = "min-label";
    minLabel.textContent = "min";
    row.appendChild(minLabel);

    const del = document.createElement("button");
    del.className = "step-delete";
    del.textContent = "×";
    del.title = "Remove step";
    del.onclick = () => removeStep(step.id);
    row.appendChild(del);

    list.appendChild(row);
  });
  renderTotalsUI();
}

// ---------- Icon picker modal ----------

function openIconPicker(stepId) {
  state.iconPickerTargetId = stepId;
  const modal = document.getElementById("iconModal");
  modal.hidden = false;
  document.getElementById("iconSearchInput").value = "";
  document.getElementById("iconResults").innerHTML = "";
  document.getElementById("iconSearchInput").focus();
}

function closeIconPicker() {
  document.getElementById("iconModal").hidden = true;
  state.iconPickerTargetId = null;
}

let iconSearchDebounce = null;
function onIconSearchInput(e) {
  clearTimeout(iconSearchDebounce);
  const term = e.target.value;
  iconSearchDebounce = setTimeout(() => runIconSearch(term), 350);
}

async function runIconSearch(term) {
  const resultsEl = document.getElementById("iconResults");
  if (!term.trim()) {
    resultsEl.innerHTML = "";
    return;
  }
  resultsEl.innerHTML = `<p class="icon-search-status">Searching…</p>`;
  const results = await ARASAAC.search(term);
  resultsEl.innerHTML = "";
  if (!results.length) {
    resultsEl.innerHTML = `<p class="icon-search-status">No symbols found for "${term}".</p>`;
    return;
  }
  results.slice(0, 24).forEach((r) => {
    const btn = document.createElement("button");
    btn.className = "icon-result";
    btn.innerHTML = `<img src="${ARASAAC.imageUrl(r._id, 300)}" alt="">`;
    btn.onclick = () => {
      updateStep(state.iconPickerTargetId, { imageUrl: ARASAAC.imageUrl(r._id), pictogramId: r._id });
      closeIconPicker();
    };
    resultsEl.appendChild(btn);
  });
}

// ---------- Save / load routines (localStorage) ----------

function loadSavedRoutines() {
  try {
    const records = JSON.parse(localStorage.getItem(SAVE_KEY));
    return Array.isArray(records) ? records : [];
  } catch (e) {
    return [];
  }
}

function persistSavedRoutines(list) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    showSaveStatus("Could not save in this browser. Export a file to keep your routine.");
    return false;
  }
}

function renderSavedRoutinesSelect() {
  const select = document.getElementById("savedRoutinesSelect");
  const list = loadSavedRoutines().sort((a, b) => b.savedAt - a.savedAt);
  const prevValue = select.value;
  select.innerHTML =
    `<option value="">Saved routines (${list.length})…</option>` +
    list.map((r) => `<option value="${r.id}">${escapeHTML(r.name)} — ${new Date(r.savedAt).toLocaleDateString()}</option>`).join("");
  if (list.some((r) => r.id === prevValue)) select.value = prevValue;
}

function showSaveStatus(msg) {
  const el = document.getElementById("saveStatus");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showSaveStatus._t);
  showSaveStatus._t = setTimeout(() => {
    el.hidden = true;
  }, 2500);
}

function saveCurrentRoutine() {
  const nameInput = document.getElementById("routineNameInput");
  const name = nameInput.value.trim() || `${CATEGORIES[state.category].label} — ${new Date().toLocaleDateString()}`;
  const list = loadSavedRoutines();
  list.push({ ...routineRecord(name), id: uid(), savedAt: Date.now() });
  if (!persistSavedRoutines(list)) return;
  nameInput.value = name;
  renderSavedRoutinesSelect();
  showSaveStatus(`Saved "${name}" to this browser.`);
}

function loadSelectedRoutine() {
  const select = document.getElementById("savedRoutinesSelect");
  const id = select.value;
  if (!id) return;
  const record = loadSavedRoutines().find((r) => r.id === id);
  if (!record) return;
  try {
    openRoutine(normalizeRoutine(record));
    showSaveStatus(`Loaded "${record.name}".`);
  } catch (error) { showSaveStatus(error.message); }
}

function deleteSelectedRoutine() {
  const select = document.getElementById("savedRoutinesSelect");
  const id = select.value;
  if (!id) return;
  const list = loadSavedRoutines();
  const record = list.find((r) => r.id === id);
  persistSavedRoutines(list.filter((r) => r.id !== id));
  renderSavedRoutinesSelect();
  if (record) showSaveStatus(`Deleted "${record.name}".`);
}

// ---------- Print view ----------

function renderPrintView() {
  const theme = currentTheme();
  const title = document.getElementById("printRoutineTitle");
  title.textContent = document.getElementById("routineNameInput").value.trim() || CATEGORIES[state.category].label;
  document.querySelector(".print-page").classList.toggle("uppercase-theme", !!theme.uppercase);
  title.style.fontFamily = theme.fontFamily;
  const holder = document.getElementById("printWheel");
  holder.style.fontFamily = theme.fontFamily;
  // One SVG unit remains one inch: expand the physical canvas along with its viewBox.
  holder.style.setProperty("--print-wheel-size", `${2 * (PRINT_OUTER_RADIUS + PRINT_OUTER_MARGIN)}in`);
  renderWheelInto("printWheel", {
    layoutMode: "print",
    outerMargin: PRINT_OUTER_MARGIN,
    outerRadius: PRINT_OUTER_RADIUS,
    innerRadius: PRINT_INNER_RADIUS,
    palette: theme.palette,
    outlineOnly: true,
    labelFontScale: state.printFontScale,
    iconScale: state.printIconScale,
    centerMode: "qr",
    qrImageUrl: QR_IMAGE_URL,
    qrSize: 0.85,
    qrCaptionLines: ["Works best with", "TimeTimer TWIST"],
  });
}

// ---------- Themes ----------

function currentTheme() {
  return THEMES[state.theme] || THEMES.classic;
}

function renderThemeSelect() {
  const options = THEME_ORDER.map((key) => `<option value="${key}">${escapeHTML(THEMES[key].label)}</option>`).join("");
  ["themeSelect", "printThemeSelect"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = options;
    select.value = state.theme;
  });
}

function applyTheme(themeKey) {
  state.theme = themeKey;
  const theme = currentTheme();
  const stage = document.getElementById("projectionStage");
  stage.style.background = theme.stageBackground;
  stage.style.fontFamily = theme.fontFamily;
  stage.classList.toggle("uppercase-theme", !!theme.uppercase);
  state.timer.discColor = theme.accent;
  renderThemeSelect();
  renderDiscColorSwatches();
  tickProjection();
  if (state.view === "print") renderPrintView();
  loadThemeFont(theme).then(() => {
    if (state.theme === themeKey) renderWheelForCurrentView();
  }).catch(() => {});
}

// ---------- Projection view (live timer) ----------

function resetTimer() {
  stopTimerInterval();
  state.timer.running = false;
  state.timer.startedAt = null;
  state.timer.elapsedMinutesAtPause = 0;
  state.flexIndex = 0;
  lastStepIndexForSound = null;
  lastTickSecond = null;
  victoryPlayed = false;
  tickProjection();
  updateTimerButtons();
}

function startTimer() {
  if (state.timer.running || routineFinished() || !state.steps.length) return;
  state.timer.running = true;
  const controls = document.getElementById("stageControls");
  if (controls) controls.open = false;
  state.timer.startedAt = Date.now() - state.timer.elapsedMinutesAtPause * 60000;
  tickProjection(); // Resuming immediately rebases every wall-clock boundary.
  state.timer.intervalId = setInterval(() => tickProjection(true), 250);
  updateTimerButtons();
}

function pauseTimer() {
  if (!state.timer.running) return;
  state.timer.elapsedMinutesAtPause = getElapsedMinutes();
  state.timer.running = false;
  stopTimerInterval();
  tickProjection();
  updateTimerButtons();
}

function stopTimerInterval() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}

function routineFinished() {
  return state.flexible ? state.flexIndex >= state.steps.length : getElapsedMinutes() >= Math.max(state.totalMinutes, stepSum());
}

function updateTimerButtons() {
  const finished = routineFinished() || !state.steps.length;
  ["startTimerBtn", "stagePlayBtn"].forEach((id) => {
    const button = document.getElementById(id);
    button.disabled = state.timer.running || finished;
    button.textContent = state.timer.startedAt == null ? "▶ Play" : "▶ Resume";
  });
  ["pauseTimerBtn", "stagePauseBtn"].forEach((id) => document.getElementById(id).disabled = !state.timer.running);
  ["nextStepBtn", "stageNextBtn"].forEach((id) => {
    const button = document.getElementById(id);
    button.hidden = !state.flexible;
    button.disabled = finished;
  });
}

function getElapsedMinutes() {
  const raw = state.timer.running && state.timer.startedAt != null
    ? (Date.now() - state.timer.startedAt) / 60000 : state.timer.elapsedMinutesAtPause;
  const limit = state.flexible ? state.steps.slice(0, state.flexIndex + 1).reduce((sum, step) => sum + step.minutes, 0) : Math.max(state.totalMinutes, stepSum());
  return Math.max(0, Math.min(raw, limit));
}

function nextStep() {
  if (!state.flexible || routineFinished()) return;
  state.flexIndex++;
  const elapsed = state.steps.slice(0, state.flexIndex).reduce((sum, step) => sum + step.minutes, 0);
  state.timer.elapsedMinutesAtPause = elapsed;
  state.timer.startedAt = Date.now() - elapsed * 60000;
  tickProjection(true);
  updateTimerButtons();
}

function renderProjectionWheel() {
  renderDiscColorSwatches();
  renderThemeSelect();
  renderScaleButtonGroup("fontScaleButtons", "Text size", () => state.projFontScale, (v) => {
    state.projFontScale = v;
    applyProjectionTextStyle();
    tickProjection();
  });
  renderScaleButtonGroup("projIconScaleButtons", "Icon size", () => state.projIconScale, (v) => {
    state.projIconScale = v;
    tickProjection();
  });
  tickProjection();
  updateTimerButtons();
}

function renderDiscColorSwatches() {
  const wrap = document.getElementById("discColorSwatches");
  if (!wrap) return;
  wrap.innerHTML = "";
  currentTheme().timerColors.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "color-swatch";
    btn.style.background = c.value;
    btn.title = c.name;
    btn.dataset.color = c.value;
    btn.setAttribute("aria-label", `${c.name} timer color`);
    btn.onclick = () => {
      state.timer.discColor = c.value;
      document.querySelectorAll(".color-swatch").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      tickProjection();
    };
    if (c.value === state.timer.discColor) btn.classList.add("active");
    wrap.appendChild(btn);
  });
}

// Generic S/M/L/XL button group — used for projection text size, projection
// icon size, print text size, and print icon size.
function renderScaleButtonGroup(containerId, ariaLabel, getValue, onSelect) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = "";
  const scales = /text/i.test(ariaLabel) ? [{ label: "🚫 No text", value: 0 }, ...SIZE_SCALES] : SIZE_SCALES;
  scales.forEach((f) => {
    const btn = document.createElement("button");
    btn.className = "font-scale-btn" + (f.value === getValue() ? " active" : "");
    btn.textContent = f.label;
    btn.title = `${ariaLabel}: ${f.label}`;
    btn.setAttribute("aria-pressed", String(f.value === getValue()));
    btn.onclick = () => {
      onSelect(f.value);
      wrap.querySelectorAll(".font-scale-btn").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      wrap.querySelectorAll("button").forEach((el) => el.setAttribute("aria-pressed", String(el === btn)));
    };
    wrap.appendChild(btn);
  });
}

function applyProjectionTextStyle() {
  const stage = document.getElementById("projectionStage");
  stage.classList.toggle("no-routine-text", state.projFontScale === 0);
  stage.style.setProperty("--proj-font-scale", state.projFontScale || 1);
  if (state.projTextColor) {
    stage.style.setProperty("--proj-text-color", state.projTextColor);
  } else {
    stage.style.removeProperty("--proj-text-color");
  }
}

function formatClockTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function tickProjection(playSounds) {
  const total = Math.max(state.totalMinutes, stepSum(), 0.0001);
  const elapsed = Math.min(getElapsedMinutes(), total);
  const angle = (elapsed / total) * 360;
  const doneAll = state.steps.length > 0 && (state.flexible ? state.flexIndex >= state.steps.length : elapsed >= total - 0.0001);

  let cumulative = 0;
  let currentStep = null;
  let currentIndex = -1;
  let nextStep = null;
  for (let i = 0; i < state.steps.length; i++) {
    const s = state.steps[i];
    const stepEnd = cumulative + (Number(s.minutes) || 0);
    if (state.flexible ? i === state.flexIndex : elapsed < stepEnd - 0.0001) {
      currentStep = s;
      currentIndex = i;
      nextStep = state.steps[i + 1] || null;
      break;
    }
    cumulative = stepEnd;
  }

  // ---- sound effects (only for real ticking, never for cosmetic re-renders) ----
  if (playSounds && state.timer.startedAt != null) {
    if (doneAll) {
      if (!victoryPlayed) {
        playSound("victory");
        victoryPlayed = true;
      }
    } else {
      if (currentIndex !== lastStepIndexForSound) {
        playSound("chime");
        lastStepIndexForSound = currentIndex;
      }
      const remainingTotalSeconds = (total - elapsed) * 60;
      if (remainingTotalSeconds <= 10.49) {
        const bucket = Math.max(1, Math.round(remainingTotalSeconds));
        if (bucket !== lastTickSecond) {
          playSound("tick");
          lastTickSecond = bucket;
        }
      } else if (lastTickSecond !== null) {
        lastTickSecond = null;
      }
    }
  }

  const remainingMin = currentStep ? cumulative + currentStep.minutes - elapsed : total - elapsed;
  const countdownText = doneAll ? "0:00" : formatMMSS(Math.max(0, remainingMin) * 60);
  const now = new Date();
  // Virtual origin includes pauses, early advances, and time spent waiting in flexible mode.
  const boundaryBaseTime = state.timer.running ? new Date(now.getTime() - elapsed * 60000)
    : state.timer.startedAt != null ? new Date(state.timer.startedAt) : now;
  const waiting = state.flexible && currentStep && remainingMin <= 0;
  document.getElementById("scheduleHint").textContent = state.flexible
    ? (waiting ? "Ready when you are — press Next step to continue." : "Flexible: each step waits for Next step, even when its time is up.")
    : "Timed: steps advance automatically.";

  renderWheelInto("projectionWheel", {
    layoutMode: "projection",
    innerRadius: PROJECTION_INNER_RADIUS,
    outerMargin: state.showClock && state.projFontScale > 0 ? PROJECTION_OUTER_MARGIN : 0.23,
    palette: currentTheme().palette,
    showPointer: true,
    pointerAngle: angle,
    showDisc: true,
    discAngle: angle,
    discColor: state.timer.discColor,
    activeIndex: doneAll ? -1 : currentIndex,
    showBoundaryTimes: state.showClock,
    boundaryBaseTime,
    centerMode: state.showClock ? "clock" : "none",
    clockTime: now,
    clockDigitalText: formatClockTime(now),
    labelFontScale: state.projFontScale,
    iconScale: state.projIconScale,
    labelColor: state.projTextColor || null,
  });

  const nameEl = document.getElementById("projCurrentName");
  const iconEl = document.getElementById("projCurrentIcon");
  const timeEl = document.getElementById("projCurrentTime");
  const nextEl = document.getElementById("projNextLabel");
  timeEl.style.color = state.timer.discColor;

  if (doneAll) {
    nameEl.textContent = "All done!";
    iconEl.innerHTML = "";
    timeEl.textContent = "";
    nextEl.textContent = "";
  } else if (currentStep) {
    nameEl.textContent = currentStep.name;
    iconEl.innerHTML = currentStep.imageUrl ? `<img src="${escapeHTML(currentStep.imageUrl)}" alt="">` : "";
    timeEl.textContent = waiting ? "Ready for next step" : countdownText;
    nextEl.textContent = nextStep ? `Up next: ${nextStep.name}` : "Last step";
  } else {
    nameEl.textContent = state.steps.length ? "Buffer time" : "Ready to start";
    iconEl.innerHTML = "";
    timeEl.textContent = countdownText;
    nextEl.textContent = state.steps[0] ? `First: ${state.steps[0].name}` : "Add steps in Builder";
  }
  if (doneAll && state.timer.running) {
    state.timer.elapsedMinutesAtPause = elapsed;
    state.timer.running = false;
    stopTimerInterval();
  }
  updateTimerButtons();
}

function formatMMSS(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function requestWheelFullscreen() {
  const el = document.getElementById("projectionStage");
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {
    document.getElementById("scheduleHint").textContent = "Full screen is unavailable in this browser.";
  });
}

// ---------- Init ----------

async function loadDefaultRoutine() {
  const requested = new URLSearchParams(window.location.search).get("preset");
  await usePreset(Object.hasOwn(PRESETS, requested) ? requested : "morning", false);
}

function bindStaticControls() {
  document.getElementById("usePresetBtn").onclick = () => usePreset(document.getElementById("presetSelect").value);
  document.getElementById("exportRoutineBtn").onclick = exportRoutine;
  document.getElementById("importRoutineBtn").onclick = () => document.getElementById("importRoutineInput").click();
  document.getElementById("importRoutineInput").onchange = importRoutine;
  document.getElementById("flexibleCheckbox").onchange = (event) => {
    state.flexible = event.target.checked;
    resetTimer();
  };
  document.getElementById("quietCheckbox").onchange = (event) => setQuiet(event.target.checked);
  Object.keys(state.sounds).forEach((key) => {
    document.getElementById(`sound${key[0].toUpperCase()}${key.slice(1)}`).onchange = (event) => { state.sounds[key] = event.target.checked; };
  });
  document.getElementById("stagePlayBtn").onclick = startTimer;
  document.getElementById("stagePauseBtn").onclick = pauseTimer;
  document.getElementById("stageNextBtn").onclick = nextStep;
  document.getElementById("nextStepBtn").onclick = nextStep;
  document.getElementById("stageQuietBtn").onclick = () => setQuiet(!state.quiet);
  document.getElementById("exitFullscreenBtn").onclick = () => document.exitFullscreen();
  document.getElementById("stageFullscreenBtn").onclick = requestWheelFullscreen;
  document.getElementById("stageInfoBtn").onclick = () => {
    const panel = document.querySelector(".projection-current");
    panel.hidden = !panel.hidden;
    const button = document.getElementById("stageInfoBtn");
    button.textContent = panel.hidden ? "Show current step" : "Hide current step";
    button.setAttribute("aria-pressed", String(!panel.hidden));
  };
  document.addEventListener("fullscreenchange", () => {
    const full = !!document.fullscreenElement;
    document.getElementById("stageFullscreenBtn").hidden = full;
    document.getElementById("exitFullscreenBtn").hidden = !full;
    fitProjection();
  });
  document.getElementById("exitFullscreenBtn").hidden = true;
  window.addEventListener("resize", fitProjection);
  window.visualViewport?.addEventListener("resize", fitProjection);
  new ResizeObserver(() => requestAnimationFrame(fitProjection)).observe(document.getElementById("projectionSettings"));
  document.getElementById("addBlankStepBtn").onclick = addBlankStep;
  document.getElementById("autoTotalCheckbox").onchange = (e) => {
    state.autoTotal = e.target.checked;
    syncAutoTotal();
    renderTotalsUI();
    renderWheelForCurrentView();
  };
  document.getElementById("totalMinutesInput").oninput = (e) => {
    if (!state.autoTotal) {
      state.totalMinutes = Number(e.target.value) || 0;
      renderWheelForCurrentView();
    }
  };
  document.querySelectorAll(".view-tab").forEach((el) => {
    el.onclick = () => switchView(el.dataset.view);
  });
  document.getElementById("iconSearchInput").oninput = onIconSearchInput;
  document.getElementById("iconModalClose").onclick = closeIconPicker;
  document.getElementById("iconModal").onclick = (e) => {
    if (e.target.id === "iconModal") closeIconPicker();
  };
  document.getElementById("showClockCheckbox").onchange = (e) => {
    state.showClock = e.target.checked;
    tickProjection();
  };
  ["print", "projection"].forEach((mode) => {
    document.getElementById(`${mode}ResetPositions`).onclick = () => {
      state.steps.forEach((step) => { if (step.positions) delete step.positions[mode]; });
      renderWheelForCurrentView();
    };
  });
  window.addEventListener("beforeprint", renderPrintView);
  document.fonts.ready.then(() => document.querySelectorAll(".wheel-holder").forEach(fitWheelLabels));
  document.getElementById("printBtn").onclick = () => window.print();
  document.getElementById("startTimerBtn").onclick = startTimer;
  document.getElementById("pauseTimerBtn").onclick = pauseTimer;
  document.getElementById("resetTimerBtn").onclick = resetTimer;
  document.getElementById("fullscreenBtn").onclick = requestWheelFullscreen;
  document.getElementById("themeSelect").onchange = (e) => applyTheme(e.target.value);
  document.getElementById("printThemeSelect").onchange = (e) => applyTheme(e.target.value);
  document.getElementById("fontColorInput").oninput = (e) => {
    state.projTextColor = e.target.value;
    applyProjectionTextStyle();
    tickProjection();
  };
  document.getElementById("fontColorResetBtn").onclick = () => {
    state.projTextColor = "";
    document.getElementById("fontColorInput").value = "#ffffff";
    applyProjectionTextStyle();
    tickProjection();
  };
  document.getElementById("saveRoutineBtn").onclick = saveCurrentRoutine;
  document.getElementById("loadRoutineBtn").onclick = loadSelectedRoutine;
  document.getElementById("deleteRoutineBtn").onclick = deleteSelectedRoutine;
  document.getElementById("routineNameInput").onkeydown = (e) => {
    if (e.key === "Enter") saveCurrentRoutine();
  };
}

const themeFontLoads = new Map();
function loadThemeFont(theme) {
  if (!theme.googleFont) return Promise.resolve();
  if (!themeFontLoads.has(theme.googleFont)) {
    themeFontLoads.set(theme.googleFont, new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.googleFont)}&display=swap`;
      link.onload = () => document.fonts.load(`16px "${theme.googleFont}"`).then(resolve).catch(resolve);
      link.onerror = resolve;
      document.head.appendChild(link);
    }));
  }
  return themeFontLoads.get(theme.googleFont);
}

function fitProjection() {
  if (state.view !== "projection") return;
  const stage = document.getElementById("projectionStage");
  const fullscreen = document.fullscreenElement === stage;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const headerHeight = document.querySelector(".app-header").getBoundingClientRect().height;
  const settingsHeight = document.getElementById("projectionSettings").getBoundingClientRect().height;
  const height = fullscreen ? viewportHeight : Math.max(240, viewportHeight - headerHeight - settingsHeight - 32);
  stage.style.height = `${height}px`;
  stage.style.setProperty("--wheel-size", `${Math.max(160, Math.min(stage.clientWidth, height) - 20)}px`);
}

const PRESETS = {
  morning: { name: "Morning Routine", category: "morning", steps: [["Make Bed", 3], ["Get Dressed", 5], ["Breakfast", 10], ["Brush Teeth", 3], ["Backpack", 5], ["Put On Shoes", 4]] },
  classroom: { name: "Classroom Routine", category: "tasks", steps: [["Circle Time", 10], ["Reading", 15], ["Writing", 15], ["Clean Up", 5], ["Recess", 15]] },
  bedtime: { name: "Bedtime Routine", category: "evening", steps: [["Bath", 10], ["Pajamas", 5], ["Brush Teeth", 3], ["Read", 10], ["Go to Bed", 2]] },
};

function setQuiet(quiet) {
  state.quiet = quiet;
  if (quiet) {
    playingSounds.forEach((audio) => audio.pause());
    playingSounds.clear();
  }
  document.getElementById("quietCheckbox").checked = quiet;
  const button = document.getElementById("stageQuietBtn");
  button.textContent = quiet ? "Quiet mode on" : "Sound on";
  button.setAttribute("aria-pressed", String(quiet));
}

function routineRecord(name) {
  return {
    name: name || document.getElementById("routineNameInput").value.trim() || CATEGORIES[state.category].label,
    category: state.category, autoTotal: state.autoTotal, totalMinutes: state.totalMinutes,
    steps: state.steps.map(({ name, minutes, imageUrl, pictogramId, positions }) => ({ name, minutes, imageUrl, pictogramId, positions })),
    settings: {
      theme: state.theme, flexible: state.flexible, quiet: state.quiet, sounds: { ...state.sounds }, showClock: state.showClock,
      projFontScale: state.projFontScale, printFontScale: state.printFontScale,
      projIconScale: state.projIconScale, printIconScale: state.printIconScale, projTextColor: state.projTextColor,
    },
  };
}

// Import only known fields. Validate the complete file before changing the current routine.
function normalizeRoutine(record) {
  const fail = () => { throw new Error("Invalid routine file. Use a JSON file exported by Routine Visual Timer."); };
  if (!record || typeof record !== "object" || !Array.isArray(record.steps) || !record.steps.length || record.steps.length > 100) fail();
  if (!Object.hasOwn(CATEGORIES, record.category) || typeof record.autoTotal !== "boolean" || !Number.isFinite(record.totalMinutes) || record.totalMinutes <= 0 || record.totalMinutes > 10080) fail();
  if (typeof record.name !== "string" || !record.name.trim() || record.name.length > 200) fail();
  const steps = record.steps.map((step) => {
    if (!step || typeof step.name !== "string" || !step.name.trim() || step.name.length > 200 || !Number.isFinite(step.minutes) || step.minutes <= 0 || step.minutes > 1440) fail();
    let imageUrl = null;
    if (step.imageUrl) {
      try { const url = new URL(step.imageUrl); if (url.protocol !== "https:" || url.username || url.password) fail(); imageUrl = url.href; } catch { fail(); }
    }
    const positions = {};
    for (const mode of ["print", "projection"]) {
      if (!step.positions?.[mode]) continue;
      positions[mode] = {};
      for (const kind of ["icon", "label"]) {
        const offset = step.positions[mode][kind];
        if (!offset) continue;
        if (![offset.x, offset.y].every((n) => Number.isFinite(n) && Math.abs(n) <= 8)) fail();
        positions[mode][kind] = { x: offset.x, y: offset.y };
      }
    }
    return { name: step.name.trim(), minutes: step.minutes, imageUrl, pictogramId: Number.isInteger(step.pictogramId) ? step.pictogramId : null, positions };
  });
  if (steps.reduce((sum, step) => sum + step.minutes, 0) > 10080) fail();
  const input = record.settings || {};
  const settings = {
    theme: Object.hasOwn(THEMES, input.theme) ? input.theme : "classic",
    flexible: input.flexible === true, quiet: input.quiet !== false, showClock: input.showClock !== false,
    sounds: Object.fromEntries(["chime", "tick", "victory"].map((key) => [key, input.sounds?.[key] !== false])),
    projTextColor: /^#[0-9a-f]{6}$/i.test(input.projTextColor) ? input.projTextColor : "",
  };
  for (const key of ["projFontScale", "printFontScale", "projIconScale", "printIconScale"]) {
    const allowed = key.includes("Font") ? [0, 1, 1.3, 1.65, 2.05] : [1, 1.3, 1.65, 2.05];
    settings[key] = allowed.includes(input[key]) ? input[key] : 1.3;
  }
  return { name: record.name.trim(), category: record.category, autoTotal: record.autoTotal, totalMinutes: record.totalMinutes, steps, settings };
}

function openRoutine(record) {
  pauseTimer();
  Object.assign(state, record.settings || {}, { category: record.category, autoTotal: record.autoTotal, totalMinutes: record.totalMinutes });
  state.steps = record.steps.map((step) => ({ ...step, id: uid() }));
  document.getElementById("routineNameInput").value = record.name;
  document.getElementById("flexibleCheckbox").checked = state.flexible;
  document.getElementById("showClockCheckbox").checked = state.showClock;
  document.getElementById("fontColorInput").value = state.projTextColor || "#ffffff";
  Object.keys(state.sounds).forEach((key) => {
    document.getElementById(`sound${key[0].toUpperCase()}${key.slice(1)}`).checked = state.sounds[key];
  });
  setQuiet(state.quiet);
  syncAutoTotal();
  resetTimer();
  applyProjectionTextStyle();
  applyTheme(state.theme);
  renderCategoryTabs();
  renderSuggestionChips();
  renderBuilder();
  renderPrintScaleButtons();
  renderWheelForCurrentView();
}

async function usePreset(key, announce = true) {
  const preset = PRESETS[key];
  if (!preset) return;
  openRoutine({ ...preset, totalMinutes: 0, autoTotal: true, steps: preset.steps.map(([name, minutes]) => ({ name, minutes, imageUrl: null, pictogramId: null })) });
  if (announce) showSaveStatus(`Opened ${preset.name}. Customize the steps below.`);
  // Create all steps immediately. Late icon responses cannot repopulate a replaced routine.
  const steps = [...state.steps];
  await Promise.all(steps.map(async (step) => {
    const results = await ARASAAC.search(step.name);
    if (!state.steps.includes(step) || !results[0]) return;
    step.pictogramId = results[0]._id;
    step.imageUrl = ARASAAC.imageUrl(results[0]._id);
    const rowIndex = state.steps.indexOf(step);
    const thumb = document.querySelectorAll(".step-thumb")[rowIndex];
    if (thumb) thumb.innerHTML = `<img src="${escapeHTML(step.imageUrl)}" alt="">`;
    renderWheelForCurrentView();
  }));
}

function exportRoutine() {
  try {
    const record = normalizeRoutine(routineRecord());
    const payload = JSON.stringify({ format: "routine-visual-timer", version: 1, routine: record }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${record.name.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) || "routine"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showSaveStatus("Routine exported with its theme, settings, and icon positions.");
  } catch { showSaveStatus("Add at least one step with a positive duration before exporting."); }
}

async function importRoutine(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error("Choose a routine file smaller than 1 MB.");
    const payload = JSON.parse(await file.text());
    if (payload.format !== "routine-visual-timer" || payload.version !== 1) throw new Error("Unsupported routine file. Choose a version 1 export.");
    const record = normalizeRoutine(payload.routine);
    openRoutine(record);
    showSaveStatus(`Imported "${record.name}". Press Save to keep it in this browser.`);
  } catch (error) {
    showSaveStatus(error instanceof SyntaxError ? "This file is not valid JSON. Your routine was not changed." : error.message);
  } finally { event.target.value = ""; }
}

function renderPrintScaleButtons() {
  renderScaleButtonGroup("printFontScaleButtons", "Print text size", () => state.printFontScale, (v) => {
    state.printFontScale = v;
    renderPrintView();
  });
  renderScaleButtonGroup("printIconScaleButtons", "Print icon size", () => state.printIconScale, (v) => {
    state.printIconScale = v;
    renderPrintView();
  });
}

(async function init() {
  bindStaticControls();
  applyProjectionTextStyle();
  renderCategoryTabs();
  renderSuggestionChips();
  renderBuilder();
  renderSavedRoutinesSelect();
  renderPrintScaleButtons();
  applyTheme(state.theme);
  renderWheelForCurrentView();
  updateTimerButtons();
  await loadDefaultRoutine();
})();

// Measure the actual theme font; shrink only labels that exceed their slice arc.
function fitWheelLabels(holder) {
  holder.querySelectorAll("text[data-max-length]").forEach((text) => {
    const length = text.getComputedTextLength();
    const max = Number(text.dataset.maxLength);
    if (length > max) text.style.fontSize = `${parseFloat(text.style.fontSize) * max / length}px`;
  });
}

function bindWheelPositions(holder, mode) {
  const svg = holder.querySelector("svg");
  svg.querySelectorAll(".wheel-movable").forEach((item) => {
    const step = state.steps[Number(item.dataset.stepIndex)];
    const kind = item.dataset.kind;
    const saved = () => step.positions?.[mode]?.[kind] || { x: 0, y: 0 };
    const move = (x, y) => {
      // Keep the complete object inside the SVG canvas, including print edges.
      const box = item.getBBox();
      const view = svg.viewBox.baseVal;
      const pad = 0.04;
      x = Math.max(view.x + pad - box.x, Math.min(x, view.x + view.width - pad - box.x - box.width));
      y = Math.max(view.y + pad - box.y, Math.min(y, view.y + view.height - pad - box.y - box.height));
      step.positions ||= {};
      step.positions[mode] ||= {};
      step.positions[mode][kind] = { x, y };
      item.setAttribute("transform", `translate(${x} ${y})`);
    };
    item.onkeydown = (event) => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!delta) return;
      event.preventDefault();
      const pos = saved(), amount = event.shiftKey ? 0.15 : 0.03;
      move(pos.x + delta[0] * amount, pos.y + delta[1] * amount);
    };
    item.onpointerdown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      item.focus();
      const point = (e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      const origin = point(event), initial = { ...saved() };
      item.classList.add("is-dragging");
      item.setPointerCapture(event.pointerId);
      item.onpointermove = (e) => {
        const current = point(e);
        move(initial.x + current.x - origin.x, initial.y + current.y - origin.y);
      };
      const finish = () => {
        item.classList.remove("is-dragging");
        item.onpointermove = null;
      };
      item.onpointerup = finish;
      item.onpointercancel = finish;
      item.onlostpointercapture = finish;
    };
  });
}
