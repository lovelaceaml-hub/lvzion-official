'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {applyTheme,readThemePreference} from '../lib/appearance';
import {parseTheme,THEME_STORAGE_KEY} from '../lib/appearance-themes';

/** Device appearance never changes a published audience-display composition. */
export default function AppearanceSync(){
 const path=usePathname();
 useEffect(()=>{
  applyTheme(readThemePreference(),path==='/display');
  function sync(event:StorageEvent){
   if(event.key===THEME_STORAGE_KEY||event.key===null)applyTheme(parseTheme(event.newValue),path==='/display');
  }
  window.addEventListener('storage',sync);
  return()=>window.removeEventListener('storage',sync);
 },[path]);
 return null;
}
