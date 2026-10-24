/**
 * Groups & Gospel Planning request/response contract. The server parses every command with
 * parseCommand before the database rechecks identity, scope and versions; the browser types
 * here are a convenience, never an authorization boundary.
 */
export const ZONE='America/Los_Angeles';

export type Response='pending'|'accepted'|'declined';
export type Participant={id:string|null;name:string;self:boolean;response:Response;responseVersion:number;reconfirm:boolean;covered:boolean|null};
export type Report={version:number;outcome:'completed'|'not-held';note:string;recordedAt:string;author:string;authorSelf:boolean;corrected:boolean};
export type Session={id:string;version:number;start:string;end:string;phase:'proposal'|'published'|'cancelled';
 location:{id:string;label:string;active:boolean};mine:boolean;canManage:boolean;canEdit:boolean;createdBySelf:boolean;
 participants:Participant[];report:Report|null};
export type Range={date:string;from:string;to:string;repeatWeeks:number;skip:string[]};
export type PlanContent={version:number;review:string;plan:string;nextAction:string};
export type Plan={canEdit:boolean;canPublish:boolean;
 published:(PlanContent&{responsible:string|null;publishedAt:string})|null;
 draft:(PlanContent&{responsibleId:string|null;updatedAt:string;publishedVersion:number|null})|null};
export type MemberUpdate={id:string;version:number;week:string;unitId:string;unitName:string;aboutMemberId:string|null;about:string|null;
 body:string;support:string;nextAction:string;assigneeId:string|null;assignee:string|null;status:'open'|'done';author:string;updatedAt:string};
export type RequestEvent={kind:'submitted'|'clarification'|'reply'|'answer'|'withdrawn';body:string;statusAfter:string;recordedAt:string;actor:string;self:boolean};
export type OverseerRequest={id:string;version:number;week:string;status:'open'|'clarification'|'answered'|'withdrawn';asAuthor:boolean;asReviewer:boolean;
 groupName:string;author:string;reviewer:string;nextActor:'reviewer'|'requester'|null;events:RequestEvent[]};
export type Grant={id:string;capability:Capability;memberId:string;member:string;group:string;unit:string|null;effective:boolean;grantedAt:string};
export type Capability='publish'|'schedule'|'oversee';
export type Workspace={week:string;today:string;now:string;
 me:{id:string;name:string;placed:boolean;groupId:string|null;groupName:string|null;ownGroupId:string|null;inGroup:boolean;unitId:string|null;unitName:string|null;
  groupLeader:boolean;unitLeader:boolean;publisher:boolean;scheduler:boolean;overseer:boolean;manager:boolean};
 candidates:{id:string;name:string;unitId:string|null;self:boolean}[];
 /** Groups this member may open: their own group and any group they lead by appointment. */
 groups:{id:string;name:string;own:boolean;leader:boolean}[];
 units:{id:string;name:string;canWrite:boolean}[];
 locations:{id:string;label:string}[];
 availability:{version:number;ranges:Range[];windows:{start:string;end:string}[];savedAt?:string};
 sessions:Session[];plan:Plan|null;updates:MemberUpdate[]|null;requests:OverseerRequest[];
 reviewers:{id:string;name:string}[]|null;
 weekSummary:{sessions:number;proposed:number;awaiting:number;confirmed:number;resultsRecorded:number;completed:number;resultsNeeded:number}|null;
 manage:{locations:{id:string;label:string}[];grants:Grant[];
  members:{id:string;name:string;groupId:string|null;group:string|null;unit:string|null;groupLeader:boolean}[];
  groups:{id:string;name:string;category:string;units:{id:string;name:string}[]}[]}|null};

export class ContractError extends Error{}
const fail=(message='Check the details and try again.'):never=>{throw new ContractError(message);};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/,TIME=/^([01]\d|2[0-3]):[0-5][05]$/;
type Json=Record<string,unknown>;

