(() => {

'use strict';
const get = id => document.getElementById('micah-'+id);
const synth = window.speechSynthesis;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let rig = null;
let frameRequest = 0;
let outline, clip, jaw, shadow, shoulders, head, speechMouth, laughMouth;
let bothTeeth, upperTeeth, tongue, leftBrow, rightBrow, eyes;
let restingJaw, eyeCenter;
let laughStart = null;
const laughDuration = 1450;
const jawArc = 'A75.72 75.72 0 0 1 34.93 187.7';

// Half-width, top arch, bottom opening, upper teeth, both rows, tongue.
const poses = {
  rest: [29,-1,3,0,0,0], closed: [25,0,1.3,0,0,0],
  wide: [33,7,15,.8,0,0], open: [27,9,31,.27,0,.78],
  round: [15,13,24,0,0,.24], bite: [26,8,5,1,0,0],
  clench: [31,8,10,0,1,0], soft: [24,5,15,0,0,.17],
  tongue: [25,6,18,.4,0,.82]
};
const common = {
  'a':['open'], 'i':['open','wide'], 'the':['tongue','soft'], 'you':['round'],
  'your':['round','soft'], 'to':['soft','round'], 'one':['round','open','soft'],
  'two':['soft','round'], 'of':['soft','bite'], 'have':['soft','open','bite'],
  'hello':['soft','wide','tongue','round'], 'said':['wide','soft'],
  'are':['open','soft'], 'we':['round','wide'], 'me':['closed','wide'],
  'my':['closed','open','wide'], 'speech':['clench','closed','wide','soft'], 'is':['wide','clench'],
  'was':['round','soft','clench'], 'his':['soft','wide','clench']
};
function sounds(word) {
  const clean = word.toLowerCase().replace(/[’']/g, '');
  if (Object.hasOwn(common, clean)) return common[clean];
  const chunks = clean.replace(/([b-df-hj-np-tv-z])e$/, '$1')
    .match(/tion|tch|th|ch|sh|ph|ss|zz|oo|ou|ow|oa|ee|ea|ai|ay|[a-z0-9]/g) || [];
  return chunks.map(chunk => {
    if (/^[bmp]$/.test(chunk)) return 'closed';
    if (/^(f|v|ph)$/.test(chunk)) return 'bite';
    if (/^(s|z|ss|zz)$/.test(chunk)) return 'clench';
    if (/^(th|l)$/.test(chunk)) return 'tongue';
    if (/^(oo|ou|ow|oa|[ouw])$/.test(chunk)) return 'round';
    if (/^(ee|ea|ai|ay|[eiy])$/.test(chunk)) return 'wide';
    if (chunk === 'a') return 'open';
    return 'soft';
  }).filter((pose, index, all) => pose !== all[index-1]);
}

function score(text) {
  let time = 0;
  const cues = [];
  const words = [];
  for (const token of text.matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}]+)*|[.,!?;:…—]/gu)) {
    if (/^[.,!?;:…—]$/.test(token[0])) {
      cues.push({ time, pose: 'rest' });
      time += /[.!?…]/.test(token[0]) ? 260 : 135;
      continue;
    }
    const sequence = sounds(token[0]);
    if (!sequence.length) sequence.push('soft');
    const word = {index:token.index, end:token.index+token[0].length, time};
    words.push(word);
    const weights = sequence.map(pose => ['open','round','wide'].includes(pose) ? 1.45 : .83);
    const duration = Math.min(780, 130 + sequence.length * 39 + token[0].length * 12);
    const unit = duration / weights.reduce((sum, weight) => sum + weight, 0);
    sequence.forEach((pose, index) => {
      cues.push({time, pose});
      time += weights[index] * unit;
    });
    word.finish = time;
  }
  cues.push({time, pose:'rest'});
  return {cues, words, gestures: expressionCues(text, words)};
}

