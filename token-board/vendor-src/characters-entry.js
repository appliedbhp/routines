import { Style, Avatar } from '@dicebear/core';
import definition0 from '@dicebear/styles/bottts.json';
import definition1 from '@dicebear/styles/planets.json';
import definition2 from '@dicebear/styles/adventurer.json';
import definition3 from '@dicebear/styles/big-smile.json';
import definition4 from '@dicebear/styles/critters.json';
import definition5 from '@dicebear/styles/clay.json';
import definition6 from '@dicebear/styles/croodles.json';
import definition7 from '@dicebear/styles/marbles.json';
import definition8 from '@dicebear/styles/micah.json';
import definition9 from '@dicebear/styles/pixel-art.json';
import definition10 from '@dicebear/styles/voxel-art.json';
import definition11 from '@dicebear/styles/voxel-bot.json';
const definitions={'bottts':definition0,'planets':definition1,'adventurer':definition2,'big-smile':definition3,'critters':definition4,'clay':definition5,'croodles':definition6,'marbles':definition7,'micah':definition8,'pixel-art':definition9,'voxel-art':definition10,'voxel-bot':definition11};
const cache=new Map();
export const styles=Object.fromEntries(Object.entries(definitions).map(([key,d])=>[key,{name:d.meta.source.name,creator:d.meta.creator.name,license:d.meta.license.name,licenseUrl:d.meta.license.url,animated:!!d.components.animation}]));
const compiled=Object.fromEntries(Object.entries(definitions).map(([k,d])=>[k,new Style(d)]));
export function url(seed,style='bottts',animated=false){
 if(!Object.hasOwn(compiled,style))throw Error('Unknown character style');
 const key=JSON.stringify([seed,style,animated]);
 if(!cache.has(key)){if(cache.size>200)cache.clear();cache.set(key,new Avatar(compiled[style],{seed,animationVariant: [animated?'medium':'none']}).toDataUri());}
 return cache.get(key);
}
