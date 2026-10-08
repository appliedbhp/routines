const TokenData = (() => {
 const fonts=['Nunito','Fredoka','Patrick Hand','system-ui','Quicksand','Space Grotesk','Silkscreen','Lora','Atkinson Hyperlegible','Lexend','Balsamiq Sans','Chewy','Comic Neue','Fascinate Inline','Flavors','Freckle Face','Ribeye Marrow','Sofadi One','Tenor Sans','Syne Mono'];
 const characterStyles=['bottts','planets','adventurer','big-smile','critters','clay','croodles','marbles','micah','pixel-art','voxel-art','voxel-bot'];
 const themes={
 classic:{confetti:["#3185fc", "#ffcd38", "#f064a1", "#64dca0"],name:'Classic',font:'Nunito',color:'#17283f',background:'#ffffff',accent:'#3185fc',soft:'#edf5ff'},
 ocean:{confetti:["#087f8c", "#38bdf8", "#67e8f9", "#f4d58d"],name:'Ocean',font:'Quicksand',color:'#124559',background:'#e9fbff',accent:'#087f8c',soft:'#c7eef2'},
 space:{confetti:["#c5a3ff", "#f9d76e", "#79d4ff", "#ff8ad8"],name:'Space',font:'Space Grotesk',color:'#f4edff',background:'#191c38',accent:'#c5a3ff',soft:'#303455'},
 garden:{confetti:["#a33d70", "#78a858", "#f2b544", "#ed8fb6"],name:'Garden',font:'Fredoka',color:'#254b35',background:'#f1f8e9',accent:'#a33d70',soft:'#e3eed8'},
 arcade:{confetti:["#77efba", "#ff5cac", "#ffe56d", "#61d9ff"],name:'Arcade',font:'Silkscreen',color:'#eafff3',background:'#172e2b',accent:'#77efba',soft:'#27453d'},
 boho:{confetti:["#d9745b", "#e5a93b", "#8a9a86", "#b89272"],name:'Boho',font:'Lora',color:'#4a3525',background:'#fbf1e7',accent:'#b8543c',soft:'#eee3cd'}
 };
 const sources={material:'Simple icons',openmoji:'Colorful emoji',arasaac:'Activity pictures',dicebear:'Characters',pixabots:'PixaBots'};
 const credits={pixabots:['PixaBots by Pablo Stanley','https://pixabots.com'],material:['Google Material Symbols · Apache 2.0','https://github.com/google/material-design-icons/blob/master/LICENSE'],openmoji:['OpenMoji · CC BY-SA 4.0','https://openmoji.org/about/'],arasaac:['Sergio Palao / ARASAAC · Government of Aragón · CC BY-NC-SA 4.0','https://arasaac.org/terms-of-use'],dicebear:['Bottts by Pablo Stanley · DiceBear · Free for personal and commercial use','https://www.dicebear.com/styles/bottts/']};
 function text(v){if(typeof v!=='string'||v.length>100)throw Error('Keep names and labels under 100 characters.');return v;}
 function icon(v){
  if(!v||!Object.hasOwn(sources,v.source))throw Error('Unknown picture source.');
  const id=v.id;
  if(typeof id!=='string'||!(/^[a-z0-9][a-z0-9-]{0,79}$/).test(id))throw Error('Invalid picture identifier.');
  if(v.source==='pixabots'&&!/^[a-z0-9]{4}$/.test(id))throw Error('Invalid PixaBot identifier.');
  if(v.source==='arasaac'&&!/^[1-9][0-9]{0,8}$/.test(id))throw Error('Invalid activity picture.');
  if(v.source==='dicebear'&&v.style!==undefined&&!characterStyles.includes(v.style))throw Error('Unknown character style.');
  return {source:v.source,id,label:text(v.label),...(v.source==='dicebear'&&v.style?{style:v.style}:{})};
 }
 function validate(p){
  if(!p||p.format!=='token-board'||p.version!==2||!p.board)throw Error('Choose a token-board file exported from this version of the site.');
  const b=p.board;
  if(!fonts.includes(b.font)||!/^#[0-9a-f]{6}$/i.test(b.color))throw Error('Invalid board appearance.');
  if(!Number.isInteger(b.extraSets)||b.extraSets<0||b.extraSets>3||typeof b.sound!=='boolean')throw Error('Invalid board options.');
  if(!Array.isArray(b.tokens)||b.tokens.length<1||b.tokens.length>12)throw Error('Choose between 1 and 12 tokens.');
  if(b.theme!==undefined&&!Object.hasOwn(themes,b.theme))throw Error('Unknown theme.');
  if(b.motion!==undefined&&typeof b.motion!=='boolean')throw Error('Invalid motion option.');
  return {theme:b.theme||'classic',motion:b.motion??true,type:'token-board',title:text(b.title),reward:text(b.reward),rewardIcon:icon(b.rewardIcon),font:b.font,color:b.color,extraSets:b.extraSets,sound:b.sound,tokens:b.tokens.map(t=>{if(!t||typeof t.earned!=='boolean')throw Error('Invalid token.');return {icon:icon(t.icon),earned:t.earned};})};
 }
 const serialize=board=>({format:'token-board',version:2,board:validate({format:'token-board',version:2,board})});
 const defaults=()=>({theme:'classic',motion:true,type:'token-board',title:'My token board',reward:'Choose a favorite activity',rewardIcon:{source:'material',id:'redeem',label:'Gift'},font:'Nunito',color:'#17283f',extraSets:1,sound:false,tokens:Array.from({length:5},()=>({icon:{source:'material',id:'star',label:'Star'},earned:false}))});
 function url(value,animated=false){const v=icon(value);if(v.source==='pixabots')return `https://pixabots.com/api/pixabot/${v.id}?size=256${animated?'&animated=true&webp=true':''}`;if(v.source==='dicebear')return TokenCharacters.url(v.id,v.style||'bottts',animated);if(v.source==='arasaac')return `https://static.arasaac.org/pictograms/${v.id}/${v.id}_300.png`;return `https://api.iconify.design/${v.source==='material'?'material-symbols':'openmoji'}/${v.id}.svg`;}
 return {fonts,themes,characterStyles,sources,credits,icon,validate,serialize,defaults,url};
})();
