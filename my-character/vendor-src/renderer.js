import * as micah from '@dicebear/micah';
import * as notionists from '@dicebear/notionists';
import * as openPeeps from '@dicebear/open-peeps';
import {createAvatar} from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
function renderAdventurer(state){
 const marker=['f1e2d3','f2e3d4','f3e4d5'].find(c=>![state.skinColor,state.backgroundColor].includes(c));
 const options={seed:state.seed,hair:[state.hair],hairProbability:100,hairColor:[state.isOmbre?marker:state.hairColor],skinColor:[state.skinColor],eyes:[state.eyes],eyebrows:[state.eyebrows],mouth:[state.mouth],glasses:[state.glasses],glassesProbability:state.glassesEnabled?100:0,earringsProbability:0,featuresProbability:0,backgroundColor:[state.backgroundColor],randomizeIds:false};
 let svg=createAvatar(adventurer,options).toString();
 if(state.isOmbre){const gradient=`<defs><linearGradient id="abhp-hair-ombre" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="780"><stop offset="0" stop-color="#${state.hairColor}"/><stop offset=".35" stop-color="#${state.hairColor}"/><stop offset="1" stop-color="#${state.hairTipColor}"/></linearGradient></defs>`;svg=svg.replace(/(<svg[^>]*>)/,`$1${gradient}`).replaceAll(`fill="#${marker}"`,'fill="url(#abhp-hair-ombre)"');}
 return svg;
}
export const schema=adventurer.schema;

export const styles={adventurer:{name:'Adventurer',creator:'Lisa Wischofsky',license:'CC BY 4.0'},micah:{name:'Micah',creator:'Micah Lanier',license:'CC BY 4.0'},notionists:{name:'Notionist',creator:'Zoish',license:'CC0 1.0'},'open-peeps':{name:'OpenPeeps',creator:'Pablo Stanley',license:'CC0 1.0'}};
export const schemas={adventurer:adventurer.schema,micah:micah.schema,notionists:notionists.schema,'open-peeps':openPeeps.schema};
export const micahRules={mouth:['laughing','nervous','smile'],baseColor:['f9c9b6','ac6651','77311d','ffffff'],shirtColor:['f4d150','9287ff','006d8f','d95000','9a244f','444444','4f7a28'],seed:'4zbqtmns'};
export function optionsFor(state){
 const options={seed:state.seed||micahRules.seed,backgroundColor:[state.backgroundColor||'transparent'],randomizeIds:false};
 for(const [key,d] of Object.entries(schemas[state.style]?.properties||{}))if(d.type==='array'&&typeof state[key]==='string'&&(d.items.enum?.includes(state[key])||/^[0-9a-f]{6}$/i.test(state[key])))options[key]=[state[key]];
 if(state.style==='micah')Object.assign(options,{mouth:micahRules.mouth.includes(state.mouth)?[state.mouth]:micahRules.mouth,baseColor:micahRules.baseColor.includes(state.baseColor)?[state.baseColor]:micahRules.baseColor,shirtColor:micahRules.shirtColor.includes(state.shirtColor)?[state.shirtColor]:micahRules.shirtColor,eyes:micah.schema.properties.eyes.items.enum.includes(state.eyes)?[state.eyes]:['round'],eyebrows:micah.schema.properties.eyebrows.items.enum.includes(state.eyebrows)?[state.eyebrows]:['up'],glassesProbability:0,earringsProbability:0,facialHairProbability:0});
 if(state.style==='notionists')Object.assign(options,{glassesProbability:state.glassesEnabled?100:0,beardProbability:0,gestureProbability:0});
 if(state.style==='open-peeps')Object.assign(options,{accessoriesProbability:state.glassesEnabled?100:0,facialHairProbability:0,maskProbability:0});
 return options;
}
export function render(state){if(!state.style||state.style==='adventurer')return renderAdventurer(state);return createAvatar({micah,notionists,'open-peeps':openPeeps}[state.style]||adventurer,optionsFor(state)).toString();}
export function credit(style='adventurer'){const s=styles[style]||styles.adventurer;return s.name+' by '+s.creator+' / '+s.license+' / DiceBear';}
