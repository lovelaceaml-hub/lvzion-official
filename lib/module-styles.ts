/**
 * Which palette each module wears on the shared Liquid Opal material. The shared AppFrame sets
 * data-lvz-module from the first matching route prefix; the palette for each
 * key lives in styles/lvz-tokens.css (Guidance Teachers has a route-scoped token file).
 * See docs/design/LVZ-DESIGN-CONTRACT.md.
 */
export type ModuleIconName='room'|'people'|'sun'|'display'|'calendar'|'heart'|'music'|'clipboard'|'apps';
export type ModuleStyle={key:string;routes:string[];title:string;icon:ModuleIconName;atlas:string;darkByDesign?:boolean};
export const moduleStyles:ModuleStyle[]=[
 {key:'study-rooms',routes:['/modules/study-rooms'],title:'Study Rooms',icon:'room',atlas:'Liquid Opal, Lavender Softform values'},
 {key:'contacts',routes:['/modules/contacts'],title:'Contacts',icon:'people',atlas:'Liquid Opal, teal'},
 {key:'work-mission',routes:['/modules/work-mission-prayer'],title:'Morning Prayer',icon:'sun',atlas:'Liquid Opal, linen'},
 {key:'continuous-display',routes:['/modules/continuous-display','/display-operations-review'],title:'Church Display',icon:'display',atlas:'Liquid Opal, garden'},
 {key:'members',routes:['/members/manage','/member-preview','/roster-preview','/enrollment-preview'],title:'Members',icon:'people',atlas:'Liquid Opal, graphite'},
 {key:'gospel-planning',routes:['/modules/gospel-planning'],title:'Gospel Planning',icon:'clipboard',atlas:'Liquid Opal, sky'},
 {key:'worship-duty',routes:['/modules/worship-duty'],title:'Worship Duty',icon:'calendar',atlas:'Liquid Opal, sapphire'},
 {key:'guidance-teachers',routes:['/modules/guidance-teachers'],title:'Guidance Teachers',icon:'people',atlas:'White and lavender service cards'},
 {key:'mothers-love',routes:['/modules/mothers-love'],title:'Mother’s Love',icon:'heart',atlas:'Liquid Opal, rose'},
 {key:'concert',routes:['/modules/concert','/concert'],title:'Event Invitation and Registration',icon:'heart',atlas:'Healing Concert, coral and sky blue'},
 {key:'song-library',routes:['/modules/song-library'],title:'Song library',icon:'music',atlas:'Copper Noir',darkByDesign:true},
];
const matches=(path:string,route:string)=>path===route||path.startsWith(route+'/');
export function moduleStyleFor(path:string):ModuleStyle|null{
 return moduleStyles.find(m=>m.routes.some(r=>matches(path,r)))??null;
}
