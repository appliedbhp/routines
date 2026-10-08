const TokenData = (() => {
  const styles=['color','fluency','doodle','ios-filled'];
  const fonts=['Nunito','Fredoka','Patrick Hand','system-ui'];
  const icons={Favorites:['star','heart','gift','trophy','medal','smiling'],Animals:['dog','cat','dinosaur','unicorn','butterfly','panda'],Activities:['book','paint-palette','soccer-ball','basketball','music','controller'],Space:['rocket','planet','astronaut','sun','moon','earth']};
  function slug(value){if(typeof value!=='string'||!/^[-a-z0-9]{1,60}$/.test(value))throw new Error('Use an Icons8 icon name with letters, numbers, or hyphens.');return value;}
  function text(value){if(typeof value!=='string'||value.length>100)throw new Error('Keep names and labels under 100 characters.');return value;}
  function validate(payload){
    if(!payload||payload.format!=='token-board'||payload.version!==1||!payload.board)throw new Error('Choose a token-board JSON file exported from this site.');
    const b=payload.board;
    if(!styles.includes(b.style)||!fonts.includes(b.font)||!/^#[0-9a-f]{6}$/i.test(b.color))throw new Error('Invalid board appearance.');
    if(!Number.isInteger(b.extraSets)||b.extraSets<0||b.extraSets>3||typeof b.sound!=='boolean')throw new Error('Invalid board options.');
    if(!Array.isArray(b.tokens)||b.tokens.length<1||b.tokens.length>12)throw new Error('Choose between 1 and 12 tokens.');
    const tokens=b.tokens.map(t=>{if(!t||typeof t.earned!=='boolean')throw new Error('Invalid token.');return {icon:slug(t.icon),earned:t.earned};});
    return {type:'token-board',title:text(b.title),reward:text(b.reward),rewardIcon:slug(b.rewardIcon),style:b.style,font:b.font,color:b.color,extraSets:b.extraSets,sound:b.sound,tokens};
  }
  function serialize(board){return {format:'token-board',version:1,board:validate({format:'token-board',version:1,board})};}
  function defaults(){return {type:'token-board',title:'My token board',reward:'Choose a favorite activity',rewardIcon:'gift',style:'color',font:'Nunito',color:'#17283f',extraSets:1,sound:false,tokens:Array.from({length:5},()=>({icon:'star',earned:false}))};}
  function url(icon,style){if(!styles.includes(style))throw new Error('Unknown icon style.');return `https://img.icons8.com/${style}/96/${slug(icon)}.png`;}
  return {styles,fonts,icons,slug,validate,serialize,defaults,url};
})();