function object(value:unknown):Json{if(!value||typeof value!=='object'||Array.isArray(value))fail();return value as Json;}
function keys(value:Json,required:string[],optional:string[]=[]){
 for(const key of Object.keys(value))if(!required.includes(key)&&!optional.includes(key))fail();
 for(const key of required)if(!(key in value))fail();
}
function uuid(value:unknown):string{if(typeof value!=='string'||!UUID.test(value))fail();return value as string;}
function optionalUuid(value:unknown):string|null{return value===null||value===undefined?null:uuid(value);}
function natural(value:unknown):number{if(!Number.isSafeInteger(value)||(value as number)<0||(value as number)>999999999)fail();return value as number;}
function text(value:unknown,max:number,required:boolean):string{
 if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail(required?'Add the required text (up to '+max+' characters).':'Shorten the text to '+max+' characters or fewer.');
 return (value as string).trim();
}
export function dayKey(value:unknown):string{
 if(typeof value!=='string'||!DATE.test(value))fail('Choose a valid date.');
 const d=new Date((value as string)+'T12:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)fail('Choose a valid date.');
 return value as string;
}
export function weekKey(value:unknown):string{const day=dayKey(value);if(new Date(day+'T12:00:00Z').getUTCDay()!==1)fail('Choose a week that starts on Monday.');return day;}
function time(value:unknown):string{if(typeof value!=='string'||!TIME.test(value))fail('Choose a time in five-minute steps.');return value as string;}
function choice<T extends string>(value:unknown,options:readonly T[]):T{if(typeof value!=='string'||!options.includes(value as T))fail();return value as T;}

function range(value:unknown):Range{
 const r=object(value);keys(r,['date','from','to','repeatWeeks','skip']);
 const date=dayKey(r.date),from=time(r.from),to=time(r.to);
 if(to<=from)fail('The end must be after the start.');
 const repeatWeeks=natural(r.repeatWeeks);if(repeatWeeks<1||repeatWeeks>4)fail('Repeat for one to four weeks.');
 if(!Array.isArray(r.skip)||r.skip.length>=repeatWeeks)fail('Keep at least one week in each repeating range.');
 const allowed=Array.from({length:repeatWeeks},(_,i)=>addDays(date,7*i));
 const skip=(r.skip as unknown[]).map(dayKey);
 if(skip.some(s=>!allowed.includes(s))||new Set(skip).size!==skip.length)fail('A skipped date must be one of the repeating weeks.');
 return {date,from,to,repeatWeeks,skip};
}
function sessionFields(p:Json){
 const date=dayKey(p.date),from=time(p.from),to=time(p.to);
 if(to<=from)fail('The end must be after the start.');
 if(!Array.isArray(p.participants)||p.participants.length<2||p.participants.length>3)fail('Choose one or two partners.');
 const participants=(p.participants as unknown[]).map(uuid);
 if(new Set(participants).size!==participants.length)fail('Choose each partner once.');
 return {date,from,to,locationId:uuid(p.locationId),participants};
}

export const ACTIONS=['availability.save','session.create','session.revise','session.publish','session.respond','session.cancel','report.save',
 'plan.save','plan.publish','update.create','update.edit','request.create','request.respond','request.reply','request.withdraw',
 'location.add','location.retire','capability.grant','capability.end'] as const;
export type Action=typeof ACTIONS[number];
export type Command={action:Action;requestId:string;payload:Json};
/** Actions that act on one group. They may name a group the member leads; the database checks the appointment. */
export const GROUP_SCOPED:readonly Action[]=['session.create','plan.save','plan.publish','update.create','request.create'];
function group(p:Json,payload:Json):Json{if(p.groupId!==undefined&&p.groupId!==null)payload.groupId=uuid(p.groupId);return payload;}

/** Strict server-side parser. Unknown fields (including any actor, role or scope field) are rejected. */
export function parseCommand(input:unknown):Command{
 const body=object(input);keys(body,['action','requestId','payload']);
 const action=choice(body.action,ACTIONS),requestId=uuid(body.requestId),p=object(body.payload);
 const id=()=>({id:uuid(p.id),expected:natural(p.expected)});
 let payload:Json;
 switch(action){
  case 'availability.save':
   keys(p,['expected','ranges']);
   if(!Array.isArray(p.ranges)||p.ranges.length>14)fail('Use at most 14 time ranges.');
   payload={expected:natural(p.expected),ranges:(p.ranges as unknown[]).map(range)};break;
  case 'session.create':keys(p,['date','from','to','locationId','participants'],['groupId']);payload=group(p,sessionFields(p));break;
  case 'session.revise':keys(p,['id','expected','date','from','to','locationId','participants']);payload={...id(),...sessionFields(p)};break;
  case 'session.publish':case 'session.cancel':keys(p,['id','expected']);payload=id();break;
  case 'session.respond':keys(p,['id','expected','expectedResponse','response']);
   payload={...id(),expectedResponse:natural(p.expectedResponse),response:choice(p.response,['accepted','declined'] as const)};break;
  case 'report.save':{
   keys(p,['id','expected','expectedReport','outcome','note'],['reason']);
   const expectedReport=natural(p.expectedReport);
   payload={...id(),expectedReport,outcome:choice(p.outcome,['completed','not-held'] as const),note:text(p.note,1200,false)};
   if(expectedReport>0)payload.reason=text(p.reason,600,true);else if(p.reason!==undefined)payload.reason=text(p.reason,600,false);
   break;}
  case 'plan.save':{
   keys(p,['week','expected','review','plan','nextAction'],['responsibleId','groupId']);
   const review=text(p.review,1200,false),plan=text(p.plan,1200,false);
   if(!review&&!plan)fail('Add a Gospel Review or a Gospel Plan before saving.');
   payload=group(p,{week:weekKey(p.week),expected:natural(p.expected),review,plan,nextAction:text(p.nextAction,300,false),responsibleId:optionalUuid(p.responsibleId)});break;}
  case 'plan.publish':keys(p,['week','expected'],['groupId']);payload=group(p,{week:weekKey(p.week),expected:natural(p.expected)});break;
  case 'update.create':
   keys(p,['week','unitId','body','support','nextAction'],['aboutMemberId','assigneeId','groupId']);
   payload=group(p,{week:weekKey(p.week),unitId:uuid(p.unitId),body:text(p.body,1200,true),support:text(p.support,600,false),nextAction:text(p.nextAction,300,false),
    aboutMemberId:optionalUuid(p.aboutMemberId),assigneeId:optionalUuid(p.assigneeId)});break;
  case 'update.edit':
   keys(p,['id','expected','body','support','nextAction','status'],['aboutMemberId','assigneeId']);
   payload={...id(),body:text(p.body,1200,true),support:text(p.support,600,false),nextAction:text(p.nextAction,300,false),
    status:choice(p.status,['open','done'] as const),aboutMemberId:optionalUuid(p.aboutMemberId),assigneeId:optionalUuid(p.assigneeId)};break;
  case 'request.create':keys(p,['week','reviewerId','body'],['groupId']);payload=group(p,{week:weekKey(p.week),reviewerId:uuid(p.reviewerId),body:text(p.body,1200,true)});break;
  case 'request.respond':keys(p,['id','expected','decision','body']);
   payload={...id(),decision:choice(p.decision,['answer','clarification'] as const),body:text(p.body,1200,true)};break;
  case 'request.reply':keys(p,['id','expected','body']);payload={...id(),body:text(p.body,1200,true)};break;
  case 'request.withdraw':keys(p,['id','expected']);payload=id();break;
  case 'location.add':keys(p,['label']);{const label=text(p.label,120,true);if(label.length<2)fail('Use at least two characters.');payload={label};}break;
  case 'location.retire':case 'capability.end':keys(p,['id']);payload={id:uuid(p.id)};break;
  case 'capability.grant':{
   keys(p,['memberId','capability'],['groupId','unitId']);
   const capability=choice(p.capability,['publish','schedule','oversee'] as const);
   payload={memberId:uuid(p.memberId),capability};
   // Oversee names its group. Publish and schedule default to the member's group, or name a group they lead.
   if(capability==='oversee')payload.groupId=uuid(p.groupId);else if(p.groupId!==undefined&&p.groupId!==null)payload.groupId=uuid(p.groupId);
   if(capability==='schedule'&&p.unitId!==undefined&&p.unitId!==null)payload.unitId=uuid(p.unitId);else if(p.unitId!==undefined&&p.unitId!==null)fail();
   break;}
 }
 return {action,requestId,payload};
}

const messages:Record<string,[number,string]>={
 GP_DENIED:[403,'This action is not available to you right now. Your access or role may have changed.'],
 GP_STALE:[409,'This changed on another screen. Review the refreshed version and try again.'],
 GP_STALE_RESPONSE:[409,'Your answer changed on another screen. Review the refreshed session.'],
 GP_STALE_REPORT:[409,'A partner already recorded this result. Review it, then add a correction if needed.'],
 GP_OVERLAP:[409,'Someone in this session already has a commitment at that time. Choose another time.'],
 GP_AVAILABILITY_OVERLAP:[400,'Two of your time ranges overlap. Combine them first.'],
 GP_CLOCK_CHANGE:[400,'That time is skipped or repeated by a clock change. Choose another time.'],
 GP_INVALID_TIME:[400,'Check the date and times. The end must be after the start, and new sessions must be in the future.'],
 GP_INVALID:[400,'Check the details and try again.'],
 GP_UNAVAILABLE:[409,'That meeting place is no longer available. Choose another.'],
 GP_CLOSED:[409,'This can no longer be changed in its current state.'],
 GP_RETRY_CONFLICT:[409,'This request was already used for different details. Refresh and try again.'],
};
/** Maps a database error to a generic member-facing reply. Unknown failures never reveal details. */
export function commandFailure(error:{message?:string;code?:string}|null|undefined):{status:number;code:string;error:string}{
 const code=Object.keys(messages).find(key=>error?.message===key)??(error?.code==='42501'?'GP_DENIED':'UNAVAILABLE');
 const [status,message]=messages[code]??[503,'Gospel Planning is unavailable right now. Try again shortly.'];
 return {status,code,error:message};
}

// ---- Dates and status (pure, shared by the page and tests) ----
export function addDays(day:string,days:number):string{
 const d=new Date(dayKey(day)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
export function mondayOf(day:string):string{const d=new Date(dayKey(day)+'T12:00:00Z');return addDays(day,-((d.getUTCDay()+6)%7));}
export function vegasDay(at=new Date()):string{
 return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
}
export function vegasClock(iso:string):string{
 return new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',minute:'2-digit'}).format(new Date(iso));
}
export function vegasTime24(iso:string):string{
 return new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
}
export function dayLabel(day:string,style:'short'|'long'='short'):string{
 return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:style,month:style==='long'?'long':'short',day:'numeric'}).format(new Date(dayKey(day)+'T12:00:00Z'));
}
export function weekLabel(week:string):string{
 return dayLabel(week)+' to '+dayLabel(addDays(week,6));
}
export function sessionDay(session:Pick<Session,'start'>):string{return vegasDay(new Date(session.start));}
export function timeRange(start:string,end:string):string{return vegasClock(start)+' to '+vegasClock(end);}
export function clockLabel(value:string):string{
 const [h,m]=value.split(':').map(Number);return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date(Date.UTC(2000,0,1,h,m)));
}

