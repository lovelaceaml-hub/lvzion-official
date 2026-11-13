// Shared, data-minimized contract for the LV Zion Official screen player and manager.
export type DisplayKind='announcement'|'schedule'|'event'|'campaign'|'image'|'video'|'rooms'|'mothers-love';
/** Picture, video and room-booking slides; the original four are text slides. */
export type DisplayMediaKind='image'|'video';
export type DisplayFit='cover'|'contain';
export type DisplayStyle='editorial'|'schedule'|'event'|'campaign';
export type DisplayRow={time:string;label:string};
export type DisplaySlide={id:string;kind:DisplayKind;style:DisplayStyle;title:string;body?:string;duration:number;date?:string;time?:string;location?:string;rows?:DisplayRow[];startsAt?:string;endsAt?:string;media?:string;fit?:DisplayFit};
/** Today's study-room bookings for a rooms slide: room and time only, never who booked. */
export type DisplayRoomBooking={room:string;start:string;end:string};
export type DisplayRooms={date:string;bookings:DisplayRoomBooking[]};
/** The Words of Mother's Love: only the newest published recognition's id and time, never a name or message. */
export type DisplayMothersLove={latestId:string|null;latestAt:string|null};
export const MOTHERS_LOVE_TV='https://mothers-love.vercel.app/display';
const recognitionId=/^[A-Za-z0-9-]{8,128}$/;
export function parseDisplayMothersLove(value:unknown):DisplayMothersLove|null{
 if(value===null||value===undefined)return null;
 if(!isRecord(value)||Object.keys(value).some(k=>k!=='latestId'&&k!=='latestAt'))throw Error('Invalid Mother\'s Love update.');
 const latestId=value.latestId??null,latestAt=value.latestAt??null;
 if((latestId===null)!==(latestAt===null)||(latestId!==null&&(typeof latestId!=='string'||!recognitionId.test(latestId)||!safeInstant(latestAt))))throw Error('Invalid Mother\'s Love update.');
 return{latestId:latestId as string|null,latestAt:latestAt as string|null};
}
export type DisplayDevice={id:string;lastSeen:string|null;pairedAt:string;revoked:boolean};
export type DisplayScreen={id:string;label:string;enabled:boolean;draftVersion:number;items:DisplaySlide[];startsAt:string|null;endsAt:string|null;approvedVersion:number|null;publishedVersion:number;publishedAt:string|null;publishedUntil:string|null;devices:DisplayDevice[];history:{id:string;generation:number;publishedAt:string;until:string}[]};
export type DisplaySnapshot={paired:true;screen:string;version:number;serverTime:string;leaseUntil:string;slides:DisplaySlide[]};
export type ChurchOffset='-07:00'|'-08:00';
export const CHURCH_TIME_ZONE='America/Los_Angeles';
const kinds=new Set(['announcement','schedule','event','campaign','image','video','rooms','mothers-love']);
const textKinds=new Set(['announcement','schedule','event','campaign']);
export const isTextKind=(kind:DisplayKind)=>textKinds.has(kind);
export const KIND_LABELS:Record<DisplayKind,string>={announcement:'Announcement',schedule:'Schedule',event:'Event',campaign:'Campaign',image:'Picture',video:'Video',rooms:'Study rooms','mothers-love':"Mother's Love"};
/** Seconds a slide may stay on screen, by kind. A video also moves on when it ends. */
export const DISPLAY_DURATION:Record<DisplayKind,{min:number;max:number}>={
 announcement:{min:8,max:60},schedule:{min:8,max:60},event:{min:8,max:60},campaign:{min:8,max:60},
 image:{min:5,max:300},video:{min:5,max:900},rooms:{min:8,max:120},'mothers-love':{min:20,max:900}
};
/** Uploaded picture and video files, named by the server: a random id and an allowed extension. */
const mediaName=/^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$/;
export const DISPLAY_IMAGE_TYPES:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
export const DISPLAY_VIDEO_TYPES:Record<string,string>={'video/mp4':'mp4','video/webm':'webm'};
export const DISPLAY_MEDIA_MAX_BYTES=50*1024*1024;
export function isMediaName(value:unknown):value is string{return typeof value==='string'&&mediaName.test(value);}
export function mediaKindOf(name:string):DisplayMediaKind{return /\.(mp4|webm)$/.test(name)?'video':'image';}
const styles=new Set(['editorial','schedule','event','campaign']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const instant=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const local=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.trim().length>0&&[...value].length<=max&&!/[\u0000-\u001f]/.test(value);
const strict=(value:Record<string,unknown>,keys:string[])=>Object.keys(value).every(k=>keys.includes(k));
export const isInt=(x:unknown,min:number,max:number):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max;
export const MAX_DISPLAY_SLIDES=16;
const slideId=/^[a-z0-9][a-z0-9-]{2,49}$/;
export function isSlideId(value:unknown):value is string{return typeof value==='string'&&slideId.test(value);}
export function isUuid(value:unknown):value is string{return typeof value==='string'&&uuid.test(value);}
export function safeInstant(value:unknown):value is string{return typeof value==='string'&&value.length<=40&&instant.test(value)&&Number.isFinite(Date.parse(value));}
export function parseDisplaySlides(value:unknown):DisplaySlide[]{
 if(!Array.isArray(value)||value.length>MAX_DISPLAY_SLIDES)throw Error('Limit to sixteen short TV slides.');
 const seen=new Set<string>();
 return value.map(raw=>{
  if(!isRecord(raw)||!strict(raw,['id','kind','style','title','body','duration','date','time','location','rows','startsAt','endsAt','media','fit']))throw Error('Unknown or private display field.');
  if(!isSlideId(raw.id)||seen.has(raw.id))throw Error('Slide identifiers must be unique.');
  seen.add(raw.id);
  if(!kinds.has(String(raw.kind))||!styles.has(String(raw.style))||!text(raw.title,74))throw Error('Use concise, readable TV content.');
  const kind=raw.kind as DisplayKind,limits=DISPLAY_DURATION[kind];
  if(!isInt(raw.duration,limits.min,limits.max))throw Error(`Show this slide for ${limits.min} to ${limits.max} seconds.`);
  if(textKinds.has(kind)?!text(raw.body,160):raw.body!==undefined&&!text(raw.body,160))throw Error('Use concise, readable TV content.');
  if(kind==='image'||kind==='video'){
   if(!isMediaName(raw.media)||mediaKindOf(raw.media)!==kind)throw Error(kind==='image'?'Upload a picture for this slide.':'Upload a video for this slide.');
   if(raw.fit!==undefined&&raw.fit!=='cover'&&raw.fit!=='contain')throw Error('Choose how the picture fills the screen.');
  }else if(raw.media!==undefined||raw.fit!==undefined)throw Error('Only picture and video slides have a file.');
  if(!textKinds.has(kind)&&(raw.date!==undefined||raw.time!==undefined||raw.location!==undefined||raw.rows!==undefined))throw Error('Unknown or private display field.');
  for(const name of ['date','time','location'])if(raw[name]!==undefined&&!text(raw[name],72))throw Error('An optional detail is invalid.');
  if(raw.kind==='schedule'&&(!raw.date||!Array.isArray(raw.rows)||raw.rows.length<1))throw Error('Schedules need a date and at least one activity.');
  if(raw.kind==='event'&&(!raw.date||!raw.time||!raw.location))throw Error('Events need a date, time, and location.');
  if(raw.date!==undefined){
   if(typeof raw.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!Number.isFinite(Date.parse(raw.date+'T12:00:00Z'))||new Date(raw.date+'T12:00:00Z').toISOString().slice(0,10)!==raw.date)throw Error('Enter a valid calendar date.');
  }
  if(raw.rows!==undefined&&(!Array.isArray(raw.rows)||raw.rows.length>3||raw.rows.some(r=>!isRecord(r)||!strict(r,['time','label'])||!text(r.time,28)||!text(r.label,80))))throw Error('Schedules allow three brief activities.');
  if((raw.startsAt===undefined)!==(raw.endsAt===undefined))throw Error('A slide needs both its start and expiration.');
  if(raw.startsAt!==undefined&&(!safeInstant(raw.startsAt)||!safeInstant(raw.endsAt)||Date.parse(raw.startsAt)>=Date.parse(raw.endsAt as string)))throw Error('Invalid slide eligibility window.');
  return raw as unknown as DisplaySlide;
 });
}
const clock=/^([01]\d|2[0-3]):[0-5]\d$/;
/** Room bookings reach the TV only as a room label and a start and end time. */
export function parseDisplayRooms(value:unknown):DisplayRooms|null{
 if(value===null||value===undefined)return null;
 if(!isRecord(value)||!strict(value,['date','bookings'])||typeof value.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)
  ||!Array.isArray(value.bookings)||value.bookings.length>60)throw Error('Invalid room schedule.');
 const bookings=value.bookings.map(b=>{
  if(!isRecord(b)||!strict(b,['room','start','end'])||!text(b.room,40)||typeof b.start!=='string'||typeof b.end!=='string'
   ||!clock.test(b.start)||!clock.test(b.end))throw Error('Invalid room booking.');
  return{room:b.room,start:b.start,end:b.end};
 });
 return{date:value.date,bookings};
}
export function parseDisplaySnapshot(value:unknown):DisplaySnapshot{
 if(!isRecord(value)||value.paired!==true||!text(value.screen,80)||!isInt(value.version,0,10000000)||!safeInstant(value.serverTime)||!safeInstant(value.leaseUntil))throw Error('Invalid screen response.');
 if(Date.parse(value.leaseUntil)<=Date.parse(value.serverTime)||Date.parse(value.leaseUntil)-Date.parse(value.serverTime)>31000)throw Error('Screen content verification expired.');
 return{paired:true,screen:value.screen,version:value.version,serverTime:value.serverTime,leaseUntil:value.leaseUntil,slides:parseDisplaySlides(value.slides)};
}
// A slide with its own window is eligible from startsAt (inclusive) until endsAt (exclusive).
export function slideEligible(s:DisplaySlide,nowMs:number):boolean{
 return(!s.startsAt||Date.parse(s.startsAt)<=nowMs)&&(!s.endsAt||nowMs<Date.parse(s.endsAt));
}
export function activeDisplaySlides(slides:DisplaySlide[],nowMs:number):DisplaySlide[]{
 if(!Number.isFinite(nowMs))return[];
 return slides.filter(s=>slideEligible(s,nowMs));
}
export function churchLocal(value:string):string{
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:CHURCH_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function churchTimeToUtc(wall:string,offset:ChurchOffset):string{
 if(!local.test(wall))throw Error('Choose a valid Las Vegas date and time.');
 const parsed=Date.parse(wall+':00'+offset);if(!Number.isFinite(parsed))throw Error('Invalid time.');
 if(churchLocal(new Date(parsed).toISOString())!==wall)throw Error('The time does not exist in Las Vegas with that UTC offset (DST).');
 return new Date(parsed).toISOString();
}
// Compared at minute precision: a current time with seconds would otherwise never match and wrongly read as standard time.
export function offsetForChurchTime(value:string):ChurchOffset{
 const wall=churchLocal(value),minute=Math.floor(Date.parse(value)/60000)*60000;
 try{if(Date.parse(churchTimeToUtc(wall,'-07:00'))===minute)return '-07:00';}catch{}
 return '-08:00';
}
// Las Vegas wall-clock text for manager screens (for example "Oct 14, 2026, 6:00 PM").
export function churchDateTime(value:string):string{return new Date(value).toLocaleString('en-US',{timeZone:CHURCH_TIME_ZONE,dateStyle:'medium',timeStyle:'short'});}