// Left and right brow lift, inward tilt, eye openness change, smile change.
const expressions = {
  question: [7,2,-3,.08,0],
  exclaim: [7,7,0,.19,1.5],
  angry: [-3,-3,16,-.32,-9],
  frustrated: [-2,1,10,-.22,-6],
  happy: [3.5,3.5,-2,-.1,4],
  sad: [-1,-1,-14,-.15,-7],
  surprised: [9,8,-2,.26,0]
};
const emotionWords = {
  angry:'angry', mad:'angry', furious:'angry', livid:'angry',
  frustrated:'frustrated', annoyed:'frustrated', irritated:'frustrated', exasperated:'frustrated',
  happy:'happy', glad:'happy', excited:'happy', delighted:'happy', thrilled:'happy',
  sad:'sad', upset:'sad', disappointed:'sad', heartbroken:'sad',
  surprised:'surprised', shocked:'surprised', amazed:'surprised', wow:'surprised'
};

function expressionCues(text, words) {
  const events = [];
  words.forEach((word, index) => {
    const token = text.slice(word.index, word.end).toLowerCase();
    const previous = words[index-1];
    const before = previous ? text.slice(previous.index, word.index).toLowerCase().trim() : '';
    const emotion = Object.hasOwn(emotionWords,token) ? emotionWords[token] : null;
    if (emotion && !/^(?:not|never|no|\p{L}+n['’]t)$/u.test(before)) {
      events.push({type:emotion, start:word.time-65, hold:word.finish+110, end:word.finish+420});
    }
    const tail = text.slice(word.end, words[index+1]?.index ?? text.length);
    const mark = tail.match(/[!?]+/)?.[0];
    if (mark) {
      const type = mark.includes('?') ? 'question' : 'exclaim';
      events.push({type, start:Math.max(word.time-160,word.finish-450),
        hold:word.finish+55, end:word.finish+310});
    }
  });
  return events;
}

function expressionAt(events, time) {
  const face = [0,0,0,0,0];
  for (const {type,start,hold,end} of events) {
    if (time <= start || time >= end) continue;
    const t = Math.min(1, (time-start)/100, (end-time)/(end-hold));
    const amount = t*t*(3-2*t);
    expressions[type].forEach((value,i) => { face[i] += value*amount; });
  }
  return face;
}

function paint(values, smileAmount, chuckle = 0) {
  const [w, upper, lower, upperRow, bothRows, tip] = values;
  // Two cubic segments follow the original jaw arc, with the cheeks held in place.
  const drop = Math.max(0, Math.min(4.8, Math.max((lower-3)*.18, chuckle*4.8)));
  jaw.setAttribute('d', drop < .025 ? restingJaw : restingJaw.replace(jawArc,
    `C191.067 192.746 166.021 ${232.751+drop} 125.873 ${242.367+drop} C85.725 ${251.984+drop} 45.273 227.667 34.93 187.7`));
  const d = `M${-w} 0 C${-w*.6} ${-upper} ${w*.58} ${-upper} ${w} -1 C${w*.72} ${lower*.82} ${-w*.48} ${lower} ${-w} 0Z`;
  outline.setAttribute('d',d);
  clip.setAttribute('d',d);
  upperTeeth.style.opacity = upperRow * (1-smileAmount);
  bothTeeth.style.opacity = bothRows * (1-smileAmount);
  const width = w / 33;
  upperTeeth.setAttribute('transform', `translate(0 ${1.4-upper*.12}) rotate(4) scale(${width} .9)`);
  bothTeeth.setAttribute('transform', `translate(0 1.5) rotate(4) scale(${width} .55)`);
  tongue.style.opacity = tip * (1-smileAmount);
  tongue.setAttribute('cy', lower*.68+3);
  const isTalking = active?.started || (!audio.paused && !audio.ended);
  const strength = isTalking ? (1-smileAmount) : 0;
  rig.restMouth.setAttribute('opacity', (1-strength)*(1-chuckle));
  speechMouth.setAttribute('opacity', (isTalking ? 1 : 0)*(1-chuckle));
  outline.style.opacity = strength;
  laughMouth.setAttribute('opacity', chuckle);
  const scale = .78+.22*chuckle;
  laughMouth.setAttribute('transform', `translate(0 ${(1-scale)*204}) scale(1 ${scale})`);
  return drop;
}

let active = null;
let elevenTrack = null;
const audio = get('eleven-audio');
let audioURL;
const elevenStatus = get('eleven-status');

function alignedTrack(alignment) {
  const {characters, character_start_times_seconds: starts, character_end_times_seconds: ends} = alignment || {};
  if (![characters, starts, ends].every(Array.isArray) || !characters.length ||
      characters.length !== starts.length || starts.length !== ends.length ||
      !characters.every(c => typeof c === 'string' && c.length) ||
      !starts.every((start, i) => Number.isFinite(start) && start >= 0 &&
        Number.isFinite(ends[i]) && ends[i] >= start && (!i || starts[i-1] <= start))) {
    throw new Error('This file needs valid ElevenLabs character timing.');
  }
  const text = characters.join('');
  const offsets = [];
  characters.forEach((c,i) => {
    for (let j=0; j<c.length; j++) offsets.push(i);
  });
  const cues = [];
  const words = [];
  for (const match of text.matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}]+)*/gu)) {
    const start = starts[offsets[match.index]] * 1000;
    const end = ends[offsets[match.index + match[0].length - 1]] * 1000;
    words.push({index:match.index, end:match.index+match[0].length, time:start, finish:end});
    const local = score(match[0]).cues;
    const duration = local.at(-1).time;
    local.slice(0,-1).forEach(cue => {
      cues.push({time:start + (end-start) * cue.time/duration, pose:cue.pose});
    });
    cues.push({time:end,pose:'rest'});
  }
  if (!cues.length) throw new Error('No spoken words were found in the timing data.');
  return {cues:cues.sort((a,b) => a.time-b.time), gestures:expressionCues(text, words)};
}

