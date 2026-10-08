import { createAvatar } from '@dicebear/core';
import * as bottts from '@dicebear/bottts';
const cache=new Map();
export function url(seed){if(!cache.has(seed)){if(cache.size>200)cache.clear();cache.set(seed,createAvatar(bottts,{seed}).toDataUri());}return cache.get(seed);}
