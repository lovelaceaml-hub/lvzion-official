import {churchLocal,parseDisplaySnapshot,type DisplaySnapshot,type DisplayScreen,type DisplaySlide} from './live-contract.ts';

export type OperatingDay={day:number;enabled:boolean;start:number;end:number};
export type OperatingHours=OperatingDay[];
export type DisplayScreenR2=DisplayScreen&{
 operatingHours:OperatingHours;configVersion:number;publishedItems:DisplaySlide[];
 overrideSlideId:string|null;overrideUntil:string|null;
};
export type DisplaySnapshotR2=DisplaySnapshot&{
 operatingHours:OperatingHours;overrideSlideId:string|null;overrideUntil:string|null;
};
const weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const own=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;

export function parseOperatingHours(raw:unknown):OperatingHours {
 if(!Array.isArray(raw)||(raw.length!==0&&raw.length!==7))
  throw Error('Provide all seven days or choose anytime playback.');
 const seen=new Set<number>();
 return raw.map((item:unknown)=>{
  if(!own(item)||Object.keys(item).length!==4||
    Object.keys(item).some(k=>!['day','enabled','start','end'].includes(k))||
    !integer(item.day,0,6)||seen.has(item.day as number)||
    typeof item.enabled!=='boolean'||!integer(item.start,0,1439)||
    !integer(item.end,1,1440)||(item.end as number)<=(item.start as number))
   throw Error('Operating hours must have seven distinct valid days.');
  seen.add(item.day as number);
  return {day:item.day as number,enabled:item.enabled,start:item.start as number,end:item.end as number};
 });
}
export function standardOperatingHours():OperatingHours {
 return weekday.map((_,day)=>({day,enabled:true,start:420,end:1380}));
}
export function withinOperatingHours(hours:OperatingHours,epochMs:number):boolean {
 if(!Number.isFinite(epochMs))return false;
 if(hours.length===0)return true;
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:'America/Los_Angeles',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).formatToParts(epochMs).map(part=>[part.type,part.value]));
 const day=weekday.indexOf(p.weekday),minute=Number(p.hour)*60+Number(p.minute);
 const entry=hours.find(value=>value.day===day);
 return Boolean(entry?.enabled&&minute>=entry.start&&minute<entry.end);
}
export function timeValue(minute:number):string {
 if(!integer(minute,0,1440))return '07:00';
 if(minute===1440)return '23:59';
 return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
}
export function minuteValue(value:string):number {
 if(value==='24:00')return 1440;
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Choose a valid operating time.');
 const [h,m]=value.split(':').map(Number);return h*60+m;
}

export function parseDisplaySnapshotR2(raw:unknown):DisplaySnapshotR2 {
 if(!own(raw)||Object.keys(raw).some(k=>!
 ['paired','screen','version','serverTime','leaseUntil','slides','operatingHours','overrideSlideId','overrideUntil'].includes(k)))
  throw Error('Unexpected private screen metadata.');
 const base=parseDisplaySnapshot(raw);
 const hours=parseOperatingHours(raw.operatingHours??[]);
 const overrideId=raw.overrideSlideId??null,overrideUntil=raw.overrideUntil??null;
 if((overrideId===null)!==(overrideUntil===null))throw Error('Incomplete temporary notice.');
 if(overrideId!==null){
  if(typeof overrideId!=='string'||!base.slides.some(s=>s.id===overrideId)||
   typeof overrideUntil!=='string'||!/^\d{4}-\d\d-\d\dT/.test(overrideUntil)||
   !Number.isFinite(Date.parse(overrideUntil))||Date.parse(overrideUntil)<=Date.parse(base.serverTime)||
   Date.parse(overrideUntil)>Date.parse(base.serverTime)+1800000)
   throw Error('Expired or unauthorized temporary notice.');
 }
 return {...base,operatingHours:hours,overrideSlideId:overrideId as string|null,
  overrideUntil:overrideUntil as string|null};
}
export function overrideForDisplay(snapshot:DisplaySnapshotR2,nowMs:number):DisplaySlide|null {
 if(!withinOperatingHours(snapshot.operatingHours,nowMs)||!snapshot.overrideSlideId||!snapshot.overrideUntil||
    nowMs>=Date.parse(snapshot.overrideUntil))return null;
 return snapshot.slides.find(s=>s.id===snapshot.overrideSlideId&&
  (!s.startsAt||Date.parse(s.startsAt)<=nowMs)&&(!s.endsAt||nowMs<Date.parse(s.endsAt)))??null;
}
export function previewChurchTime(value:string):string {
 const wall=churchLocal(value);return wall.replace('T',' ');
}
