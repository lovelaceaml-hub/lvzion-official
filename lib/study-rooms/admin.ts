import {dayKey,addDay,overlap,bookingResources,isPlainObject,uuidPattern,validReason,validServiceRange} from './domain.ts';
import type {Resource,Schedule} from './domain.ts';
export type Closure={id:string;resourceId:string|null;day:string;start:number;end:number;reason:string;active:boolean;version:number};
export type AdminData={resources:(Resource&{active:boolean;version:number})[];closures:Closure[]};
export type AdminCommand={requestId:string;action:'resource.update'|'closure.add'|'closure.remove';resourceId?:string;name?:string;active?:boolean;day?:string;start?:number;end?:number;id?:string;expectedVersion?:number;reason:string};

const adminFields:Record<string,string[]>={
 'resource.update':['resourceId','name','active','expectedVersion'],
 'closure.add':['resourceId','day','start','end'],
 'closure.remove':['id','expectedVersion']
};
export function parseAdminCommand(value:unknown):AdminCommand{
 if(!isPlainObject(value))throw Error('Invalid management request.');
 const p=value;
 if(typeof p.action!=='string'||!Object.hasOwn(adminFields,p.action)||typeof p.requestId!=='string'||!uuidPattern.test(p.requestId)||!validReason(p.reason))throw Error('Provide a valid action and reason.');
 if(Object.keys(p).some(k=>!['action','requestId','reason',...adminFields[p.action as string]].includes(k)))throw Error('Unexpected management field.');
 if(p.action!=='closure.add'&&(!Number.isSafeInteger(p.expectedVersion)||(p.expectedVersion as number)<1))throw Error('Refresh before changing this record.');
 if(p.action==='resource.update'){
  if(typeof p.resourceId!=='string'||!uuidPattern.test(p.resourceId)||typeof p.name!=='string'||p.name.trim().length<2||p.name.length>80||typeof p.active!=='boolean')throw Error('Invalid resource changes.');
 }else if(p.action==='closure.remove'){
  if(typeof p.id!=='string'||!uuidPattern.test(p.id))throw Error('Choose a closure.');
 }else{
  if(p.resourceId!==undefined&&(typeof p.resourceId!=='string'||(p.resourceId!==''&&!uuidPattern.test(p.resourceId))))throw Error('Choose a valid resource.');
  if(typeof p.day!=='string')throw Error('Choose a day.');
  dayKey(p.day);
  if(!validServiceRange(p.start,p.end))throw Error('Choose a valid 30-minute interval.');
 }
 return p as unknown as AdminCommand;
}

/** In-memory mirror of the database management rules, used only by test fixtures. */
export function simulateAdmin(data:AdminData,s:Schedule,raw:unknown):AdminData{
 if(!s.canManage)throw Error('Reservation-manager permission required.');
 const p=parseAdminCommand(raw),next=structuredClone(data);
 const future=s.bookings.filter(b=>b.state!=='cancelled'&&(b.day>s.today||(b.day===s.today&&b.end>s.nowMinute)));
 if(p.action==='resource.update'){
  const r=next.resources.find(x=>x.id===p.resourceId);
  if(!r)throw Error('Resource unavailable.');
  if(r.version!==p.expectedVersion)throw Error('Resource changed; refresh first.');
  if(!p.active&&future.some(b=>bookingResources(b).includes(r.id)))throw Error('Resource has reservations. Cancel or move them explicitly first.');
  r.name=p.name!.trim();r.active=p.active!;r.version++;
 }else if(p.action==='closure.add'){
  if(p.day!<s.today||p.day!>addDay(s.today,365))throw Error('Choose a date within the next year.');
  if(p.resourceId&&!next.resources.some(r=>r.id===p.resourceId&&r.active))throw Error('Resource unavailable.');
  if(future.some(b=>b.day===p.day&&(!p.resourceId||bookingResources(b).includes(p.resourceId))&&overlap(b.start,b.end,p.start!,p.end!)))throw Error('Closure conflicts with existing reservations.');
  next.closures.push({id:crypto.randomUUID(),resourceId:p.resourceId||null,day:p.day!,start:p.start!,end:p.end!,reason:p.reason.trim(),active:true,version:1});
 }else{
  const c=next.closures.find(x=>x.id===p.id&&x.active);
  if(!c)throw Error('Closure unavailable.');
  if(c.version!==p.expectedVersion)throw Error('Closure changed; refresh first.');
  c.active=false;c.version++;
 }
 return next;
}
