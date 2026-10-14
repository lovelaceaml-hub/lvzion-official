import {CATALOG,DEPARTMENTS} from './domain.ts';
import type {Duty,Department,Period} from './domain.ts';

export type AssignmentView={dutyId:Duty;filled:boolean;isMine:boolean;memberId:string|null;name:string;availabilityConflict:boolean|null};
export type ServiceView={id:string;worship:string;period:Period;startsAt:string;endsAt:string;status:'draft'|'published'|'cancelled';version:number;canPlan:boolean;assignments:AssignmentView[]};
export type RequestView={id:string;serviceId:string;dutyId:Duty;isMine:boolean;status:'pending'|'withdrawn'|'approved'|'declined'|'closed';stale:boolean};
export type ProgramItem={section:'preparation'|'glory'|'thanks'|'choir';position:number;songId:string};
export type ProgramView={serviceId:string;status:'draft'|'confirmed'|'sung';version:number;items:ProgramItem[]};
export type Workspace={memberId:string;timezone:'America/Los_Angeles';now:string;manageDepartments:Department[];services:ServiceView[];requests:RequestView[];daysOff:string[];availabilityVersion:number;programs:ProgramView[]};
export type Candidate={id:string;name:string;eligible:boolean;reason:'available'|'unavailable'|'conflict';manualOnly:boolean;paired:boolean};
export type CandidateList={kind:'candidates';serviceId:string;dutyId:Duty;version:number;candidates:Candidate[];hasMore:boolean};
export type SongView={id:string;code:string;title:string;seconds:number};
export type SongList={kind:'songs';serviceId:string;songs:SongView[];hasMore:boolean};
export type Lookup={kind:'candidates';serviceId:string;dutyId:Duty}|{kind:'songs';serviceId:string;search?:string};
export type BatchChange={serviceId:string;dutyId:Duty;memberId:string|null;expectedVersion:number};
export type Command=
 |{op:'batch';changes:BatchChange[]}
 |{op:'assign';serviceId:string;dutyId:Duty;memberId:string|null;expectedVersion:number}
 |{op:'request';serviceId:string;dutyId:Duty;expectedVersion:number}
 |{op:'withdraw';requestId:string}
 |{op:'resolve';requestId:string;decision:'replace'|'open'|'decline'|'close';memberId?:string|null;expectedVersion:number}
 |{op:'availability';day:string;unavailable:boolean;expectedVersion:number}
 |{op:'program';serviceId:string;expectedVersion:number;expectedProgramVersion:number;status:'draft'|'confirmed';items:ProgramItem[]};
