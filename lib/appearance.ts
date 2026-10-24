import {APPEARANCE_STORAGE_KEY,DEFAULT_APPEARANCE,legacyDarkThemes,legacyLightThemes,parseAppearance,resolveScheme,type Appearance} from './appearance-preference.ts';
import {designTokens} from './design-tokens.ts';

const changed='lvz:appearance';
const darkQuery='(prefers-color-scheme: dark)';
const systemDark=()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia(darkQuery).matches;

export function readAppearance():Appearance{
 try{return parseAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY));}catch{return DEFAULT_APPEARANCE;}
}
export function currentAppearance():Appearance{
 return typeof document==='undefined'?DEFAULT_APPEARANCE:parseAppearance(document.documentElement.dataset.lvzAppearance);
}
/** Sets :root[data-lvz-scheme]; the paired TV player always keeps its published light composition. */
export function applyAppearance(appearance:Appearance,immersive=false){
 const root=document.documentElement,selected=parseAppearance(appearance);
 root.dataset.lvzAppearance=selected;
 const scheme=immersive?'light':resolveScheme(selected,systemDark());
 if(scheme==='dark')root.dataset.lvzScheme='dark';else delete root.dataset.lvzScheme;
 const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
 if(meta)meta.content=scheme==='dark'?designTokens.darkGround:designTokens.accent;
 window.dispatchEvent(new Event(changed));
}
export function saveAppearance(appearance:Appearance):boolean{
 const selected=parseAppearance(appearance);
 applyAppearance(selected);
 try{
  if(selected===DEFAULT_APPEARANCE)window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
  else window.localStorage.setItem(APPEARANCE_STORAGE_KEY,selected);
  return true;
 }catch{return false;}
}
export function subscribeToAppearance(listener:()=>void){
 window.addEventListener(changed,listener);
 return()=>window.removeEventListener(changed,listener);
}
/** Re-resolves System when the device switches between light and dark. */
export function subscribeToSystemScheme(listener:()=>void){
 if(typeof window.matchMedia!=='function')return()=>{};
 const query=window.matchMedia(darkQuery);
 query.addEventListener('change',listener);
 return()=>query.removeEventListener('change',listener);
}

// Only the allow-listed appearance value is read before first paint. Legacy theme
// IDs map to Light or Dark. A blocked store falls back to System.
export const themeBootstrap=`(()=>{try{if(location.pathname==="/display")return;let a="system";try{const v=localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)});if(v==="light"||v==="dark"||v==="system")a=v;else if(${JSON.stringify(legacyDarkThemes)}.includes(v))a="dark";else if(${JSON.stringify(legacyLightThemes)}.includes(v))a="light";}catch{}const r=document.documentElement;r.dataset.lvzAppearance=a;if(a==="dark"||(a==="system"&&matchMedia(${JSON.stringify(darkQuery)}).matches))r.dataset.lvzScheme="dark";}catch{}})()`;
