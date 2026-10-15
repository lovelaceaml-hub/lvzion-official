/** Shared presentation validation. PostgreSQL remains authoritative for live bookings. */
export type Kind='room'|'whiteboard'|'tv';
export type Purpose='contact'|'new-member'|'other';
export type Resource={id:string;name:string;kind:Kind;active?:boolean;version?:number};
export type Block={start:number;end:number;label:string;resourceId?:string|null};
export type Booking={id:string;resourceId:string;resourceIds?:string[];resourceNames?:string[];createdAt?:string;cancelledAt?:string;cancelReason?:string;day:string;start:number;end:number;state:'confirmed'|'cancelled'|'ended';version?:number;originalEnd?:number;mine:boolean;label:string;purpose?:Purpose;detail?:string;hold:boolean};
export type Schedule={day:string;today:string;nowMinute:number;open:number;close:number;step:number;horizon:number;resources:Resource[];bookings:Booking[];blocks:Block[];canManage:boolean;bookingsOpen?:boolean};
export type BookingCommand={requestId:string;action:'reserve'|'cancel'|'hold'|'reschedule'|'end_early';resourceId?:string;resourceIds?:string[];day?:string;start?:number;end?:number;purpose?:Purpose;detail?:string;bookingId?:string;reason?:string;expectedVersion?:number};

export const purposes=[{id:'contact',label:'Contact',detail:'Contact name'},{id:'new-member',label:'New Member',detail:'Member name'},{id:'other',label:'Other',detail:'Purpose'}] as const;
export const kindLabels:Record<Kind,string>={room:'Room',whiteboard:'Whiteboard',tv:'TV'};
export const uuidPattern=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

/** Service day: 10:00 AM to 11:00 PM Las Vegas time, on half-hour boundaries. */
export const SERVICE_OPEN=600,SERVICE_CLOSE=1380,SLOT_MINUTES=30;
export const startMinutes=Array.from({length:26},(_,i)=>SERVICE_OPEN+i*SLOT_MINUTES);
export const endMinutes=Array.from({length:26},(_,i)=>SERVICE_OPEN+SLOT_MINUTES+i*SLOT_MINUTES);
export function validServiceRange(start:unknown,end:unknown):boolean{
 return Number.isInteger(start)&&Number.isInteger(end)&&(start as number)>=SERVICE_OPEN&&(end as number)<=SERVICE_CLOSE&&(start as number)<(end as number)&&(start as number)%SLOT_MINUTES===0&&(end as number)%SLOT_MINUTES===0;
}
export function validReason(value:unknown):value is string{return typeof value==='string'&&value.trim().length>=5&&value.length<=240;}
export function isPlainObject(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}

