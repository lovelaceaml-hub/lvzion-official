import {appearanceThemes,DEFAULT_THEME,parseTheme,THEME_STORAGE_KEY,type ThemeId} from './appearance-themes.ts';
import {designTokens} from './design-tokens.ts';

const changed='lvz:appearance';
export function readThemePreference():ThemeId{
 try{return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));}catch{return DEFAULT_THEME;}
}
export function currentTheme():ThemeId{
 return typeof document==='undefined'?DEFAULT_THEME:parseTheme(document.documentElement.dataset.lvzTheme);
}
export function applyTheme(theme:ThemeId,immersive=false){
 const root=document.documentElement,selected=immersive?DEFAULT_THEME:parseTheme(theme);
 if(selected===DEFAULT_THEME)delete root.dataset.lvzTheme;
 else root.dataset.lvzTheme=selected;
 const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
 if(meta)meta.content=appearanceThemes.find(t=>t.id===selected)?.background??designTokens.accent;
 window.dispatchEvent(new Event(changed));
}
export function saveThemePreference(theme:ThemeId):boolean{
 const selected=parseTheme(theme);
 applyTheme(selected);
 try{
  if(selected===DEFAULT_THEME)window.localStorage.removeItem(THEME_STORAGE_KEY);
  else window.localStorage.setItem(THEME_STORAGE_KEY,selected);
  return true;
 }catch{return false;}
}
export function subscribeToTheme(listener:()=>void){
 window.addEventListener(changed,listener);
 return()=>window.removeEventListener(changed,listener);
}

// Only an allow-listed, non-sensitive theme ID is read before first paint.
// A blocked preference store falls back to the application's approved defaults.
export const themeBootstrap=`(()=>{try{if(location.pathname!=="/display"){const t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(appearanceThemes.map(t=>t.id))}.includes(t))document.documentElement.dataset.lvzTheme=t;}}catch{}})()`;
