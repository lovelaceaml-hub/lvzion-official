/** Typed boundary for the browser-native, Node-testable fictional display engine. */
export type Permission='create'|'review'|'approve'|'publish'|'playlist'|'assign'|'device'|'override';
export type Layout='editorial'|'schedule'|'event'|'campaign'|'image'|'video';
export type Slide={id:string;revision:number;layout:Layout;eyebrow:string;title:string;body:string;date?:string;time?:string;location?:string;rows?:{time:string;label:string}[];media?:string;fictional:true};
export type Entry={id:string;slideId:string;revision:number;seconds:number;transition:'cut'|'fade';startsAt:number;endsAt:number;screenIds:string[];cacheAllowed:boolean;repeat:number;emphasis?:{startsAt:number;endsAt:number;repeat:number}};
export type DisplayPackage={schema:1;version:number;screenId:string;issuedAt:number;leaseUntil:number;slides:Slide[];entries:Entry[];hours:{days:number[];start:number;end:number}[];overrides:{id:string;entryId:string;priority:number;startsAt:number;endsAt:number}[]};
export type PlaybackState={mode:string;entry:Entry|null;slide:Slide|null|undefined;version:number;pendingVersion:number|null;paused:boolean;failedCount:number;transitions:number;override:boolean};
export const TZ:'America/Los_Angeles';
export const DEMO_TIME:number;
export const LIMITS:Readonly<{entries:number;slides:number;repeat:number;seconds:number;leaseMs:number;bytes:number}>;
export const PERMISSIONS:ReadonlyArray<Permission>;
export const FIXTURES:ReadonlyArray<Slide>;
export function escapeHtml(value:unknown):string;
export function deepFreeze<T>(value:T):Readonly<T>;
export function allowed(grants:unknown,permission:string,screenId:string):boolean;
export function mediaPath(path:unknown):path is string;
export function validateSlide(slide:unknown):string[];
export function validateEntry(entry:unknown,ids:Set<string>):boolean;
export function validatePackage(value:unknown):value is DisplayPackage;
export function localParts(now:number):{day:number;minute:number;date:string};
export function churchInstant(iso:string):number;
export function isOperating(pkg:DisplayPackage,now:number):boolean;
export function eligible(entry:Entry,pkg:DisplayPackage,now:number,online?:boolean):boolean;
export function cycle(pkg:DisplayPackage,now:number,online?:boolean,failed?:Set<string>):Entry[];
export function demoPackage(now?:number,version?:number):DisplayPackage;
export function publicationState(entry:Entry,now:number):'Expired'|'Scheduled'|'Eligible now';
export function mediaPreflight(input:{type:string;size:number;width:number;height:number;duration?:number;metadataStripped:boolean}):string[];
export function projectForScreen(pkg:unknown,screenId:string,now:number):Readonly<DisplayPackage>|null;
export class DisplayEngine {
 pkg:DisplayPackage|null;pending:DisplayPackage|null;current:Entry|null;startedAt:number;remaining:number;paused:boolean;failed:Set<string>;lastNow:number;mode:string;activeOverride:string|null;revoked:boolean;transitions:number;lastRegularKey:string|null;forceAdvance:boolean;
 offer(pkg:unknown,now:number):boolean;revoke():void;fail():void;pause(now:number):void;resume(now:number):void;next():void;tick(now:number,options?:{online?:boolean;clockTrusted?:boolean}):PlaybackState;state():PlaybackState;
}