get('eleven-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  audio.hidden = true;
  elevenTrack = null;
  if (audioURL) URL.revokeObjectURL(audioURL);
  audioURL = undefined;
  try {
    const payload = JSON.parse(await file.text());
    if (event.target.files[0] !== file) return;
    const track = alignedTrack(payload.normalized_alignment || payload.alignment);
    if (typeof payload.audio_base64 !== 'string' || !payload.audio_base64) {
      throw new Error('The response file is missing its audio.');
    }
    const decoded = Uint8Array.from(atob(payload.audio_base64), c => c.charCodeAt(0));
    audioURL = URL.createObjectURL(new Blob([decoded]));
    audio.src = audioURL;
    elevenTrack = track;
    audio.hidden = false;
    elevenStatus.textContent = 'Loaded. Press play to animate the avatar.';
  } catch (error) {
    if (event.target.files[0] === file) elevenStatus.textContent = error.message;
  }
});
audio.addEventListener('play', () => {
  if (laughStart !== null) status('Ready.');
  laughStart = null;
  if (active) {
    finish(active,'Ready.');
    synth.cancel();
  }
});
audio.addEventListener('error', () => {
  if (audio.getAttribute('src')) elevenStatus.textContent = 'This browser could not play the audio. Try an MP3 response.';
});
let values = [...poses.rest], smileAmount = 1, lastFrame = 0;
let nextBlink = performance.now() + 2600;
let face = [0,0,0,0,0];
const sayButton = get('speak'), stopButton = get('stop'), voiceSelect = get('voice');
const status = message => get('status').textContent = message;
function animate(now) {
  if (!rig) return;
  const delta = Math.min(50, now - lastFrame);
  lastFrame = now;
  let pose = 'rest', time = 0, gestures = [];
  if (!audio.paused && !audio.ended && elevenTrack) {
    time = audio.currentTime*1000;
    gestures = elevenTrack.gestures;
    pose = elevenTrack.cues.findLast(cue => cue.time <= time + 24)?.pose || 'rest';
  } else if (active?.started) {
    time = now - active.anchor + active.offset;
    gestures = active.track.gestures;
    const cues = active.track.cues;
    while (active.cursor + 1 < cues.length && cues[active.cursor+1].time <= time + 24) active.cursor++;
    pose = cues[active.cursor]?.pose || 'rest';
  }
  const amount = 1 - Math.exp(-delta / (pose === 'closed' || pose === 'clench' ? 13 : 23));
  values = values.map((value,i) => value + (poses[pose][i] - value) * amount);
  smileAmount += ((pose === 'rest' ? 1 : 0) - smileAmount) * amount;
  let chuckle = 0, bounce = 0;
  if (laughStart !== null) {
    const progress = Math.max(0,(now-laughStart)/laughDuration);
    if (progress >= 1) {
      laughStart = null;
      status('Ready.');
    } else {
      const envelope = Math.min(1, progress*9, (1-progress)*5);
      const pulse = Math.sin(progress*3*Math.PI)**2;
      chuckle = envelope*(.64+.36*pulse);
      bounce = envelope*pulse;
    }
  }
  const jawDrop = paint(values, smileAmount, chuckle);
  const target = expressionAt(gestures,time);
  target[0] += chuckle*3;
  target[1] += chuckle*3;
  target[3] -= chuckle*.55;
  const motion = reduceMotion.matches ? 0 : 1;
  const sway = motion*(1.25*Math.sin(now/830)+2*bounce);
  const breath = motion*(.5-.5*Math.cos(now/690))*(1-.7*chuckle);
  const headRise = breath*.75;
  head.setAttribute('transform', `translate(0 ${-headRise}) rotate(${sway} 172 262)`);
  // The shadow uses the same pivot, expressed in the neck's local coordinates.
  shadow.setAttribute('transform', `translate(0 ${jawDrop*.72-headRise}) rotate(${sway} 92 239)`);
  shoulders.setAttribute('transform', `translate(0 360) scale(1 ${1+.032*breath}) translate(0 -360)`);
  target[0] += pose === 'open' ? 1.4 : 0;
  target[1] += pose === 'open' ? 1.4 : 0;
  const blend = 1 - Math.exp(-delta / 55);
  face = face.map((value,i) => value+(target[i]*motion-value)*blend);
  const [left,right,tilt,eye] = face;
  leftBrow.setAttribute('transform', `translate(0 ${-left}) rotate(${tilt} 35 29)`);
  rightBrow.setAttribute('transform', `translate(0 ${-right}) rotate(${-tilt} 112 12)`);

  if (now > nextBlink + 150) nextBlink = now + 2300 + Math.random() * 1700;
  const blink = !motion || now < nextBlink ? 1 : 1-.94*Math.sin(Math.PI*(now-nextBlink)/150)**2;
  const eyeScale = blink*Math.max(.6, Math.min(1.3, 1+eye));
  eyes.setAttribute('transform', `translate(0 ${eyeCenter*(1-eyeScale)}) scale(1 ${eyeScale})`);
  frameRequest = requestAnimationFrame(animate);
}


