'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {applyAppearance,currentAppearance,readAppearance,subscribeToSystemScheme} from '../lib/appearance';
import {APPEARANCE_STORAGE_KEY,parseAppearance} from '../lib/appearance-preference';

/** Device appearance never changes a published audience-display composition. */
export default function AppearanceSync(){
 const path=usePathname();
 useEffect(()=>{
  const immersive=path==='/display';
  applyAppearance(readAppearance(),immersive);
  function sync(event:StorageEvent){
   if(event.key===APPEARANCE_STORAGE_KEY||event.key===null)applyAppearance(parseAppearance(event.newValue),immersive);
  }
  window.addEventListener('storage',sync);
  const stop=subscribeToSystemScheme(()=>applyAppearance(currentAppearance(),immersive));
  return()=>{window.removeEventListener('storage',sync);stop();};
 },[path]);
 return null;
}
