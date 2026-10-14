/**
 * LV Zion Official / Study Room Reservation policy draft.
 * Independent TypeScript implementation for fictional review only.
 * Reference: the separate legacy study-room-scheduler; no imports, network calls, or database access.
 */
function addCalendarDays(day:string,offset:number):string {
 const date=new Date(day+'T12:00:00Z');
 if(!Number.isFinite(date.getTime()))throw new Error('Invalid calendar date');
 date.setUTCDate(date.getUTCDate()+offset);
 return date.toISOString().slice(0,10);
}

export type ResourceKind = 'room' | 'whiteboard' | 'tv';
export type BookingPurpose = 'contact' | 'new-member' | 'other';
export type BookingStatus = 'active' | 'cancelled';
export type BookingOwner = 'demo-self' | 'demo-other' | 'admin';

export type ResourceUnit = { id: string; label: string; note?: string };
export type Reservation = {
 id: string; date: string; start: string; end: string; purpose: BookingPurpose | 'blocked';
 detail: string; memberLabel: string; status: BookingStatus; owner: BookingOwner;
 assignments: Partial<Record<ResourceKind,string>>;
};
export type BookingRequest = {
 date: string; start: string; end: string; purpose: BookingPurpose; detail: string;
 resources: ResourceKind[];
};
export type BookingContext = { today: string; localTime: string };
export type BookingCheck =
 | { ok: true; assignments: Partial<Record<ResourceKind,string>> }
 | { ok: false; code: string; message: string; assignments: Partial<Record<ResourceKind,string>> };

export const RESOURCES: Record<ResourceKind,{label:string;plural:string;units:readonly ResourceUnit[]}> = {
 room:{label:'Study room',plural:'Study rooms',units:[
  {id:'room-1',label:'Room 1'}, {id:'room-2',label:'Room 2'},
  {id:'room-3',label:'Room 3'}, {id:'room-4',label:'Room 4'}]},
 whiteboard:{label:'Whiteboard',plural:'Whiteboards',units:[
  {id:'wb-1',label:'Board 1',note:'Large'}, {id:'wb-2',label:'Board 2',note:'Large'},
  {id:'wb-3',label:'Board 3',note:'Large'}, {id:'wb-4',label:'Board 4',note:'Vertical'},
  {id:'wb-5',label:'Board 5',note:'Vertical'}]},
 tv:{label:'TV',plural:'TVs',units:[
  {id:'tv-1',label:'TV 1'}, {id:'tv-2',label:'TV 2'}, {id:'tv-3',label:'TV 3'}]}
};

export const RESOURCE_ORDER = ['room','whiteboard','tv'] as const;
export const PURPOSES: Record<BookingPurpose,{name:string;detailLabel:string;priority:number;maxLength:number}> = {
 contact:{name:'Contact',detailLabel:'Contact name',priority:3,maxLength:120},
 'new-member':{name:'New Member',detailLabel:'Member name',priority:2,maxLength:120},
 other:{name:'Other',detailLabel:'Purpose',priority:1,maxLength:240}
};

export const BOOKING_RULES = {
 open:'10:00',close:'23:00',slotMinutes:30,bookingDays:4,timeZone:'America/Los_Angeles'
} as const;

const regularServiceBlocks: Record<number,readonly {start:string;end:string;label:string}[]> = {
 0:[],1:[],2:[{start:'19:30',end:'20:30',label:'Evening service'}],3:[],4:[],5:[],
 6:[
  {start:'10:00',end:'11:00',label:'Morning service'},
  {start:'14:30',end:'15:30',label:'Afternoon service'},
  {start:'19:30',end:'20:30',label:'Evening service'}
 ]
};
const localDate=/^\d{4}-\d{2}-\d{2}$/;
const gridClock=/^([01]\d|2[0-3]):(00|30)$/;
const validPurpose=(value:unknown):value is BookingPurpose=>typeof value==='string'&&Object.prototype.hasOwnProperty.call(PURPOSES,value);
const validResource=(value:unknown):value is ResourceKind=>typeof value==='string'&&Object.prototype.hasOwnProperty.call(RESOURCES,value);