export function dayKey(value:string):string{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Choose a valid date.');
 const d=new Date(value+'T12:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('Choose a valid date.');
 return value;
}
export function addDay(day:string,n:number):string{const d=new Date(dayKey(day)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function vegasDay(now=new Date()):string{
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));
 return `${p.year}-${p.month}-${p.day}`;
}
export function clock(min:number):string{return `${(Math.floor(min/60)+11)%12+1}:${String(min%60).padStart(2,'0')} ${min>=720?'PM':'AM'}`;}
export function overlap(a:number,b:number,c:number,d:number):boolean{return a<d&&c<b;}
/** First whole slot boundary at or after now; early release frees time from here. */
export function nextSlot(nowMinute:number,step=SLOT_MINUTES):number{return Math.ceil(nowMinute/step)*step;}

/** One booking can occupy one unit of each kind; old single-resource records remain valid. */
export function bookingResources(b:Booking):string[]{return b.resourceIds??[b.resourceId];}
export function resourceNames(resources:Resource[],ids:string[],fallback=''):string{return ids.map(id=>resources.find(r=>r.id===id)?.name??fallback).join(' + ');}
export function purposeLabel(id:Purpose|undefined):string|undefined{return purposes.find(p=>p.id===id)?.label;}

export function validRange(s:Schedule,selection:string|string[],start:number,end:number,excludeId?:string):boolean{
 const ids=typeof selection==='string'?[selection]:selection;
 const kinds=ids.map(id=>s.resources.find(r=>r.id===id&&r.active!==false)?.kind);
 if(!ids.length||ids.length>3||kinds.some(k=>!k)||new Set(kinds).size!==ids.length)return false;
 const inWindow=s.day>=s.today&&s.day<addDay(s.today,s.horizon);
 const onGrid=Number.isInteger(start)&&Number.isInteger(end)&&start>=s.open&&end<=s.close&&start<end&&start%s.step===0&&end%s.step===0;
 const notPast=!(s.day===s.today&&start<s.nowMinute);
 const blocked=s.blocks.some(b=>(!b.resourceId||ids.includes(b.resourceId))&&overlap(start,end,b.start,b.end));
 const taken=s.bookings.some(b=>b.id!==excludeId&&(b.state==='confirmed'||b.state==='ended')&&bookingResources(b).some(id=>ids.includes(id))&&b.day===s.day&&overlap(start,end,b.start,b.end));
 return inWindow&&onGrid&&notPast&&!blocked&&!taken;
}
export function startOptions(s:Schedule,resourceId:string|string[],excludeId?:string):number[]{
 const result=[];
 for(let n=s.open;n<s.close;n+=s.step)if(validRange(s,resourceId,n,n+s.step,excludeId))result.push(n);
 return result;
}
export function endOptions(s:Schedule,resourceId:string|string[],start:number,excludeId?:string):number[]{
 const result=[];
 for(let n=start+s.step;n<=s.close;n+=s.step){if(!validRange(s,resourceId,start,n,excludeId))break;result.push(n);}
 return result;
}

const bookingFields:Record<string,string[]>={
 reserve:['resourceId','resourceIds','day','start','end','purpose','detail'],
 hold:['resourceId','resourceIds','day','start','end','reason'],
 cancel:['bookingId','reason','expectedVersion'],
 end_early:['bookingId','reason','expectedVersion'],
 reschedule:['bookingId','reason','expectedVersion','resourceId','resourceIds','day','start','end','purpose','detail']
};
const changesExisting=(action:string)=>action==='cancel'||action==='end_early'||action==='reschedule';
export function parseBookingCommand(raw:unknown):BookingCommand{
 if(!isPlainObject(raw))throw Error('Invalid reservation request.');
 const p=raw,action=p.action;
 if(typeof action!=='string'||!Object.hasOwn(bookingFields,action)||typeof p.requestId!=='string'||!uuidPattern.test(p.requestId))throw Error('Invalid reservation request.');
 if(Object.keys(p).some(k=>!['requestId','action',...bookingFields[action]].includes(k)))throw Error('Unexpected reservation field.');
 if(changesExisting(action)){
  if(typeof p.bookingId!=='string'||!uuidPattern.test(p.bookingId)||!Number.isSafeInteger(p.expectedVersion)||(p.expectedVersion as number)<1)throw Error('Refresh the reservation before changing it.');
 }
 if(action!=='reserve'&&!validReason(p.reason))throw Error('Give a reason (5 to 240 characters).');
 if(action==='reserve'||action==='hold'||action==='reschedule'){
  const ids=p.resourceIds===undefined?[p.resourceId]:p.resourceIds;
  if((p.resourceIds!==undefined&&p.resourceId!==undefined)||!Array.isArray(ids)||ids.length<1||ids.length>3||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!uuidPattern.test(id))||typeof p.day!=='string')throw Error('Choose one to three distinct resources and a date.');
  dayKey(p.day);
  if(!validServiceRange(p.start,p.end))throw Error('Choose a valid 30-minute time range.');
  if(action!=='hold'&&(!purposes.some(x=>x.id===p.purpose)||typeof p.detail!=='string'||!p.detail.trim()||p.detail.length>(p.purpose==='other'?240:120)))throw Error('Complete the reservation purpose.');
 }
 return p as unknown as BookingCommand;
}