function finish(run, message) {
  if (run !== active) return;
  clearTimeout(run.startTimer);
  active = null;
  sayButton.disabled = false;
  stopButton.disabled = true;
  status(message);
}

get('laugh').addEventListener('click', () => {
  if (active) {
    finish(active,'Ready.');
    synth.cancel();
  }
  audio.pause();
  laughStart = performance.now();
  status('Laughing…');
});

function refreshVoices() {
  const old = voiceSelect.value;
  const voices = synth.getVoices().filter(voice => /^en(?:-|_|$)/i.test(voice.lang));
  voices.sort((a,b) => Number(b.localService)-Number(a.localService) || Number(b.default)-Number(a.default));
  voiceSelect.replaceChildren(new Option('Browser default',''));
  voices.forEach(voice => voiceSelect.add(new Option(
    `${voice.name} (${voice.lang}${voice.localService ? '' : ', online'})`,voice.voiceURI)));
  const selection = voices.find(voice => voice.voiceURI === old) || voices.find(voice => voice.localService) || voices[0];
  voiceSelect.value = selection?.voiceURI || '';
}

if (synth && 'SpeechSynthesisUtterance' in window) {
  refreshVoices();
  synth.addEventListener('voiceschanged',refreshVoices);
  get('controls').addEventListener('submit', event => {
    event.preventDefault();
    if (active) return;
    const text = get('line').value.trim();
    if (!text) { status('Type a line first.'); return; }
    audio.pause();
    laughStart = null;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = synth.getVoices().find(voice => voice.voiceURI === voiceSelect.value);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = .96;
    const run = {utterance, track: score(text), cursor:0, offset:0, lastWord:-1, started:false};
    active = run;
    sayButton.disabled = true;
    stopButton.disabled = false;
    status('Starting voice…');
    utterance.onstart = () => {
      if (active !== run) return;
      clearTimeout(run.startTimer);
      run.anchor = performance.now();
      run.started = true;
      status('Speaking…');
    };
    utterance.onboundary = event => {
      if (active !== run || !run.started || (event.name && event.name !== 'word')) return;
      const wordIndex = run.track.words.findIndex(word => event.charIndex >= word.index && event.charIndex < word.end);
      if (wordIndex <= run.lastWord) return;
      run.lastWord = wordIndex;
      run.offset = run.track.words[wordIndex].time;
      run.anchor = performance.now();
      run.cursor = Math.max(0, run.track.cues.findIndex(cue => cue.time >= run.offset));
    };
    utterance.onend = () => finish(run,'Ready.');
    utterance.onerror = () => finish(run,'The voice could not play. Try another voice or browser.');
    run.startTimer = setTimeout(() => {
      finish(run,'The voice did not start. Try another voice or browser.');
      synth.cancel();
    },8000);
    synth.speak(utterance);
  });
  stopButton.addEventListener('click',() => {
    if (!active) return;
    finish(active,'Stopped.');
    synth.cancel();
  });
  window.addEventListener('pagehide',() => { if (active) synth.cancel(); });
} else {
  sayButton.disabled = true;
  status('Speech is unavailable in this browser. Try opening the file in Safari or Chrome.');
}

