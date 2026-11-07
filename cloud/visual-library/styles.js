// Shared, pinned references: browser previews and server image inputs use the same files.
export const referenceCommit='92729bab5157d7ee8de060bcc69f3a2087803f73';
const base='https://raw.githubusercontent.com/appliedbhp/visual-supports/'+referenceCommit+'/';
export const toneChoices=['light','medium','dark'];
export const genderChoices=['male','female','nonbinary'];
export const styleSheets=[
 {id:'90s',name:'90s',asset:'catalog/references/90s-theme.png',description:'Bold, playful cartoon shapes and bright retro clothing.',instructions:'Match the energetic 90s cartoon ink, exaggerated expressive features, thick varied outlines, and colorful retro clothing of the selected figure.'},
 {id:'2000s',name:'2000s',asset:'catalog/references/field-guide-character-stylesheet.png',description:'Angular field-guide characters with textured ink and earthy colors.',instructions:'Match loose, slightly jittery hand-drawn outlines, varied ink weight, angular proportions, subtle paper grain within the artwork, and textured clothing folds. Use ochre, olive, dusty terracotta and slate blue with brighter accents. For outdoor settings, use quiet gouache and watercolor textures appropriate to the habitat.'},
 {id:'grunge',name:'Grunge',asset:'catalog/references/teen-comic-character-reference.png',description:'Scruffy comic portraits, brush lines, and expressive faces.',instructions:'Match scruffy comic ink: thick-to-thin black brush lines, wiry hair, expressive eyebrows, slightly uneven ivory teeth when visible, sparse hatching, and flat colors.'},
 {id:'anime-1',name:'Anime style 1',asset:'catalog/references/stylesheet_1.png',description:'Soft anime linework, natural expressions, and muted colors.',instructions:'Match the selected reference’s clean anime linework, soft restrained shading, natural facial proportions, hair silhouette, and muted clothing palette.'},
 {id:'anime-2',name:'Anime style 2',asset:'catalog/references/stylesheet_2.png',description:'Bold anime linework, strong shadows, and saturated colors.',instructions:'Match the selected reference’s bold anime ink, angular shapes, strong cel-shaded shadows, detailed hair, and saturated clothing colors.'},
 {id:'classic',name:'Classic',asset:'references/aac-character-reference-card.png',description:'Simple AAC characters across young-child, child, and teen ages.',instructions:'Match the Classic AAC reference: bold rounded outlines, flat fills, expressive faces, primary blue #1769AA and accent orange #F28C28. Use the selected age proportions. Do not reproduce reference-card text, panels, or the homework example.',classic:true}
].map(s=>({...s,url:base+s.asset,referenceId:'abhp-'+s.id+'-'+referenceCommit.slice(0,12)}));
styleSheets.push({id:'my-character',name:'My Character',description:'Use the character saved on this device.',personal:true,url:''});
export function sheetFor(id){const sheet=styleSheets.find(s=>s.id===id);if(!sheet)throw Error('Choose a listed character stylesheet.');return sheet;}
export function gridPosition(style,tone,gender,age='12-18'){
 const sheet=sheetFor(style);
 if(sheet.personal)return 'saved-character';
 if(!toneChoices.includes(tone)||!genderChoices.includes(gender))throw Error('Choose a skin tone and gender.');
 if(sheet.classic){
  if(gender==='nonbinary')return 'style-only';
  return (gender==='male'?'top':'bottom')+'-'+(age==='0-5'?'left':age==='6-11'?'center':'right');
 }
 return ['top','middle','bottom'][toneChoices.indexOf(tone)]+'-'+['left','center','right'][genderChoices.indexOf(gender)];
}
export function cleanSelection(input){
 const sheet=sheetFor(input.reference_style);
 const tone=input.skin_tone,gender=input.gender_variant,age=input.age_strand;
 if(!['0-5','6-11','12-18','13+','13-18'].includes(age))throw Error('Choose a supported character age.');
 const position=gridPosition(sheet.id,tone,gender,age);
 if(input.grid_position&&input.grid_position!==position)throw Error('Grid position must match the selected character.');
 const background=input.background_mode||'transparent';
 if(!['transparent','setting'].includes(background))throw Error('Choose transparent background or a setting.');
 const setting=typeof input.setting==='string'?input.setting.trim():'';
 if(setting.length>1000||(background==='setting'&&!setting))throw Error('Describe the setting (up to 1,000 characters).');
 return {reference_style:sheet.id,...(!sheet.personal?{skin_tone:tone,gender_variant:gender}:{}),grid_position:position,age_strand:age,background_mode:background,setting:background==='setting'?setting:''};
}
export function referenceFor(id){const sheet=sheetFor(id);return {id:sheet.referenceId,style:sheet.name,asset:sheet.asset,source:sheet.url,repository_commit:referenceCommit,attribution:'Character stylesheet by Ryan Baker-Barrett of Applied Behavioral Health Practice · CC BY-SA 4.0 · https://getadhd.care · https://appliedbehavioral.health.'+(sheet.classic?' Classic reference adapted from Adventurer by Lisa Wischofsky / DiceBear · CC BY 4.0.':'')};}
export function selectionInstructions(input){
 const s=cleanSelection(input),sheet=sheetFor(s.reference_style);
 if(sheet.personal)return 'Use the attached single saved character as the identity and style reference. Preserve its recognizable face, skin tone, hair, outfit, and accessories. Adapt pose, gaze, and expression to the requested action for ages '+s.age_strand+'. Show one character with natural hand grips and essential props. '+(s.background_mode==='transparent'?'Keep the background genuinely transparent.':'Render an opaque scene in this setting: '+s.setting+'. Keep the background quieter than the character.')+' No captions, logos, or watermarks. ';
 const identity=sheet.classic?(s.gender_variant==='nonbinary'?'Use the attached card as a style and age-proportion reference only; create one nonbinary character. Do not claim a specific nonbinary portrait exists on this card.':'Use the '+s.grid_position.replace('-',' ')+' figure in the LEFT six-character area of the Classic card. Columns are age 5, age 10, teen; rows are boy, girl. Ignore the separate homework example on the far right.')+' Adapt the skin tone to '+s.skin_tone+'.': 'Use ONLY the '+s.grid_position.replace('-',' ')+' character in the attached 3 by 3 stylesheet: '+s.skin_tone+' skin-tone row, '+s.gender_variant+' column. Do not blend figures.';
 return identity+' Keep the character recognizable through skin tone, hair silhouette and texture, facial proportions, distinguishing features, and outfit unless explicitly overridden. '+sheet.instructions+' Show one age-appropriate '+s.gender_variant+' character for ages '+s.age_strand+', with expressive facial features. Change pose, gaze, and expression to fit the action. Use natural hand grips, connected limbs, and clear contact with essential props. '+(s.background_mode==='transparent'?'Leave the space around the figure and essential props genuinely transparent.':'Setting: '+s.setting+'. Render a complete opaque scene, keeping the background quieter than the figure.')+' Compose one readable square illustration with generous margins. No captions, lettering, logos, watermarks, grid lines, or multiple panels. The reference activity is not the requested action. ';
}
