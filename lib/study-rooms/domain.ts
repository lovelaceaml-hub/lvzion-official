/** Shared presentation validation. PostgreSQL remains authoritative for live bookings. */
export const STUDY_ROOMS = {key:'study-rooms',name:'Study Room Reservation',route:'/modules/study-rooms',preview:'/study-rooms-preview',moduleId:'91000000-0000-4000-8000-000000000001'} as const;
export type Kind='room'|'whiteboard'|'tv';
export type Purpose='contact'|'new-member'|'other';
export type Resource={id:string;name:string;kind:Kind};
export type Block={start:number;end:number;label:string};
export type Booking={id:string;resourceId:string;day:string;start:number;end:number;state:'confirmed'|'cancelled';mine:boolean;label:string;purpose?:Purpose;detail?:string;hold:boolean};
export type Schedule={day:string;today:string;nowMinute:number;open:number;close:number;step:number;horizon:number;resources:Resource[];bookings:Booking[];blocks:Block[];canManage:boolean};
export type BookingCommand={requestId:string;action:'reserve'|'cancel'|'hold';resourceId?:string;day?:string;start?:number;end?:number;purpose?:Purpose;detail?:string;bookingId?:string;reason?:string};
export const purposes=[{id:'contact',label:'Contact',detail:'Contact name'},{id:'new-member',label:'New Member',detail:'Member name'},{id:'other',label:'Other',detail:'Purpose'}] as const;
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export function dayKey(value:string):string{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Choose a valid date.');const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('Choose a valid date.');return value;}
export function addDay(day:string,n:number):string{const d=new Date(dayKey(day)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function vegasDay(now=new Date()):string{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
export function clock(min:number):string{return `${(Math.floor(min/60)+11)%12+1}:${String(min%60).padStart(2,'0')} ${min>=720?'PM':'AM'}`;}
export function overlap(a:number,b:number,c:number,d:number):boolean{return a<d&&c<b;}
export function validRange(s:Schedule,resourceId:string,start:number,end:number):boolean{
 return s.resources.some(r=>r.id===resourceId)&&s.day>=s.today&&s.day<addDay(s.today,s.horizon)&&Number.isInteger(start)&&Number.isInteger(end)&&start>=s.open&&end<=s.close&&start<end&&start%s.step===0&&end%s.step===0&&!(s.day===s.today&&start<s.nowMinute)&&!s.blocks.some(b=>overlap(start,end,b.start,b.end))&&!s.bookings.some(b=>b.state==='confirmed'&&b.resourceId===resourceId&&b.day===s.day&&overlap(start,end,b.start,b.end));
}
export function startOptions(s:Schedule,resourceId:string):number[]{const result=[];for(let n=s.open;n<s.close;n+=s.step)if(validRange(s,resourceId,n,n+s.step))result.push(n);return result;}
export function endOptions(s:Schedule,resourceId:string,start:number):number[]{const result=[];for(let n=start+s.step;n<=s.close;n+=s.step){if(!validRange(s,resourceId,start,n))break;result.push(n);}return result;}
export function parseBookingCommand(raw:unknown):BookingCommand{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid reservation request.');const p=raw as Record<string,unknown>;
 if(typeof p.requestId!=='string'||!uuid.test(p.requestId)||!['reserve','cancel','hold'].includes(String(p.action)))throw Error('Invalid reservation request.');
 const fields=p.action==='cancel'?['requestId','action','bookingId','reason']:['requestId','action','resourceId','day','start','end','purpose','detail','reason'];
 if(Object.keys(p).some(k=>!fields.includes(k)))throw Error('Unexpected reservation field.');
 if(p.action==='cancel'){if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||typeof p.reason!=='string'||p.reason.trim().length<5||p.reason.length>240)throw Error('Give a cancellation reason.');}
 else{
  if(typeof p.resourceId!=='string'||!uuid.test(p.resourceId)||typeof p.day!=='string')throw Error('Choose a resource and date.');dayKey(p.day);
  if(!Number.isInteger(p.start)||!Number.isInteger(p.end)||(p.start as number)<600||(p.end as number)>1380||(p.start as number)>=(p.end as number)||(p.start as number)%30||(p.end as number)%30)throw Error('Choose a valid 30-minute time range.');
  if(p.action==='reserve'&&(!purposes.some(x=>x.id===p.purpose)||typeof p.detail!=='string'||!p.detail.trim()||p.detail.length>(p.purpose==='other'?240:120)))throw Error('Complete the reservation purpose.');
  if(p.action==='hold'&&(typeof p.reason!=='string'||p.reason.trim().length<5||p.reason.length>240))throw Error('Give a reason for the hold.');
 }
 return p as unknown as BookingCommand;
}
export function serviceBlocks(day:string):Block[]{const weekday=new Date(dayKey(day)+'T12:00:00Z').getUTCDay();return weekday===6?[{start:600,end:660,label:'Morning service'},{start:870,end:930,label:'Afternoon service'},{start:1170,end:1230,label:'Evening service'}]:weekday===2?[{start:1170,end:1230,label:'Evening service'}]:[];}
/** This record set is explicitly fictional and never imported by server handlers. */
export function demoSchedule(day:string,today=day,manager=false):Schedule{
 const resources:Resource[]=[];for(const[kind,count,prefix,offset]of [['room',4,'Room',0],['whiteboard',5,'Board',10],['tv',3,'TV',20]] as const)for(let n=1;n<=count;n++)resources.push({id:`92000000-0000-4000-8000-${String(n+offset).padStart(12,'0')}`,name:`${prefix} ${n}`,kind});
 return{day,today,nowMinute:540,open:600,close:1380,step:30,horizon:4,resources,canManage:manager,blocks:serviceBlocks(day),bookings:[{id:'93000000-0000-4000-8000-000000000001',resourceId:resources[0].id,day,start:720,end:780,state:'confirmed',mine:false,label:'Reserved',hold:false},{id:'93000000-0000-4000-8000-000000000002',resourceId:resources[1].id,day,start:960,end:1020,state:'confirmed',mine:true,label:'You · fictional member',purpose:'contact',detail:'Example contact',hold:false}]};
}
export function simulate(s:Schedule,raw:unknown):Schedule{
 const p=parseBookingCommand(raw);const next=structuredClone(s);
 if(p.action==='cancel'){const b=next.bookings.find(x=>x.id===p.bookingId);if(!b||(!b.mine&&!s.canManage)||(b.hold&&!s.canManage)||b.state!=='confirmed'||b.day<s.today||(b.day===s.today&&b.end<=s.nowMinute))throw Error('This reservation cannot be changed.');b.state='cancelled';return next;}
 if(p.action==='hold'&&!s.canManage)throw Error('Reservation-manager permission required.');
 if(p.day!==s.day||!validRange(s,p.resourceId!,p.start!,p.end!))throw Error('That time is no longer available. Choose another.');
 next.bookings.push({id:crypto.randomUUID(),resourceId:p.resourceId!,day:s.day,start:p.start!,end:p.end!,state:'confirmed',mine:true,label:p.action==='hold'?'Unavailable':'You · fictional member',hold:p.action==='hold',...(p.action==='reserve'?{purpose:p.purpose,detail:p.detail?.trim()}: {})});return next;
}
