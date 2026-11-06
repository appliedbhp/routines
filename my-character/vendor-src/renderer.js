import {createAvatar} from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
export function render(state){
 const marker=['f1e2d3','f2e3d4','f3e4d5'].find(c=>![state.skinColor,state.backgroundColor].includes(c));
 const options={seed:state.seed,hair:[state.hair],hairProbability:100,hairColor:[state.isOmbre?marker:state.hairColor],skinColor:[state.skinColor],eyes:[state.eyes],eyebrows:[state.eyebrows],mouth:[state.mouth],glasses:[state.glasses],glassesProbability:state.glassesEnabled?100:0,earringsProbability:0,featuresProbability:0,backgroundColor:[state.backgroundColor],randomizeIds:false};
 let svg=createAvatar(adventurer,options).toString();
 if(state.isOmbre){const gradient=`<defs><linearGradient id="abhp-hair-ombre" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="780"><stop offset="0" stop-color="#${state.hairColor}"/><stop offset=".35" stop-color="#${state.hairColor}"/><stop offset="1" stop-color="#${state.hairTipColor}"/></linearGradient></defs>`;svg=svg.replace(/(<svg[^>]*>)/,`$1${gradient}`).replaceAll(`fill="#${marker}"`,'fill="url(#abhp-hair-ombre)"');}
 return svg;
}
export const schema=adventurer.schema;