export type Status={label:string;tone:'quiet'|'info'|'warning'|'success'|'danger';detail:string};
/** One readable status. Missing answers stay pending: they never become a cancellation or a result. */
export function sessionStatus(s:Session,now:number):Status{
 const ended=Date.parse(s.end)<=now,others=s.participants.filter(p=>!p.self),self=s.participants.find(p=>p.self);
 const reconfirm=s.participants.some(p=>p.reconfirm);
 if(s.phase==='cancelled')return {label:'Cancelled',tone:'quiet',detail:'This session was cancelled. Its history is kept.'};
 if(s.report)return s.report.outcome==='completed'
  ?{label:'Result recorded',tone:'success',detail:s.report.corrected?'Shared result, corrected.':'Shared result recorded by '+(s.report.authorSelf?'you':s.report.author)+'.'}
  :{label:'Recorded as not held',tone:'quiet',detail:'Shared result recorded by '+(s.report.authorSelf?'you':s.report.author)+'.'};
 if(s.phase==='proposal')return {label:'Proposed',tone:'info',detail:reconfirm?'Changed. After a leader publishes it, everyone confirms again.':'Waiting for a leader to publish it. Partners respond after publication.'};
 if(ended)return s.participants.every(p=>p.response==='accepted')
  ?{label:'Result needed',tone:'warning',detail:'Record one shared result for the session.'}
  :{label:'Ended without full confirmation',tone:'quiet',detail:'Some partners did not confirm. Nothing is assumed about what happened.'};
 if(s.participants.some(p=>p.response==='declined'))return {label:'Declined',tone:'danger',detail:'A partner declined. Change the session or cancel it.'};
 if(s.participants.every(p=>p.response==='accepted'))return {label:'Confirmed',tone:'success',detail:'Everyone confirmed this version.'};
 if(self?.response==='pending')return {label:reconfirm?'Please reconfirm':'Awaiting you',tone:'warning',detail:reconfirm?'The time, place or partners changed. Confirm the new version.':'Accept or decline this session.'};
 return {label:reconfirm?'Needs reconfirmation':'Awaiting partner',tone:'info',
  detail:'Waiting for '+others.filter(p=>p.response==='pending').map(p=>p.name).join(' and ')+' to confirm.'};
}
/** The member's own next step for a session, if any. */
export function nextAction(s:Session,now:number):'respond'|'report'|null{
 const self=s.participants.find(p=>p.self);
 if(!self||s.phase!=='published'||s.report)return null;
 if(Date.parse(s.end)>now)return self.response==='pending'?'respond':null;
 return s.participants.every(p=>p.response==='accepted')?'report':null;
}
/** Expands entered ranges to Las Vegas dates for display; the database computes the real instants. */
export function rangeDates(r:Range):string[]{
 return Array.from({length:r.repeatWeeks},(_,i)=>addDays(r.date,7*i)).filter(d=>!r.skip.includes(d));
}
