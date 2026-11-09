const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c=vm.createContext({TextEncoder,TextDecoder});for(const file of ['renderer','model','presets'])vm.runInContext(fs.readFileSync('my-character/'+file+'.js','utf8'),c);
const M=c.CharacterModel,R=c.CharacterRenderer;
test('all supplied presets and selector options are supported by the pinned generator',()=>{for(const hero of c.CharacterPresets.heroes){const state=M.normalize(hero);for(const key of ['hair','eyes','eyebrows','mouth','glasses'])assert.equal(state[key],hero[key]);assert.match(R.render(state),/<svg/);}for(const key of ['hair','eyes','eyebrows','mouth','glasses'])for(const item of c.CharacterPresets.options[key])assert.ok(R.schema.properties[key].items.enum.includes(item.id));});
test('ombre is part of the exported SVG and changes hair only',()=>{const s=M.normalize({hair:'long05',skinColor:'ecad80',backgroundColor:'1e1b4b'}),svg=R.render(s);assert.match(svg,/<linearGradient id="abhp-hair-ombre"/);assert.match(svg,/fill="url\(#abhp-hair-ombre\)"/);assert.match(svg,/fill="#ecad80"/);assert.match(svg,/fill="#1e1b4b"/);assert.doesNotMatch(svg,/fill="#f1e2d3"/);assert.doesNotMatch(R.render({...s,isOmbre:false}),/abhp-hair-ombre/);assert.notEqual(svg,R.render({...s,hairTipColor:'ab2a18'}));});
test('glasses toggle and all five styles produce distinct SVGs',()=>{const s=M.normalize(),off=R.render({...s,glassesEnabled:false});const variants=c.CharacterPresets.options.glasses.map(g=>R.render({...s,glassesEnabled:true,glasses:g.id}));assert.equal(new Set(variants).size,5);for(const svg of variants)assert.notEqual(svg,off);});
test('shared character state round trips and rejects injected options',()=>{const state=M.normalize(c.CharacterPresets.heroes[2]);assert.deepEqual(M.normalize(JSON.parse(JSON.stringify(state))),state);const bad=M.normalize({hair:'bad',hairColor:'red"/><script>',skinColor:'url(evil)',backgroundColor:'http://bad',isOmbre:'true',seed:'x'.repeat(200)});assert.equal(bad.hair,M.defaults.hair);assert.equal(bad.hairColor,M.defaults.hairColor);assert.equal(bad.seed.length,60);});

test('new styles render locally and roundtrip without changing existing Adventurer characters',()=>{for(const style of ['micah','notionists','open-peeps']){const state=M.normalize({style});assert.equal(state.style,style);assert.match(R.render(state),/<svg/);assert.deepEqual(M.normalize(JSON.parse(JSON.stringify(state))),state);assert.match(R.credit(style),/DiceBear/);assert.equal(R.render(state),R.render(state));}});
test('Micah restrictions survive imported options and rendering without normalization',()=>{const bad={style:'micah',mouth:'frown',eyes:'eyesShadow',eyebrows:'down',baseColor:'ff0000',shirtColor:'ffffff',glassesEnabled:true,glassesProbability:100,earringsProbability:100,facialHairProbability:100};const state=M.normalize(bad);assert.equal(state.seed,'4zbqtmns');assert.equal(state.eyes,'eyesShadow');assert.equal(state.eyebrows,'down');assert.equal(M.normalize({style:'micah',eyes:'invalid',eyebrows:'invalid'}).eyes,'round');assert.equal(M.normalize({style:'micah',eyes:'invalid',eyebrows:'invalid'}).eyebrows,'up');assert.equal(state.glassesEnabled,false);for(const options of [R.optionsFor(state),R.optionsFor(bad)]){assert.deepEqual(Array.from(options.eyes),['eyesShadow']);assert.deepEqual(Array.from(options.eyebrows),['down']);for(const k of ['glassesProbability','earringsProbability','facialHairProbability'])assert.equal(options[k],0);for(const k of ['mouth','baseColor','shirtColor'])assert.ok(options[k].every(v=>R.micahRules[k].includes(v)));}});

test('Micah eye and eyebrow selections change the generated art and survive saving',()=>{
 const initial=M.normalize({style:'micah'});
 for(const key of ['eyes','eyebrows']) {
  const svg=R.render(initial);
  for(const value of R.schemas.micah.properties[key].items.enum) {
   const variant=M.normalize({...initial,[key]:value});
   assert.equal(M.normalize(JSON.parse(JSON.stringify(variant)))[key],value);
   if(value!==initial[key]) assert.notEqual(R.render(variant),svg);
  }
 }
});
