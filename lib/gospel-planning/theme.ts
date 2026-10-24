import {appearanceThemes,DEFAULT_THEME,THEME_STORAGE_KEY,parseTheme,type ThemeId} from '../appearance-themes.ts';

/**
 * Gospel Planning's own Theme Atlas style, used while the device appearance is "Current app design".
 * To swap styles, change this one ID to any theme in lib/appearance-themes.ts.
 * Chosen: Skyline Grid, the Atlas style made for schedules and organization, unused by other apps.
 */
export const GOSPEL_PLANNING_THEME:ThemeId='skyline-grid';

/** The theme to show on this module: a chosen device theme always wins over the module default. */
export function moduleTheme(devicePreference:ThemeId,moduleDefault:ThemeId=GOSPEL_PLANNING_THEME):ThemeId{
 return devicePreference===DEFAULT_THEME?parseTheme(moduleDefault):devicePreference;
}

/** Runs before first paint so the module does not flash the shared default colors. */
export const moduleThemeBootstrap=`(()=>{try{const ids=${JSON.stringify(appearanceThemes.map(t=>t.id))};let t=null;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch{}if(!ids.includes(t))document.documentElement.dataset.lvzTheme=${JSON.stringify(GOSPEL_PLANNING_THEME)};}catch{}})()`;
