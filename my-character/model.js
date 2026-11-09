(function(root){
 const defaults={style:'adventurer',seed:'KaelenVane',hair:'short04',isOmbre:true,hairColor:'592454',hairTipColor:'85c2c6',skinColor:'ecad80',eyes:'variant02',eyebrows:'variant04',mouth:'variant02',glassesEnabled:true,glasses:'variant05',backgroundColor:'1e1b4b'};
 function normalize(input={}){if(input.style&&input.style!=='adventurer'&&Object.hasOwn(root.CharacterRenderer.styles,input.style))return normalizeOther(input);const s={...defaults,outfit:Object.hasOwn(root.CharacterRenderer.outfits,input.outfit)?input.outfit:'none'},schema=root.CharacterRenderer.schema.properties;for(const key of ['hair','eyes','eyebrows','mouth','glasses'])if(schema[key].items.enum.includes(input[key]))s[key]=input[key];for(const key of ['hairColor','hairTipColor','skinColor','backgroundColor'])if(typeof input[key]==='string'&&(/^[0-9a-f]{6}$/i.test(input[key])||key==='backgroundColor'&&input[key]==='transparent'))s[key]=input[key];for(const key of ['isOmbre','glassesEnabled'])if(typeof input[key]==='boolean')s[key]=input[key];if(typeof input.seed==='string')s.seed=input.seed.trim().slice(0,60)||'Adventurer';s.backgroundGradient=['solid','blue-diagonal','blue-radial','blue-dawn'].includes(input.backgroundGradient)?input.backgroundGradient:'solid';return s;}
 function normalizeOther(input){
  const R=root.CharacterRenderer,style=input.style,s={style,seed:style==='micah'?R.micahRules.seed:'My character',backgroundColor:'transparent',glassesEnabled:false};
  for(const [key,d] of Object.entries(R.schemas[style].properties))if(d.type==='array'){
   const allowed=d.items.enum;
   if(allowed)s[key]=allowed.includes(input[key])?input[key]:d.default?.[0]||allowed[0];
   else if(/Color$/.test(key))s[key]=typeof input[key]==='string'&&/^[0-9a-f]{6}$/i.test(input[key])?input[key].toLowerCase():d.default?.[0];
  }
  if(typeof input.seed==='string')s.seed=input.seed.trim().slice(0,60)||s.seed;
  if(typeof input.backgroundColor==='string'&&(/^[0-9a-f]{6}$/i.test(input.backgroundColor)||input.backgroundColor==='transparent'))s.backgroundColor=input.backgroundColor;
  s.glassesEnabled=style!=='micah'&&input.glassesEnabled===true;
  if(style==='micah'){for(const key of ['mouth','baseColor','shirtColor'])s[key]=R.micahRules[key].includes(input[key])?input[key]:R.micahRules[key][0];const schema=R.schemas.micah.properties;s.eyes=schema.eyes.items.enum.includes(input.eyes)?input.eyes:'round';s.eyebrows=schema.eyebrows.items.enum.includes(input.eyebrows)?input.eyebrows:'up';}
  s.backgroundGradient=['solid','blue-diagonal','blue-radial','blue-dawn'].includes(input.backgroundGradient)?input.backgroundGradient:'solid';return s;
 }
 root.CharacterModel={defaults,normalize};
})(globalThis);