const mouthArtwork = `<g transform="translate(200 208) rotate(-8)">
<defs>
<clipPath id="mouth-clip"><path id="clip-outline"/></clipPath>
<clipPath id="upper-row"><rect x="-2" y="10" width="62" height="16"/></clipPath>
<path id="source-teeth" d="m-.25 17.97 1.6 6.07a6 6 0 0 0 6.22 4.46 6 6 0 0 0-5.54 5.28l-.74 6.23c7.28-1.52 19.34-3.83 28.3-4.46 8.98-.63 21.24-.02 28.66.48l-1.6-6.07a6 6 0 0 0-6.21-4.46 6 6 0 0 0 5.54-5.28l.73-6.24c-7.27 1.53-19.33 3.84-28.3 4.47-8.97.62-21.23.01-28.65-.48Z" fill="#fff"/>
</defs>
<path id="mouth-outline" fill="#171110" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<g clip-path="url(#mouth-clip)">
<g id="both-teeth"><use href="#source-teeth" transform="translate(-29 -27)"/></g>
<g id="upper-teeth"><g transform="translate(-29 -27)" clip-path="url(#upper-row)"><use href="#source-teeth"/></g></g>
<ellipse id="tongue" cy="16" rx="17" ry="8" fill="#fc909f"/>
</g>

</g>`;
const ns = 'http://www.w3.org/2000/svg';
const parser = new DOMParser();
const parse = svg => parser.parseFromString(svg, 'image/svg+xml').documentElement;
function element(name, attributes = {}) {
  const node = document.createElementNS(ns,name);
  for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,value);
  return node;
}
function wrap(nodes) {
  const group = element('g');
  nodes[0].before(group);
  group.append(...nodes);
  return group;
}
const translated = (root,x,y) => root.querySelector(`g[transform="translate(${x} ${y})"]`);
function buildRig(svg, state) {
  const image = parse(svg);
  const body = image.querySelector('g[mask="url(#viewboxMask)"]');
  const faceBase = translated(image,80,23);
  const mouth = translated(image,170,183);
  const brows = translated(image,110,102);
  const eyeArt = translated(image,142,119);
  const shirt = translated(image,53,272);
  if (!body || !faceBase || !mouth || !brows || !eyeArt || !shirt) return null;
  const [neck,castShadow,chin,...features] = [...faceBase.children];
  if (!neck || !castShadow || !chin) return null;

  // The preview is the sole inline avatar. Keep its SVG IDs isolated from other tools.
  body.setAttribute('mask','url(#micah-viewbox)');
  image.querySelector('#viewboxMask').id = 'micah-viewbox';
  const clipNeck = element('clipPath',{id:'micah-neck'});
  clipNeck.append(element('path',{d:neck.getAttribute('d')}));
  faceBase.prepend(clipNeck);
  const shadowClip = wrap([castShadow]);
  shadowClip.setAttribute('clip-path','url(#micah-neck)');
  const neckShadow = wrap([castShadow]);

  const face = element('g',{transform:'translate(80 23)'});
  face.append(chin,...features);
  const layers = [...body.children];
  const headParts = layers.slice(layers.indexOf(faceBase)+1,layers.indexOf(shirt));
  const movingHead = wrap(headParts);
  movingHead.prepend(face);
  const movingShirt = wrap([shirt]);
  const blink = wrap([eyeArt]);

  const speaking = parse(`<svg xmlns="${ns}">${mouthArtwork}</svg>`).firstElementChild;
  const laughing = translated(parse(CharacterRenderer.render({...state,mouth:'laughing'})),170,183);
  if (!laughing) return null;
  const speakingLayer = element('g',{opacity:0});
  speakingLayer.append(speaking);
  const laughLayer = element('g',{opacity:0});
  laughLayer.append(laughing);
  mouth.after(speakingLayer,laughLayer);

  const browArt = [...brows.children];
  const browsBySide = [0,1].map(side => {
    const id = `micah-brow-clip-${side}`;
    const clip = element('clipPath',{id});
    clip.append(element('rect',{x:side ? 77 : -80,y:-80,width:157,height:240}));
    const clipped = element('g',{'clip-path':`url(#${id})`});
    clipped.append(...browArt.map(node => node.cloneNode(true)));
    const animated = element('g');
    animated.append(clipped);
    brows.append(clip,animated);
    return animated;
  });
  browArt.forEach(node => node.remove());
  image.setAttribute('role','img');
  image.setAttribute('aria-label','Your Micah character');
  return {image, head:movingHead, shoulders:movingShirt, shadow:neckShadow,
    jaw:chin, restMouth:mouth, speechMouth:speakingLayer, laughMouth:laughLayer,
    leftBrow:browsBySide[0], rightBrow:browsBySide[1], eyes:blink,
    outline:speaking.querySelector('#mouth-outline'), clip:speaking.querySelector('#clip-outline'),
    bothTeeth:speaking.querySelector('#both-teeth'), upperTeeth:speaking.querySelector('#upper-teeth'),
    tongue:speaking.querySelector('#tongue')};
}

window.MicahMotion = {
  preview(state,svg) {
    const host = document.getElementById('micahPreview');
    const panel = document.getElementById('micahMotion');
    const image = document.getElementById('avatarImage');
    const next = state.style === 'micah' ? buildRig(svg,state) : null;
    if (!next) {
      if (active) {
        finish(active,'');
        synth.cancel();
      }
      audio.pause();
      laughStart = null;
      cancelAnimationFrame(frameRequest);
      rig = null;
      host.replaceChildren();
    } else {
      const wasRunning = Boolean(rig);
      rig = next;
      ({outline,clip,jaw,shadow,shoulders,head,speechMouth,laughMouth,
        bothTeeth,upperTeeth,tongue,leftBrow,rightBrow,eyes} = next);
      restingJaw = jaw.getAttribute('d');
      host.replaceChildren(next.image);
      host.hidden = false;
      const box = eyes.getBBox();
      eyeCenter = box.y + box.height/2;
      paint(values,smileAmount);
      if (!wasRunning) frameRequest = requestAnimationFrame(animate);
    }
    host.hidden = panel.hidden = !next;
    image.hidden = Boolean(next);
  }
};
})();
