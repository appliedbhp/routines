(() => {
 const ns='http://www.w3.org/2000/svg';
 const el=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
 const wrap=(node,cls)=>{const g=el('g',{class:cls});node.before(g);g.append(node);return g;};
 window.NotionistMotion={preview(state,svg){
  const host=document.getElementById('notionistPreview');host.replaceChildren();host.hidden=state.style!=='notionists';if(host.hidden)return;
  const image=new DOMParser().parseFromString(svg,'image/svg+xml').documentElement;
  // Isolate local SVG references from every other inline character.
  for(const n of image.querySelectorAll('[id]')){const old=n.id;n.id='notionist-'+old;for(const e of image.querySelectorAll('*'))for(const a of [...e.attributes])if(a.value.includes('url(#'+old+')'))e.setAttribute(a.name,a.value.replaceAll('url(#'+old+')','url(#notionist-'+old+')'));}
  const body=image.querySelector('g[mask]');if(!body)return;
  const layers=[...body.children].filter(n=>n.tagName==='g');
  const portrait=el('g',{id:'notionist-portrait'});body.append(portrait);portrait.append(...layers);
  const head=el('g',{class:'notionist-sway'});portrait.append(head);
  for(const layer of layers)if(!['translate(531 487)','translate(178 1057)','translate(0 559)'].includes(layer.getAttribute('transform')))head.append(layer);
  const base=layers.find(n=>n.getAttribute('transform')==='translate(531 487)');if(base)wrap(base,'notionist-sway');
  const eyes=layers.find(n=>n.getAttribute('transform')==='translate(610 680)');
  if(eyes){const g=wrap(eyes,'notionist-blink');g.style.transformOrigin='850px 770px';}
  const brows=layers.find(n=>n.getAttribute('transform')==='translate(774 657)');if(brows)wrap(brows,'notionist-brows');
  const shirt=layers.find(n=>n.getAttribute('transform')==='translate(178 1057)');if(shirt)wrap(shirt,'notionist-breathe');
  const defs=el('defs'),filter=el('filter',{id:'notionist-shadow',x:'-30%',y:'-30%',width:'160%',height:'160%','color-interpolation-filters':'sRGB'});
  filter.append(el('feGaussianBlur',{stdDeviation:34}),el('feFlood',{'flood-color':'#152b40'}),el('feComposite',{in2:'SourceAlpha',operator:'in'}));
  // Blur the silhouette, rather than the colored artwork.
  filter.replaceChildren(el('feFlood',{'flood-color':'#152b40'}),el('feComposite',{in2:'SourceAlpha',operator:'in'}),el('feGaussianBlur',{stdDeviation:34}));defs.append(filter);image.prepend(defs);
  const shadow=el('use',{href:'#notionist-portrait',transform:'translate(65 45)',opacity:'.32',filter:'url(#notionist-shadow)'});portrait.before(shadow);
  image.setAttribute('role','img');image.setAttribute('aria-label','Your animated Notionist character');host.append(image);document.getElementById('avatarImage').hidden=true;
 }};
})();