export class WorshipError extends Error {status:number;code:string;constructor(message:string,status=400,code='invalid'){super(message);this.status=status;this.code=code;}}
const fail=():never=>{throw new WorshipError('Invalid Worship Duty data.');};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail();
const text=(v:unknown,max=160):string=>typeof v==='string'&&v.length<=max?v:fail();
const bool=(v:unknown):boolean=>typeof v==='boolean'?v:fail();
const list=(v:unknown,max:number):unknown[]=>Array.isArray(v)&&v.length<=max?v:fail();
const integer=(v:unknown,max=999999999):number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max?v:fail();
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const uuid=(v:unknown):string=>typeof v==='string'&&uuidPattern.test(v)?v:fail();
const nullableId=(v:unknown):string|null=>v===null?null:uuid(v);
const oneOf=<T extends string>(v:unknown,values:readonly T[]):T=>typeof v==='string'&&values.includes(v as T)?v as T:fail();
const duty=(v:unknown):Duty=>oneOf(v,CATALOG.map(d=>d.id));
const date=(v:unknown):string=>{const s=text(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00:00Z'))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)fail();return s;};
const instant=(v:unknown):string=>{const s=text(v,40);if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))fail();return s;};
const keys=(o:Record<string,unknown>,required:string[],optional:string[]=[])=>{if(required.some(k=>!(k in o))||Object.keys(o).some(k=>![...required,...optional].includes(k)))fail();};
function unique<T>(items:T[],key:(x:T)=>string):T[]{if(new Set(items.map(key)).size!==items.length)fail();return items;}
export function parseItems(v:unknown):ProgramItem[]{return unique(list(v,23).map(raw=>{const i=object(raw);keys(i,['section','position','songId']);const section=oneOf(i.section,['preparation','glory','thanks','choir'] as const),position=integer(i.position,20);if(position<1||(section!=='preparation'&&position!==1))fail();return{section,position,songId:uuid(i.songId)};}),i=>`${i.section}:${i.position}`);}
export function parseCommand(raw:unknown):Command{
 const o=object(raw),op=text(o.op,20);
 switch(op){
 case 'batch':{keys(o,['op','changes']);const changes=list(o.changes,40).map(raw=>{const c=object(raw);keys(c,['serviceId','dutyId','memberId','expectedVersion']);return{serviceId:uuid(c.serviceId),dutyId:duty(c.dutyId),memberId:nullableId(c.memberId),expectedVersion:integer(c.expectedVersion)};});if(!changes.length)fail();return{op,changes:unique(changes,c=>c.serviceId+':'+c.dutyId)};}
 case 'assign':keys(o,['op','serviceId','dutyId','memberId','expectedVersion']);return{op,serviceId:uuid(o.serviceId),dutyId:duty(o.dutyId),memberId:nullableId(o.memberId),expectedVersion:integer(o.expectedVersion)};
 case 'request':keys(o,['op','serviceId','dutyId','expectedVersion']);return{op,serviceId:uuid(o.serviceId),dutyId:duty(o.dutyId),expectedVersion:integer(o.expectedVersion)};
 case 'withdraw':keys(o,['op','requestId']);return{op,requestId:uuid(o.requestId)};
 case 'resolve':{keys(o,['op','requestId','decision','expectedVersion'],['memberId']);const decision=oneOf(o.decision,['replace','open','decline','close'] as const),memberId=o.memberId===undefined?undefined:nullableId(o.memberId);if(decision==='replace'&&!memberId)fail();if(decision!=='replace'&&memberId!=null)fail();return{op,requestId:uuid(o.requestId),decision,...(memberId!==undefined?{memberId}:{}),expectedVersion:integer(o.expectedVersion)};}
 case 'availability':keys(o,['op','day','unavailable','expectedVersion']);return{op,day:date(o.day),unavailable:bool(o.unavailable),expectedVersion:integer(o.expectedVersion)};
 case 'program':keys(o,['op','serviceId','expectedVersion','expectedProgramVersion','status','items']);return{op,serviceId:uuid(o.serviceId),expectedVersion:integer(o.expectedVersion),expectedProgramVersion:integer(o.expectedProgramVersion),status:oneOf(o.status,['draft','confirmed'] as const),items:parseItems(o.items)};
 default:return fail();
 }
}
export function parseLookup(raw:unknown):Lookup{
 const o=object(raw);if(o.kind==='candidates'){keys(o,['kind','serviceId','dutyId']);return{kind:'candidates',serviceId:uuid(o.serviceId),dutyId:duty(o.dutyId)};}
 keys(o,['kind','serviceId'],['search']);if(o.kind!=='songs')fail();return{kind:'songs',serviceId:uuid(o.serviceId),...(o.search!==undefined?{search:text(o.search,80)}:{})};
}
export function parseCandidates(raw:unknown):CandidateList{
 const o=object(raw);if(o.kind!=='candidates')fail();return{kind:'candidates',serviceId:uuid(o.serviceId),dutyId:duty(o.dutyId),version:integer(o.version),hasMore:bool(o.hasMore),candidates:unique(list(o.candidates,500).map(raw=>{const c=object(raw);return{id:uuid(c.id),name:text(c.name,120),eligible:bool(c.eligible),reason:oneOf(c.reason,['available','unavailable','conflict'] as const),manualOnly:bool(c.manualOnly),paired:bool(c.paired)};}),c=>c.id)};
}
export function parseSongs(raw:unknown):SongList{
 const o=object(raw);if(o.kind!=='songs')fail();return{kind:'songs',serviceId:uuid(o.serviceId),hasMore:bool(o.hasMore),songs:unique(list(o.songs,500).map(raw=>{const s=object(raw),seconds=integer(s.seconds,3600);if(!seconds)fail();return{id:uuid(s.id),code:text(s.code,30),title:text(s.title,150),seconds};}),s=>s.id)};
}
export function parseWorkspace(raw:unknown):Workspace{
 const o=object(raw);if(o.timezone!=='America/Los_Angeles')fail();
 const services=unique(list(o.services,80).map(raw=>{
  const s=object(raw),startsAt=instant(s.startsAt),endsAt=instant(s.endsAt);if(Date.parse(endsAt)<=Date.parse(startsAt))fail();
  const assignments=unique(list(s.assignments,27).map(raw=>{const a=object(raw);return{dutyId:duty(a.dutyId),filled:bool(a.filled),isMine:bool(a.isMine),memberId:nullableId(a.memberId),name:text(a.name,120),availabilityConflict:a.availabilityConflict===null?null:bool(a.availabilityConflict)};}),a=>a.dutyId);
  return{id:uuid(s.id),worship:text(s.worship,80),period:oneOf(s.period,['Early Morning','Morning','Afternoon','Evening','Commemoration'] as const),startsAt,endsAt,status:oneOf(s.status,['draft','published','cancelled'] as const),version:integer(s.version),canPlan:bool(s.canPlan),assignments};
 }),s=>s.id);
 const requests=unique(list(o.requests,100).map(raw=>{const r=object(raw);return{id:uuid(r.id),serviceId:uuid(r.serviceId),dutyId:duty(r.dutyId),isMine:bool(r.isMine),status:oneOf(r.status,['pending','withdrawn','approved','declined','closed'] as const),stale:bool(r.stale)};}),r=>r.id);
 const programs=unique(list(o.programs,80).map(raw=>{const p=object(raw);return{serviceId:uuid(p.serviceId),version:integer(p.version),status:oneOf(p.status,['draft','confirmed','sung'] as const),items:parseItems(p.items)};}),p=>p.serviceId);
 return{memberId:uuid(o.memberId),timezone:'America/Los_Angeles',now:instant(o.now),manageDepartments:unique(list(o.manageDepartments,8).map(d=>oneOf(d,DEPARTMENTS)),d=>d),services,requests,programs,daysOff:unique(list(o.daysOff,367).map(date),x=>x),availabilityVersion:integer(o.availabilityVersion)};
}
export function sqlError(code:string|undefined):WorshipError{
 if(code==='42501')return new WorshipError('Your access is no longer available. Sign in again or contact your department leader.',403,'access');
 if(code==='40001'||code==='23505')return new WorshipError('This record changed or a request is already waiting. Reload before trying again.',409,'stale');
 if(['23514','23503','22023','22P02','22007','22008','23502'].includes(code??''))return new WorshipError('That change is not allowed. Review the service, assignment eligibility and selected songs.',422,'rule');
 return new WorshipError('Worship Duty is temporarily unavailable. No success has been confirmed.',503,'unavailable');
}
export function reviewEnabled(env:Record<string,string|undefined>):boolean{return env.LVZ_WORSHIP_DUTY_ENABLED==='true'&&env.VERCEL_ENV!=='production';}
export const isClosed=(s:ServiceView,now:string)=>s.status==='cancelled'||Date.parse(s.startsAt)<=Math.max(Date.parse(now),Date.now());
export const departmentOf=(d:Duty)=>CATALOG.find(x=>x.id===d)!.department;
