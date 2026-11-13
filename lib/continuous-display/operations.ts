import {CHURCH_TIME_ZONE,isInt,isRecord,parseDisplayRooms,parseDisplaySnapshot,slideEligible,type DisplayRooms,type DisplaySnapshot,type DisplayScreen,type DisplaySlide} from './live-contract.ts';

export type OperatingDay={day:number;enabled:boolean;start:number;end:number};
export type OperatingHours=OperatingDay[];
export type DisplayMotionMode='standard'|'calm'|'lively'|'still';
export const DISPLAY_MOTION_MODES:readonly DisplayMotionMode[]=['standard','calm','lively','still'];
export function parseDisplayMotionMode(value:unknown):DisplayMotionMode {
 if(value===undefined)return 'standard';
 if((DISPLAY_MOTION_MODES as readonly unknown[]).includes(value))return value as DisplayMotionMode;
 throw Error('Unapproved motion setting.');
}
export type DisplayScreenR2=DisplayScreen&{
 operatingHours:OperatingHours;configVersion:number;motionMode?:DisplayMotionMode;publishedItems:DisplaySlide[];
 overrideSlideId:string|null;overrideUntil:string|null;
};
export type DisplaySnapshotR2=DisplaySnapshot&{
 operatingHours:OperatingHours;motionMode:DisplayMotionMode;overrideSlideId:string|null;overrideUntil:string|null;
 /** Present only when a published slide is a rooms slide. */
 rooms:DisplayRooms|null;
};
const weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function parseOperatingHours(raw:unknown):OperatingHours {
 if(!Array.isArray(raw)||(raw.length!==0&&raw.length!==7))
  throw Error('Provide all seven days or choose anytime playback.');
 const seen=new Set<number>();
 return raw.map((item:unknown)=>{
  if(!isRecord(item)||Object.keys(item).length!==4||
    Object.keys(item).some(k=>!['day','enabled','start','end'].includes(k))||
    !isInt(item.day,0,6)||seen.has(item.day)||
    typeof item.enabled!=='boolean'||!isInt(item.start,0,1439)||
    !isInt(item.end,1,1440)||item.end<=item.start)
   throw Error('Operating hours must have seven distinct valid days.');
  seen.add(item.day);
  return {day:item.day,enabled:item.enabled,start:item.start,end:item.end};
 });
}
export function standardOperatingHours():OperatingHours {
 return weekday.map((_,day)=>({day,enabled:true,start:420,end:1380}));
}
export function withinOperatingHours(hours:OperatingHours,epochMs:number):boolean {
 if(!Number.isFinite(epochMs))return false;
 if(hours.length===0)return true;
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:CHURCH_TIME_ZONE,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).formatToParts(epochMs).map(part=>[part.type,part.value]));
 const day=weekday.indexOf(p.weekday),minute=Number(p.hour)*60+Number(p.minute);
 const entry=hours.find(value=>value.day===day);
 return Boolean(entry?.enabled&&minute>=entry.start&&minute<entry.end);
}
export function timeValue(minute:number):string {
 if(!isInt(minute,0,1440))return '07:00';
 if(minute===1440)return '23:59';
 return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
}
export function minuteValue(value:string):number {
 if(value==='24:00')return 1440;
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Choose a valid operating time.');
 const [h,m]=value.split(':').map(Number);return h*60+m;
}

export function parseDisplaySnapshotR2(raw:unknown):DisplaySnapshotR2 {
 if(!isRecord(raw)||Object.keys(raw).some(k=>!
 ['paired','screen','version','serverTime','leaseUntil','slides','operatingHours','overrideSlideId','overrideUntil','motionMode','rooms'].includes(k)))
  throw Error('Unexpected private screen metadata.');
 const base=parseDisplaySnapshot(raw);
 const hours=parseOperatingHours(raw.operatingHours??[]);
 const motionMode=parseDisplayMotionMode(raw.motionMode);
 const overrideId=raw.overrideSlideId??null,overrideUntil=raw.overrideUntil??null;
 if((overrideId===null)!==(overrideUntil===null))throw Error('Incomplete temporary notice.');
 if(overrideId!==null){
  if(typeof overrideId!=='string'||!base.slides.some(s=>s.id===overrideId)||
   typeof overrideUntil!=='string'||!/^\d{4}-\d\d-\d\dT/.test(overrideUntil)||
   !Number.isFinite(Date.parse(overrideUntil))||Date.parse(overrideUntil)<=Date.parse(base.serverTime)||
   Date.parse(overrideUntil)>Date.parse(base.serverTime)+1800000)
   throw Error('Expired or unauthorized temporary notice.');
 }
 return {...base,operatingHours:hours,motionMode,overrideSlideId:overrideId as string|null,
  overrideUntil:overrideUntil as string|null,rooms:parseDisplayRooms(raw.rooms)};
}
export function overrideForDisplay(snapshot:DisplaySnapshotR2,nowMs:number):DisplaySlide|null {
 if(!withinOperatingHours(snapshot.operatingHours,nowMs)||!snapshot.overrideSlideId||!snapshot.overrideUntil||
    nowMs>=Date.parse(snapshot.overrideUntil))return null;
 return snapshot.slides.find(s=>s.id===snapshot.overrideSlideId&&slideEligible(s,nowMs))??null;
}
