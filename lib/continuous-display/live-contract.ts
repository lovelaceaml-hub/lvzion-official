// Shared, data-minimized contract for the LV Zion Official screen player and manager.
export type DisplayKind='announcement'|'schedule'|'event'|'campaign';
export type DisplayStyle='editorial'|'schedule'|'event'|'campaign';
export type DisplayRow={time:string;label:string};
export type DisplaySlide={id:string;kind:DisplayKind;style:DisplayStyle;title:string;body:string;duration:number;date?:string;time?:string;location?:string;rows?:DisplayRow[];startsAt?:string;endsAt?:string};
export type DisplayDevice={id:string;lastSeen:string|null;pairedAt:string;revoked:boolean};
export type DisplayScreen={id:string;label:string;enabled:boolean;draftVersion:number;items:DisplaySlide[];startsAt:string|null;endsAt:string|null;approvedVersion:number|null;publishedVersion:number;publishedAt:string|null;publishedUntil:string|null;devices:DisplayDevice[];history:{id:string;generation:number;publishedAt:string;until:string}[]};
export type DisplayManagementState={screens:DisplayScreen[]};
export type DisplaySnapshot={paired:true;screen:string;version:number;serverTime:string;leaseUntil:string;slides:DisplaySlide[]};
const kinds=new Set(['announcement','schedule','event','campaign']);
const styles=new Set(['editorial','schedule','event','campaign']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const instant=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const local=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.trim().length>0&&[...value].length<=max&&!/[\u0000-\u001f]/.test(value);
const strict=(value:Record<string,unknown>,keys:string[])=>Object.keys(value).every(k=>keys.includes(k));
const int=(x:unknown,min:number,max:number):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max;
export const MAX_DISPLAY_SLIDES=16;
export function isUuid(value:unknown):value is string{return typeof value==='string'&&uuid.test(value);}
export function safeInstant(value:unknown):value is string{return typeof value==='string'&&value.length<=40&&instant.test(value)&&Number.isFinite(Date.parse(value));}
export function parseDisplaySlides(value:unknown):DisplaySlide[]{
 if(!Array.isArray(value)||value.length>MAX_DISPLAY_SLIDES)throw Error('Limit to sixteen short TV slides.');
 const seen=new Set<string>();
 return value.map(raw=>{
  if(!record(raw)||!strict(raw,['id','kind','style','title','body','duration','date','time','location','rows','startsAt','endsAt']))throw Error('Unknown or private display field.');
  if(typeof raw.id!=='string'||!/^\w[a-z0-9-]{2,49}$/.test(raw.id)||seen.has(raw.id))throw Error('Slide identifiers must be unique.');
  seen.add(raw.id);
  if(!kinds.has(String(raw.kind))||!styles.has(String(raw.style))||!text(raw.title,74)||!text(raw.body,160)||!int(raw.duration,8,60))throw Error('Use concise, readable TV content.');
  for(const name of ['date','time','location'])if(raw[name]!==undefined&&!text(raw[name],72))throw Error('An optional detail is invalid.');
  if(raw.kind==='schedule'&&(!raw.date||!Array.isArray(raw.rows)||raw.rows.length<1))throw Error('Schedules need a date and at least one activity.');
  if(raw.kind==='event'&&(!raw.date||!raw.time||!raw.location))throw Error('Events need a date, time, and location.');
  if(raw.date!==undefined){
   if(typeof raw.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!Number.isFinite(Date.parse(raw.date+'T12:00:00Z'))||new Date(raw.date+'T12:00:00Z').toISOString().slice(0,10)!==raw.date)throw Error('Enter a valid calendar date.');
  }
  if(raw.rows!==undefined&&(!Array.isArray(raw.rows)||raw.rows.length>3||raw.rows.some(r=>!record(r)||!strict(r,['time','label'])||!text(r.time,28)||!text(r.label,80))))throw Error('Schedules allow three brief activities.');
  if((raw.startsAt===undefined)!==(raw.endsAt===undefined))throw Error('A slide needs both its start and expiration.');
  if(raw.startsAt!==undefined&&(!safeInstant(raw.startsAt)||!safeInstant(raw.endsAt)||Date.parse(raw.startsAt)>=Date.parse(raw.endsAt as string)))throw Error('Invalid slide eligibility window.');
  return raw as DisplaySlide;
 });
}
export function parseDisplaySnapshot(value:unknown):DisplaySnapshot{
 if(!record(value)||value.paired!==true||!text(value.screen,80)||!int(value.version,0,10000000)||!safeInstant(value.serverTime)||!safeInstant(value.leaseUntil))throw Error('Invalid screen response.');
 if(Date.parse(value.leaseUntil)<=Date.parse(value.serverTime)||Date.parse(value.leaseUntil)-Date.parse(value.serverTime)>31000)throw Error('Screen content verification expired.');
 return{paired:true,screen:value.screen,version:value.version,serverTime:value.serverTime,leaseUntil:value.leaseUntil,slides:parseDisplaySlides(value.slides)};
}
export function activeDisplaySlides(slides:DisplaySlide[],nowMs:number):DisplaySlide[]{
 if(!Number.isFinite(nowMs))return[];
 return slides.filter(s=>(!s.startsAt||Date.parse(s.startsAt)<=nowMs)&&(!s.endsAt||nowMs<Date.parse(s.endsAt)));
}
export function churchLocal(value:string):string{
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function churchTimeToUtc(wall:string,offset:'-07:00'|'-08:00'):string{
 if(!local.test(wall))throw Error('Choose a valid Las Vegas date and time.');
 const parsed=Date.parse(wall+':00'+offset);if(!Number.isFinite(parsed))throw Error('Invalid time.');
 if(churchLocal(new Date(parsed).toISOString())!==wall)throw Error('The time does not exist in Las Vegas with that UTC offset (DST).');
 return new Date(parsed).toISOString();
}
export function offsetForChurchTime(value:string):'-07:00'|'-08:00'{
 const wall=churchLocal(value);
 try{if(churchTimeToUtc(wall,'-07:00')===new Date(value).toISOString())return '-07:00';}catch{}
 return '-08:00';
}
