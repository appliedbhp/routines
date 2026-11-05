import {cloudConfig} from './config.js';

export const accountStorageKey='routines.cloud.auth.v1';
let clientPromise;
export function accountClient(){
 if(!navigator.onLine)throw Error('Cloud accounts need an internet connection.');
 clientPromise ??= import('https://esm.sh/@supabase/supabase-js@2.57.4').then(({createClient})=>
  createClient(cloudConfig.url,cloudConfig.publishableKey,{auth:{storageKey:accountStorageKey,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
 ).catch(error=>{clientPromise=null;throw error;});
 return clientPromise;
}
