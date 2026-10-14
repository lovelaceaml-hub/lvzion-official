import {uuid,WorshipError} from './api-contract.ts';
import {CATALOG,DEPARTMENTS} from './domain.ts';
import type {Duty,Department,Period} from './domain.ts';
export type SetupService={id:string;worship:string;period:Period;startsAt:string;endsAt:string;status:'draft'|'published'|'cancelled';version:number};
export type SetupMember={id:string;name:string;departments:Department[];duties:Duty[];hasAccess:boolean;managerDepartments:Department[];manualDepartments:Department[];songEditor:boolean;availabilityVersion:number;serviceAvailability:{serviceId:string;available:boolean}[]};
export type SetupSong={id:string;code:string;title:string;seconds:number;active:boolean};
export type SetupState={version:number;services:SetupService[];members:SetupMember[];departments:Department[];songs:SetupSong[];membersHasMore:boolean;songsHasMore:boolean;servicesHasMore:boolean};
const invalid=():never=>{throw new WorshipError('Invalid Worship setup data.');};
const obj=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:invalid();
const keys=(x:Record<string,unknown>,ks:string[])=>{if(Object.keys(x).some(k=>!ks.includes(k))||ks.some(k=>!(k in x)))invalid();};
const str=(x:unknown,max:number,min=1)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max?x.trim():invalid();
const int=(x:unknown,max=999999999,min=0)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max?x:invalid();
const bool=(x:unknown)=>typeof x==='boolean'?x:invalid();
const arr=(x:unknown,max:number)=>Array.isArray(x)&&x.length<=max?x:invalid();
const one=<T extends string>(x:unknown,values:readonly T[]):T=>typeof x==='string'&&values.includes(x as T)?x as T:invalid();
const instant=(x:unknown)=>{const v=str(x,40);if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))invalid();return v;};
const departments=(x:unknown)=>arr(x,8).map(d=>one(d,DEPARTMENTS));
const periods=['Early Morning','Morning','Afternoon','Evening','Commemoration'] as const;
export function parseSetupCommand(raw:unknown):Record<string,unknown>{
 const c=obj(raw),op=str(c.op,24);
 if(op==='create'||op==='move'){
  keys(c,op==='create'?['op','worship','period','startsAt','endsAt']:['op','serviceId','expectedVersion','worship','period','startsAt','endsAt']);
  str(c.worship,80,2);one(c.period,periods);const start=instant(c.startsAt),end=instant(c.endsAt);
  if(Date.parse(start)<=Date.now()||Date.parse(end)<=Date.parse(start)||Date.parse(end)-Date.parse(start)>86400000)invalid();
  if(op==='move'){uuid(c.serviceId);int(c.expectedVersion);}return c;
 }
 if(op==='publish'||op==='cancel'){keys(c,['op','serviceId','expectedVersion']);uuid(c.serviceId);int(c.expectedVersion);return c;}
 int(c.expectedVersion);
 switch(op){
 case 'qualify':keys(c,['op','memberId','dutyId','enabled','expectedVersion']);uuid(c.memberId);one(c.dutyId,CATALOG.map(d=>d.id));bool(c.enabled);break;
 case 'access':case 'song_editor':keys(c,['op','memberId','enabled','expectedVersion']);uuid(c.memberId);bool(c.enabled);break;
 case 'participation':case 'manager':case 'manual':keys(c,['op','memberId','department','enabled','expectedVersion']);uuid(c.memberId);one(c.department,DEPARTMENTS);bool(c.enabled);break;
 case 'service_availability':keys(c,['op','memberId','serviceId','available','expectedAvailabilityVersion','expectedVersion']);uuid(c.memberId);uuid(c.serviceId);bool(c.available);int(c.expectedAvailabilityVersion);break;
 case 'song':case 'song_update':keys(c,op==='song'?['op','code','title','seconds','expectedVersion']:['op','songId','code','title','seconds','active','expectedVersion']);str(c.code,30);str(c.title,150);int(c.seconds,3600,1);if(op==='song_update'){uuid(c.songId);bool(c.active);}break;
 default:invalid();
 }return c;
}
export function parseSetupState(raw:unknown):SetupState{
 const c=obj(raw);
 return {version:int(c.version),departments:departments(c.departments),membersHasMore:bool(c.membersHasMore),songsHasMore:bool(c.songsHasMore),servicesHasMore:bool(c.servicesHasMore),
  services:arr(c.services,120).map(x=>{const s=obj(x),startsAt=instant(s.startsAt),endsAt=instant(s.endsAt);if(Date.parse(endsAt)<=Date.parse(startsAt))invalid();return{id:uuid(s.id),worship:str(s.worship,80,2),period:one(s.period,periods),startsAt,endsAt,status:one(s.status,['draft','published','cancelled'] as const),version:int(s.version)};}),
  members:arr(c.members,200).map(x=>{const m=obj(x);return{id:uuid(m.id),name:str(m.name,120,2),departments:departments(m.departments),duties:arr(m.duties,27).map(d=>one(d,CATALOG.map(d=>d.id))),hasAccess:bool(m.hasAccess),managerDepartments:departments(m.managerDepartments),manualDepartments:departments(m.manualDepartments),songEditor:bool(m.songEditor),availabilityVersion:int(m.availabilityVersion),serviceAvailability:arr(m.serviceAvailability,500).map(x=>{const a=obj(x);return{serviceId:uuid(a.serviceId),available:bool(a.available)};})};}),
  songs:arr(c.songs,500).map(x=>{const s=obj(x);return{id:uuid(s.id),code:str(s.code,30),title:str(s.title,150),seconds:int(s.seconds,3600,1),active:bool(s.active)};})};
}
