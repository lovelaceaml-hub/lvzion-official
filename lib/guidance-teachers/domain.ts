/** Guidance Teachers is independent of Worship Duty. Calendar dates/times are Las Vegas civil time. */
export const TIME_ZONE = 'America/Los_Angeles';
export const LOCATIONS = [{id:'main',name:'Main Sanctuary'},{id:'small',name:'Small Sanctuary'}] as const;
export type Location = typeof LOCATIONS[number]['id'];
export type Slot = {location:Location;position:1|2;memberId:string|null;name:string|null};
export type Service = {id:string;title:string;date:string;startTime:string;endTime:string;version:number;slots:Slot[]};
export type Workspace = {date:string;viewerId:string;canView:boolean;canManage:boolean;services:Service[]};
export type Candidate = {id:string;name:string;unavailable:boolean};
export type Candidates = {serviceId:string;members:Candidate[];hasMore:boolean};
export class GuidanceError extends Error {
 status:number;code:string;
 constructor(message:string,status=400,code='invalid'){super(message);this.name='GuidanceError';this.status=status;this.code=code;}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new GuidanceError('Invalid data.');return value as Record<string,unknown>;}
function fields(p:Record<string,unknown>,keys:string[]){if(Object.keys(p).some(k=>!keys.includes(k))||keys.some(k=>!(k in p)))throw new GuidanceError('Unexpected or missing field.');}
function text(v:unknown,max:number){if(typeof v!=='string'||v.length>max)throw new GuidanceError('Invalid text.');return v;}
export function identifier(v:unknown):string{const s=text(v,36);if(!uuid.test(s))throw new GuidanceError('Invalid identifier.');return s;}
export function dateValue(v:unknown):string{const s=text(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00:00Z'))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw new GuidanceError('Choose a valid date.');return s;}
export function clockValue(v:unknown):string{const s=text(v,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))throw new GuidanceError('Choose a valid time.');return s;}
function version(v:unknown):number{if(!Number.isSafeInteger(v)||(v as number)<0||(v as number)>2147483646)throw new GuidanceError('Refresh the schedule before saving.');return v as number;}
function location(v:unknown):Location{if(v!=='main'&&v!=='small')throw new GuidanceError('Unknown sanctuary.');return v;}
function position(v:unknown):1|2{if(v!==1&&v!==2)throw new GuidanceError('Unknown teacher slot.');return v;}
export function today(now=new Date()):string {const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');}
export function addDays(date:string,n:number):string{const d=new Date(dateValue(date)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function formatDate(date:string,options:Intl.DateTimeFormatOptions={weekday:'long',month:'long',day:'numeric',year:'numeric'}):string{return new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(dateValue(date)+'T12:00:00Z'));}
export function formatTime(time:string):string{return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date('2000-01-01T'+clockValue(time)+':00Z'));}
export type Command =
 | {op:'create';requestId:string;title:string;date:string;startTime:string;endTime:string}
 | {op:'edit';requestId:string;serviceId:string;expectedVersion:number;title:string;date:string;startTime:string;endTime:string}
 | {op:'assign';requestId:string;serviceId:string;expectedVersion:number;location:Location;position:1|2;memberId:string|null}
 | {op:'cancel';requestId:string;serviceId:string;expectedVersion:number};
export function parseCommand(value:unknown):Command{
 const p=object(value),requestId=identifier(p.requestId);
 if(p.op==='create'||p.op==='edit'){
  fields(p,['op','requestId','title','date','startTime','endTime',...(p.op==='edit'?['serviceId','expectedVersion']:[])]);
  const title=text(p.title,80).trim(),date=dateValue(p.date),startTime=clockValue(p.startTime),endTime=clockValue(p.endTime);
  if(title.length<2||/[\u0000-\u001f\u007f]/.test(title))throw new GuidanceError('Enter a service name of 2–80 characters.');
  if(endTime<=startTime)throw new GuidanceError('End time must be after start time on the same day.');
  if(p.op==='create')return {op:'create',requestId,title,date,startTime,endTime};
  return {op:'edit',requestId,title,date,startTime,endTime,serviceId:identifier(p.serviceId),expectedVersion:version(p.expectedVersion)};
 }
 if(p.op==='assign'){
  fields(p,['op','requestId','serviceId','expectedVersion','location','position','memberId']);
  return {op:'assign',requestId,serviceId:identifier(p.serviceId),expectedVersion:version(p.expectedVersion),location:location(p.location),position:position(p.position),memberId:p.memberId===null?null:identifier(p.memberId)};
 }
 if(p.op==='cancel'){
  fields(p,['op','requestId','serviceId','expectedVersion']);
  return {op:'cancel',requestId,serviceId:identifier(p.serviceId),expectedVersion:version(p.expectedVersion)};
 }
 throw new GuidanceError('Unknown action.');
}
export function parseWorkspace(value:unknown):Workspace{
 const p=object(value),date=dateValue(p.date),viewerId=identifier(p.viewerId);
 if(typeof p.canView!=='boolean'||typeof p.canManage!=='boolean'||!Array.isArray(p.services)||p.services.length>48||(!p.canView&&p.services.length)||(p.canManage&&!p.canView))throw new GuidanceError('Schedule could not be verified.',503,'unavailable');
 const services:Service[]=p.services.map(raw=>{
  const s=object(raw),id=identifier(s.id),title=text(s.title,80),day=dateValue(s.date),startTime=clockValue(s.startTime),endTime=clockValue(s.endTime);
  if(day!==date||!title||endTime<=startTime||!Array.isArray(s.slots)||s.slots.length!==4)throw new GuidanceError('Service could not be verified.',503,'unavailable');
  const slots:Slot[]=s.slots.map(rawSlot=>{const a=object(rawSlot);const memberId=a.memberId===null?null:identifier(a.memberId),name=a.name===null?null:text(a.name,160);if((memberId===null)!==(name===null)||name==='')throw new GuidanceError('Assignment could not be verified.',503,'unavailable');return {location:location(a.location),position:position(a.position),memberId,name};});
  if(new Set(slots.map(a=>a.location+':'+a.position)).size!==4||new Set(slots.filter(a=>a.memberId).map(a=>a.memberId)).size!==slots.filter(a=>a.memberId).length)throw new GuidanceError('Assignment slots could not be verified.',503,'unavailable');
  return {id,title,date:day,startTime,endTime,version:version(s.version),slots};
 });
 if(new Set(services.map(s=>s.id)).size!==services.length)throw new GuidanceError('Duplicate services.',503,'unavailable');
 return {date,viewerId,canView:p.canView,canManage:p.canManage,services};
}
export function parseCandidates(value:unknown):Candidates{
 const p=object(value),serviceId=identifier(p.serviceId);
 if(!Array.isArray(p.members)||p.members.length>50||typeof p.hasMore!=='boolean')throw new GuidanceError('Members could not be verified.',503,'unavailable');
 const members=p.members.map(raw=>{const m=object(raw);if(typeof m.unavailable!=='boolean')throw new GuidanceError('Invalid availability.',503,'unavailable');return {id:identifier(m.id),name:text(m.name,160),unavailable:m.unavailable};});
 return {serviceId,members,hasMore:p.hasMore};
}
export function databaseError(code?:string):GuidanceError{
 if(code==='42501')return new GuidanceError('You do not have permission for this action.',403,'permission');
 if(code==='40001')return new GuidanceError('This service changed on another device. Refresh before saving.',409,'stale');
 if(code==='23505'||code==='23P01')return new GuidanceError('This person is already assigned during that service, or the service already exists.',409,'conflict');
 if(code==='23514')return new GuidanceError('This change conflicts with the schedule. Refresh and check the times and assignments.',409,'conflict');
 if(['22023','22P02','22007','22008'].includes(code??''))return new GuidanceError('Check the details and try again.');
 return new GuidanceError('The schedule is unavailable. No save has been confirmed.',503,'unavailable');
}
export function isFuture(service:Pick<Service,'date'|'startTime'>,now=new Date()):boolean{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const clock=['hour','minute'].map(k=>parts.find(p=>p.type===k)?.value).join(':');
 return service.date+'T'+service.startTime>today(now)+'T'+clock;
}
