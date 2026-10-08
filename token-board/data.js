const TokenData = (() => {
 const fonts=['Nunito','Fredoka','Patrick Hand','system-ui'];
 const sources={material:'Simple icons',openmoji:'Colorful emoji',arasaac:'Activity pictures',dicebear:'Characters'};
 const credits={material:['Google Material Symbols · Apache 2.0','https://github.com/google/material-design-icons/blob/master/LICENSE'],openmoji:['OpenMoji · CC BY-SA 4.0','https://openmoji.org/about/'],arasaac:['Sergio Palao / ARASAAC · Government of Aragón · CC BY-NC-SA 4.0','https://arasaac.org/terms-of-use'],dicebear:['Bottts by Pablo Stanley · DiceBear · Free for personal and commercial use','https://www.dicebear.com/styles/bottts/']};
 function text(v){if(typeof v!=='string'||v.length>100)throw Error('Keep names and labels under 100 characters.');return v;}
 function icon(v){
  if(!v||!Object.hasOwn(sources,v.source))throw Error('Unknown picture source.');
  const id=v.id;
  if(typeof id!=='string'||!(/^[a-z0-9][a-z0-9-]{0,79}$/).test(id))throw Error('Invalid picture identifier.');
  if(v.source==='arasaac'&&!/^[1-9][0-9]{0,8}$/.test(id))throw Error('Invalid activity picture.');
  return {source:v.source,id,label:text(v.label)};
 }
 function validate(p){
  if(!p||p.format!=='token-board'||p.version!==2||!p.board)throw Error('Choose a token-board file exported from this version of the site.');
  const b=p.board;
  if(!fonts.includes(b.font)||!/^#[0-9a-f]{6}$/i.test(b.color))throw Error('Invalid board appearance.');
  if(!Number.isInteger(b.extraSets)||b.extraSets<0||b.extraSets>3||typeof b.sound!=='boolean')throw Error('Invalid board options.');
  if(!Array.isArray(b.tokens)||b.tokens.length<1||b.tokens.length>12)throw Error('Choose between 1 and 12 tokens.');
  return {type:'token-board',title:text(b.title),reward:text(b.reward),rewardIcon:icon(b.rewardIcon),font:b.font,color:b.color,extraSets:b.extraSets,sound:b.sound,tokens:b.tokens.map(t=>{if(!t||typeof t.earned!=='boolean')throw Error('Invalid token.');return {icon:icon(t.icon),earned:t.earned};})};
 }
 const serialize=board=>({format:'token-board',version:2,board:validate({format:'token-board',version:2,board})});
 const defaults=()=>({type:'token-board',title:'My token board',reward:'Choose a favorite activity',rewardIcon:{source:'material',id:'redeem',label:'Gift'},font:'Nunito',color:'#17283f',extraSets:1,sound:false,tokens:Array.from({length:5},()=>({icon:{source:'material',id:'star',label:'Star'},earned:false}))});
 function url(value){const v=icon(value);if(v.source==='dicebear')return TokenCharacters.url(v.id);if(v.source==='arasaac')return `https://static.arasaac.org/pictograms/${v.id}/${v.id}_300.png`;return `https://api.iconify.design/${v.source==='material'?'material-symbols':'openmoji'}/${v.id}.svg`;}
 return {fonts,sources,credits,icon,validate,serialize,defaults,url};
})();