export function dateIsValid(key:string):boolean{
 if(!localDate.test(key))return false;
 const d=new Date(key+'T12:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===key;
}
export function minutes(clock:string):number{
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))throw new Error('Invalid clock value');
 return Number(clock.slice(0,2))*60+Number(clock.slice(3,5));
}
export function hhmm(total:number):string{
 if(!Number.isInteger(total)||total<0||total>=24*60)throw new Error('Invalid clock minutes');
 return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
export function overlaps(aStart:string,aEnd:string,bStart:string,bEnd:string):boolean{
 return minutes(aStart)<minutes(bEnd)&&minutes(bStart)<minutes(aEnd);
}
export function bookingWindow(today:string):string[]{
 if(!dateIsValid(today))throw new Error('Invalid booking start date');
 return Array.from({length:BOOKING_RULES.bookingDays},(_,i)=>addCalendarDays(today,i));
}
export function serviceBlocks(date:string):readonly {start:string;end:string;label:string}[]{
 if(!dateIsValid(date))throw new Error('Invalid service date');
 const weekday=new Date(date+'T12:00:00Z').getUTCDay();
 return regularServiceBlocks[weekday]??[];
}
export function timeOptions():string[]{
 const options:string[]=[];for(let n=minutes(BOOKING_RULES.open);n<=minutes(BOOKING_RULES.close);n+=BOOKING_RULES.slotMinutes)options.push(hhmm(n));
 return options;
}
export function freeUnits(kind:ResourceKind,date:string,start:string,end:string,bookings:readonly Reservation[]):ResourceUnit[]{
 return RESOURCES[kind].units.filter(u=>!bookings.some(b=>b.status==='active'&&b.date===date&&b.assignments[kind]===u.id&&overlaps(start,end,b.start,b.end)));
}
export function occupiedUnits(kind:ResourceKind,date:string,start:string,end:string,bookings:readonly Reservation[]):number{
 return RESOURCES[kind].units.length-freeUnits(kind,date,start,end,bookings).length;
}

function invalid(code:string,message:string):BookingCheck{return {ok:false,code,message,assignments:{}};}
/**
 * Previews use ordinary free-unit allocation only.
 * The legacy scheduler's priority displacement/Force override cannot be
 * silently carried into a named-member, audited access model.
 */
export function checkBooking(input:BookingRequest,bookings:readonly Reservation[],context:BookingContext):BookingCheck{
 if(!dateIsValid(context.today)||!dateIsValid(input.date)||!bookingWindow(context.today).includes(input.date))
  return invalid('date','Choose a day within the four-day booking window.');
 if(!gridClock.test(input.start)||!gridClock.test(input.end)||
    minutes(input.start)<minutes(BOOKING_RULES.open)||minutes(input.end)>minutes(BOOKING_RULES.close)||
    minutes(input.end)<=minutes(input.start))
  return invalid('time','Select a valid future start and end on the half-hour grid.');
 if(input.date===context.today&&minutes(input.start)<=minutes(context.localTime))
  return invalid('started','This time has already started. Choose a future slot.');
 if(!validPurpose(input.purpose))return invalid('purpose','Choose Contact, New Member, or Other.');
 if(!input.detail.trim()||input.detail.trim().length>PURPOSES[input.purpose].maxLength)
  return invalid('detail',`Enter a ${PURPOSES[input.purpose].detailLabel.toLowerCase()} within the allowed length.`);
 if(!Array.isArray(input.resources)||input.resources.length===0||new Set(input.resources).size!==input.resources.length||
    input.resources.some(r=>!validResource(r)))
  return invalid('resources','Select at least one valid resource without duplicates.');
 const service=serviceBlocks(input.date).find(s=>overlaps(input.start,input.end,s.start,s.end));
 if(service)return invalid('service',`Reservations cannot overlap ${service.label.toLowerCase()}.`);
 const assignments:Partial<Record<ResourceKind,string>>={};
 for(const type of RESOURCE_ORDER.filter(r=>input.resources.includes(r))){
  const candidate=freeUnits(type,input.date,input.start,input.end,bookings)[0];
  if(!candidate)return invalid('unavailable',`No ${RESOURCES[type].label.toLowerCase()} is free for the whole selected time. Choose another time. Priority displacement and Force override require separate review.`);
  assignments[type]=candidate.id;
 }
 return {ok:true,assignments};
}
export function formattedTime(value:string):string{
 const time=minutes(value),h=Math.floor(time/60),m=time%60;
 return String(h%12||12)+(m?':'+String(m).padStart(2,'0'):'')+(h>=12?' PM':' AM');
}
export function sampleReservations(today:string):Reservation[]{
 // Synthetic reservations only; no actual church names or schedule records.
 const next=addCalendarDays(today,1);
 return [
 {id:'example-1',date:today,start:'13:00',end:'14:30',purpose:'contact',detail:'Example contact',memberLabel:'Demo Member A',status:'active',owner:'demo-other',assignments:{room:'room-1',whiteboard:'wb-1'}},
 {id:'example-2',date:today,start:'15:00',end:'16:00',purpose:'other',detail:'Example lesson',memberLabel:'Demo Member B',status:'active',owner:'demo-other',assignments:{room:'room-2',tv:'tv-1'}},
 {id:'example-hold',date:today,start:'17:30',end:'18:30',purpose:'blocked',detail:'',memberLabel:'Reserved',status:'active',owner:'admin',assignments:{room:'room-4'}},
 {id:'example-3',date:next,start:'11:00',end:'12:00',purpose:'new-member',detail:'Example new member',memberLabel:'Demo Member C',status:'active',owner:'demo-other',assignments:{room:'room-3',tv:'tv-2'}},
 ];
}
