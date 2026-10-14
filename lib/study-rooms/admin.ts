import {dayKey,addDay,overlap} from './domain.ts';
import type {Resource,Schedule} from './domain.ts';
export type Closure={id:string;resourceId:string|null;day:string;start:number;end:number;reason:string;active:boolean;version:number};
export type AdminData={resources:(Resource&{active:boolean;version:number})[];closures:Closure[]};
export type AdminCommand={requestId:string;action:'resource.update'|'closure.add'|'closure.remove';resourceId?:string;name?:string;active?:boolean;day?:string;start?:number;end?:number;id?:string;expectedVersion?:number;reason:string};
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export function parseAdminCommand(value:unknown):AdminCommand{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid management request.');const p=value as Record<string,unknown>;
 const fields:Record<string,string[]>={'resource.update':['resourceId','name','active','expectedVersion'],'closure.add':['resourceId','day','start','end'],'closure.remove':['id','expectedVersion']};
 if(typeof p.action!=='string'||!Object.hasOwn(fields,p.action)||typeof p.requestId!=='string'||!uuid.test(p.requestId)||typeof p.reason!=='string'||p.reason.trim().length<5||p.reason.length>240)throw Error('Provide a valid action and reason.');
 if(Object.keys(p).some(k=>!['action','requestId','reason',...fields[p.action as string]].includes(k)))throw Error('Unexpected management field.');
 if(p.action!=='closure.add'&&(!Number.isSafeInteger(p.expectedVersion)||(p.expectedVersion as number)<1))throw Error('Refresh before changing this record.');
 if(p.action==='resource.update'){
  if(typeof p.resourceId!=='string'||!uuid.test(p.resourceId)||typeof p.name!=='string'||p.name.trim().length<2||p.name.length>80||typeof p.active!=='boolean')throw Error('Invalid resource changes.');
 }else if(p.action==='closure.remove'){
  if(typeof p.id!=='string'||!uuid.test(p.id))throw Error('Choose a closure.');
 }else{
  if(p.resourceId!==undefined&&(typeof p.resourceId!=='string'||(p.resourceId!==''&&!uuid.test(p.resourceId))))throw Error('Choose a valid resource.');
  if(typeof p.day!=='string')throw Error('Choose a day.');dayKey(p.day);
  if(!Number.isInteger(p.start)||!Number.isInteger(p.end)||(p.start as number)%30||(p.end as number)%30||(p.start as number)<600||(p.end as number)>1380||(p.start as number)>=(p.end as number))throw Error('Choose a valid 30-minute interval.');
 }
 return p as unknown as AdminCommand;
}
export function simulateAdmin(data:AdminData,s:Schedule,raw:unknown):AdminData{
 if(!s.canManage)throw Error('Reservation-manager permission required.');const p=parseAdminCommand(raw),next=structuredClone(data);
 const future=s.bookings.filter(b=>b.state!=='cancelled'&&(b.day>s.today||(b.day===s.today&&b.end>s.nowMinute)));
 if(p.action==='resource.update'){
  const r=next.resources.find(x=>x.id===p.resourceId);if(!r)throw Error('Resource unavailable.');if(r.version!==p.expectedVersion)throw Error('Resource changed; refresh first.');
  if(!p.active&&future.some(b=>b.resourceId===r.id))throw Error('Resource has reservations. Cancel or move them explicitly first.');
  r.name=p.name!.trim();r.active=p.active!;r.version++;
 }else if(p.action==='closure.add'){
  if(p.day!<s.today||p.day!>addDay(s.today,365))throw Error('Choose a date within the next year.');
  if(p.resourceId&&!next.resources.some(r=>r.id===p.resourceId&&r.active))throw Error('Resource unavailable.');
  if(future.some(b=>b.day===p.day&&(!p.resourceId||b.resourceId===p.resourceId)&&overlap(b.start,b.end,p.start!,p.end!)))throw Error('Closure conflicts with existing reservations.');
  next.closures.push({id:crypto.randomUUID(),resourceId:p.resourceId||null,day:p.day!,start:p.start!,end:p.end!,reason:p.reason.trim(),active:true,version:1});
 }else{
  const c=next.closures.find(x=>x.id===p.id&&x.active);if(!c)throw Error('Closure unavailable.');if(c.version!==p.expectedVersion)throw Error('Closure changed; refresh first.');c.active=false;c.version++;
 }
 return next;
}
