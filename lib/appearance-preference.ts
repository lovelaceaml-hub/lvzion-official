/** Device appearance: Light, Dark or System. Presentation only; no member data or permissions. */
export const appearanceChoices=[
 {id:'system',name:'System',detail:'Follow this device’s light or dark setting.'},
 {id:'light',name:'Light',detail:'Light backgrounds all the time.'},
 {id:'dark',name:'Dark',detail:'Dark backgrounds all the time.'},
] as const;
export type Appearance=typeof appearanceChoices[number]['id'];
export type Scheme='light'|'dark';
export const APPEARANCE_STORAGE_KEY='lvz.appearance.v1';
export const DEFAULT_APPEARANCE:Appearance='system';

// The October 19 release stored one of 24 theme IDs under the same key. Those
// saved choices keep working: a dark theme becomes Dark, any other becomes Light.
export const legacyDarkThemes=['midnight-sapphire','aurora-night','copper-noir','plum-velvet'] as const;
export const legacyLightThemes=['layered-tabs','frosted-sky','graphite-chrome','floating-glass','sculpted-ceramic','satin-ribbon','rose-quartz','citrus-frost','lavender-softform','cobalt-enamel','liquid-opal','linen-editorial','ink-index','terracotta-studio','tidal-teal','pearl-garden','solar-mango','skyline-grid','coral-kindness','high-clarity'] as const;

export function parseAppearance(value:unknown):Appearance{
 if(typeof value!=='string')return DEFAULT_APPEARANCE;
 if(appearanceChoices.some(c=>c.id===value))return value as Appearance;
 if((legacyDarkThemes as readonly string[]).includes(value))return 'dark';
 if((legacyLightThemes as readonly string[]).includes(value))return 'light';
 return DEFAULT_APPEARANCE;
}
export function resolveScheme(appearance:Appearance,systemDark:boolean):Scheme{
 return appearance==='system'?(systemDark?'dark':'light'):appearance;
}