export function serviceBlocks(day:string):Block[]{
 const weekday=new Date(dayKey(day)+'T12:00:00Z').getUTCDay();
 if(weekday===6)return [{start:600,end:660,label:'Morning service'},{start:870,end:930,label:'Afternoon service'},{start:1170,end:1230,label:'Evening service'}];
 if(weekday===2)return [{start:1170,end:1230,label:'Evening service'}];
 return [];
}
/** Fictional test fixture for unit and browser tests; never imported by server handlers. */
export function demoSchedule(day:string,today=day,manager=false):Schedule{
 const resources:Resource[]=[];
 for(const[kind,count,prefix,offset]of [['room',4,'Room',0],['whiteboard',5,'Board',10],['tv',3,'TV',20]] as const)
  for(let n=1;n<=count;n++)resources.push({id:`92000000-0000-4000-8000-${String(n+offset).padStart(12,'0')}`,name:`${prefix} ${n}`,kind});
 return{day,today,nowMinute:540,open:600,close:1380,step:30,horizon:4,resources,canManage:manager,blocks:serviceBlocks(day),bookings:[
  {id:'93000000-0000-4000-8000-000000000001',resourceId:resources[0].id,day,start:720,end:780,state:'confirmed',mine:false,label:'Reserved',hold:false},
  {id:'93000000-0000-4000-8000-000000000002',resourceId:resources[1].id,day,start:960,end:1020,state:'confirmed',mine:true,label:'You · fictional member',purpose:'contact',detail:'Example contact',hold:false}
 ]};
}
/** In-memory mirror of the database booking rules, used only by test fixtures. */
export function simulate(s:Schedule,raw:unknown):Schedule{
 const p=parseBookingCommand(raw),next=structuredClone(s),ids=p.resourceIds??[p.resourceId!];
 if(changesExisting(p.action)){
  const b=next.bookings.find(x=>x.id===p.bookingId);
  if(!b||(!b.mine&&!s.canManage)||(b.hold&&!s.canManage)||b.state!=='confirmed'||b.day<s.today||(b.day===s.today&&b.end<=s.nowMinute))throw Error('This reservation cannot be changed.');
  if(p.expectedVersion!==(b.version??1))throw Error('Reservation changed; refresh first.');
  if(p.action==='cancel'){b.state='cancelled';b.cancelReason=p.reason?.trim();}
  else if(p.action==='end_early'){
   const release=nextSlot(s.nowMinute,s.step);
   if(b.hold||b.day!==s.today||b.start>=s.nowMinute||release<=b.start||release>=b.end)throw Error('No remaining full time slot can be released.');
   b.originalEnd=b.end;b.end=release;b.state='ended';
  }else{
   if(!p.resourceIds&&bookingResources(b).length>1)throw Error('Select all resources when changing a combined reservation.');
   if(b.hold||(b.day===s.today&&b.start<=s.nowMinute))throw Error('Only future reservations can be rescheduled.');
   if(p.day!==s.day||!validRange(s,ids,p.start!,p.end!,b.id))throw Error('That time is unavailable. Your original reservation is unchanged.');
   b.resourceId=ids[0];b.resourceIds=ids;b.day=p.day!;b.start=p.start!;b.end=p.end!;b.purpose=p.purpose;b.detail=p.detail?.trim();
  }
  b.version=(b.version??1)+1;return next;
 }
 if(p.action==='hold'&&!s.canManage)throw Error('Reservation-manager permission required.');
 if(p.day!==s.day||!validRange(s,ids,p.start!,p.end!))throw Error('That time is no longer available. Choose another.');
 next.bookings.push({id:crypto.randomUUID(),resourceId:ids[0],resourceIds:ids,day:s.day,start:p.start!,end:p.end!,version:1,state:'confirmed',mine:true,label:p.action==='hold'?'Unavailable':'You · fictional member',hold:p.action==='hold',...(p.action==='reserve'?{purpose:p.purpose,detail:p.detail?.trim()}:{})});
 return next;
}
