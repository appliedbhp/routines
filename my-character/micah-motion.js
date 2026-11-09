(() => {
'use strict';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const status = document.getElementById('micah-status');
const laughDuration = 1450;
const jawArc = 'A75.72 75.72 0 0 1 34.93 187.7';
let rig = null;
let frameRequest = 0;
let laughStart = null;
let nextBlink = performance.now() + 2600;

document.getElementById('micah-laugh').addEventListener('click', () => {
  laughStart = performance.now();
  status.textContent = 'Laughing…';
});

function animate(now) {
  if (!rig) return;
  const {head,shadow,shoulders,jaw,restingJaw,restMouth,laughMouth,brows,lids} = rig;
  let chuckle = 0, bounce = 0;
  if (laughStart !== null) {
    const progress = Math.max(0,(now-laughStart)/laughDuration);
    if (progress >= 1) {
      laughStart = null;
      status.textContent = '';
    } else {
      const envelope = Math.min(1, progress*9, (1-progress)*5);
      const pulse = Math.sin(progress*3*Math.PI)**2;
      chuckle = envelope*(.64+.36*pulse);
      bounce = envelope*pulse;
    }
  }
  const jawDrop = chuckle*4.8;
  jaw.setAttribute('d', jawDrop < .025 ? restingJaw : restingJaw.replace(jawArc,
    `C191.067 192.746 166.021 ${232.751+jawDrop} 125.873 ${242.367+jawDrop} C85.725 ${251.984+jawDrop} 45.273 227.667 34.93 187.7`));
  restMouth.setAttribute('opacity',1-chuckle);
  laughMouth.setAttribute('opacity',chuckle);
  const mouthScale = .78+.22*chuckle;
  laughMouth.setAttribute('transform', `translate(0 ${(1-mouthScale)*204}) scale(1 ${mouthScale})`);

  const motion = reduceMotion.matches ? 0 : 1;
  const sway = motion*(1.1*Math.sin(now/1200));
  head.setAttribute('transform', `rotate(${sway} 172 262)`);
  shadow.setAttribute('transform', `translate(0 ${jawDrop*.72}) rotate(${sway} 92 239)`);
  brows.setAttribute('transform', `translate(0 ${-chuckle*3*motion})`);
  if (now > nextBlink + 150) nextBlink = now + 2300 + Math.random()*1700;
  const blink = !motion || now < nextBlink ? 1 : 1-Math.sin(Math.PI*(now-nextBlink)/150)**2;
  const open = blink;
  for(const {rect,line,cx,cy,ry} of lids){
    rect.setAttribute('y',cy-ry*open);rect.setAttribute('height',2*ry*open);
    line.setAttribute('d',`M${cx-10} ${cy-ry*open} Q${cx} ${cy-ry*open+3} ${cx+10} ${cy-ry*open}`);
    line.setAttribute('opacity',1-open);
  }
  frameRequest = requestAnimationFrame(animate);
}

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
  const eyeClip=element('clipPath',{id:'micah-eyelids'}),lids=[];
  for(const [cx,cy] of [[16.5,29],[80.5,19]]){
    const ry=16,rect=element('rect',{x:cx-15,y:cy-ry,width:30,height:ry*2});eyeClip.append(rect);
    const line=element('path',{fill:'none',stroke:'#000','stroke-width':2,'stroke-linecap':'round',opacity:0});
    lids.push({rect,line,cx,cy,ry});
  }
  const eyeInk=element('g',{'clip-path':'url(#micah-eyelids)'});eyeInk.append(...eyeArt.children);eyeArt.append(eyeClip,eyeInk,...lids.map(l=>l.line));

  const laughing = translated(parse(CharacterRenderer.render({...state,mouth:'laughing'})),170,183);
  if (!laughing) return null;
  const laughLayer = element('g',{opacity:0});
  laughLayer.append(laughing);
  mouth.after(laughLayer);

  const movingBrows = wrap([...brows.children]);
  image.setAttribute('role','img');
  image.setAttribute('aria-label','Your Micah character');
  return {image, head:movingHead, shoulders:movingShirt, shadow:neckShadow,
    jaw:chin, restingJaw:chin.getAttribute('d'), restMouth:mouth,
    laughMouth:laughLayer, brows:movingBrows, lids};
}

window.MicahMotion = {
  preview(state,svg) {
    const host = document.getElementById('micahPreview');
    const panel = document.getElementById('micahMotion');
    const image = document.getElementById('avatarImage');
    const next = state.style === 'micah' ? buildRig(svg,state) : null;
    host.hidden = panel.hidden = !next;
    image.hidden = Boolean(next);
    if (!next) {
      cancelAnimationFrame(frameRequest);
      laughStart = null;
      status.textContent = '';
      rig = null;
      host.replaceChildren();
      return;
    }
    const wasRunning = Boolean(rig);
    rig = next;
    host.replaceChildren(next.image);
    if (!wasRunning) frameRequest = requestAnimationFrame(animate);
  }
};
})();
