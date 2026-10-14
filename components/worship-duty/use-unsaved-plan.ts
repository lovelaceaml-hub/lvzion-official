'use client';
import {useCallback,useEffect,useRef} from 'react';

/** Memory-only draft protection. Never persists member data or interferes with access revocation. */
export function useUnsavedPlan() {
 const dirty=useRef(false);
 const markDirty=useCallback((value:boolean)=>{dirty.current=value;},[]);
 const permitNavigation=useCallback(()=>{
  if(!dirty.current)return true;
  if(!window.confirm('Discard unsaved song-plan changes? Your saved plan will not change.'))return false;
  // Avoid a second browser-unload prompt after an explicit discard decision.
  dirty.current=false;
  return true;
 },[]);
 useEffect(()=>{
  const beforeUnload=(event:BeforeUnloadEvent)=>{
   if(!dirty.current)return;
   event.preventDefault();
   event.returnValue='';
  };
  window.addEventListener('beforeunload',beforeUnload);
  return()=>{window.removeEventListener('beforeunload',beforeUnload);dirty.current=false;};
 },[]);
 return {markDirty,permitNavigation};
}
