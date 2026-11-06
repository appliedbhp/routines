(function(root){
 const defaults={seed:'KaelenVane',hair:'short04',isOmbre:true,hairColor:'592454',hairTipColor:'85c2c6',skinColor:'ecad80',eyes:'variant02',eyebrows:'variant04',mouth:'variant02',glassesEnabled:true,glasses:'variant05',backgroundColor:'1e1b4b'};
 function normalize(input={}){const s={...defaults},schema=root.CharacterRenderer.schema.properties;for(const key of ['hair','eyes','eyebrows','mouth','glasses'])if(schema[key].items.enum.includes(input[key]))s[key]=input[key];for(const key of ['hairColor','hairTipColor','skinColor','backgroundColor'])if(typeof input[key]==='string'&&(/^[0-9a-f]{6}$/i.test(input[key])||key==='backgroundColor'&&input[key]==='transparent'))s[key]=input[key];for(const key of ['isOmbre','glassesEnabled'])if(typeof input[key]==='boolean')s[key]=input[key];if(typeof input.seed==='string')s.seed=input.seed.trim().slice(0,60)||'Adventurer';return s;}
 root.CharacterModel={defaults,normalize};
})(globalThis);
