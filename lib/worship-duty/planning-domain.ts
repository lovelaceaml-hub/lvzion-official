import {CATALOG,DEPARTMENTS,DEMO_NOW,PRAYERS,USHERS,assignmentProblem,available,dateKey,dutiesFor,hasChoir,hasDuty,hasThanks,meta} from './domain.ts';
import type {Actor,Department,Duty,Member,Period,Service,State} from './domain.ts';
import {demoState,PREVIEW_ACTORS} from './fixtures.ts';
/** R3 fictional planning domain. No networking, credentials, persistent storage or production writes. */
export type PlannerActor=Actor&{serviceEditor:boolean};
export type Change={serviceId:string;dutyId:Duty;memberId:string|null;expectedVersion:number};
export type ServiceDraft={id:string;worship:string;period:Period;startsAt:string;endsAt:string};
export type AuditEntry={id:number;actorId:string;operation:string;reason:string;before:unknown;after:unknown;at:string};
export type PlannerState=State&{now:string;rosterVersions:Record<string,number>;paused:string[];openingDefault:string|null;defaultVersion:number;audit:AuditEntry[]};
export const PLANNER_ACTORS:{label:string;actor:PlannerActor}[]=[
 {label:'Usher leader · Jordan',actor:{...PREVIEW_ACTORS[3].actor,serviceEditor:false}},
 {label:'Worship leader · Morgan',actor:{...PREVIEW_ACTORS[2].actor,serviceEditor:false}},
 {label:'Service coordinator · Taylor',actor:{memberId:'taylor',enabled:true,manageDepartments:[],songEditor:false,serviceEditor:true}},
 {label:'Technical admin only · Taylor',actor:{...PREVIEW_ACTORS[4].actor,serviceEditor:false}},
 {label:'Member · Alex',actor:{...PREVIEW_ACTORS[0].actor,serviceEditor:false}}
];
const periods:Period[]=['Early Morning','Morning','Afternoon','Evening','Commemoration'];
export function planningFixture():PlannerState{return{...demoState(),now:DEMO_NOW,rosterVersions:{},paused:[],openingDefault:null,defaultVersion:0,audit:[]};}
const copy=<T>(value:T):T=>structuredClone(value);
export const rosterKey=(memberId:string,department:Department)=>`${memberId}:${department}`;
export const manages=(actor:PlannerActor,department:Department)=>actor.enabled&&actor.manageDepartments.includes(department);
export const planningAllowed=(actor:PlannerActor)=>actor.enabled&&(actor.serviceEditor||actor.manageDepartments.length>0);
export const closed=(s:Service,now:string)=>s.status==='cancelled'||Date.parse(s.startsAt)<=Date.parse(now);
const requirePlanning=(actor:PlannerActor)=>{if(!planningAllowed(actor))throw new Error('Planning is not available to this account.');};
const requireDepartment=(actor:PlannerActor,department:Department)=>{if(!DEPARTMENTS.includes(department)||!manages(actor,department))throw new Error('This department is outside your authority.');};
const reasonText=(reason:string)=>{if(typeof reason!=='string'||reason.trim().length<5||reason.trim().length>500)throw new Error('Enter a reason between 5 and 500 characters.');return reason.trim();};
const checkVersion=(expected:number,actual:number)=>{if(!Number.isSafeInteger(expected)||expected<0||expected!==actual)throw new Error('This record changed. Reload and review your draft before saving.');};
const memberFor=(state:PlannerState,id:string)=>state.members.find(m=>m.id===id);
export function monthKey(value:string):string {if(!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value))throw new Error('Choose a valid planning month.');return value;}
export function shiftMonth(value:string,offset:number):string {monthKey(value);const d=new Date(value+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);return monthKey(d.toISOString().slice(0,7));}
export function localInput(iso:string):string {if(!Number.isFinite(Date.parse(iso)))throw new Error('Invalid date.');const f=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});return f.format(new Date(iso)).replace(' ','T');}
/** Round-trip both Pacific offsets. Reject nonexistent AND repeated daylight-saving wall times. */
export function localToInstant(value:string):string {
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'Z'))||new Date(value+'Z').toISOString().slice(0,16)!==value)throw new Error('Choose a valid local date and time.');
 const base=Date.parse(value+'Z'),matches=[7,8].map(offset=>new Date(base+offset*3600000).toISOString()).filter(iso=>localInput(iso)===value);
 if(matches.length!==1)throw new Error('That local time is skipped or repeated by daylight saving. Choose an unambiguous service time.');return matches[0];
}
export function calendarDays(month:string):(string|null)[]{monthKey(month);const first=new Date(month+'-01T12:00:00Z');const length=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();const days:(string|null)[]=[...Array(first.getUTCDay()).fill(null),...Array.from({length},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)];while(days.length%7)days.push(null);return days;}
export function serviceCaption(s:Service):string{return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(s.startsAt));}
export function departmentRoster(state:PlannerState,actor:PlannerActor,department:Department):Member[]{requireDepartment(actor,department);return state.members.filter(m=>m.departments.includes(department));}
export function isServing(state:PlannerState,id:string,department:Department):boolean {const m=memberFor(state,id);return !!m?.active&&m.departments.includes(department)&&!state.paused.includes(rosterKey(id,department));}
export function candidateProblem(state:PlannerState,s:Service,duty:Duty,id:string):string|null {
 if(!isServing(state,id,meta(duty).department))return 'Not active for this department.';
 return assignmentProblem(s,duty,memberFor(state,id),state.now);
}
export function monthServices(state:PlannerState,month:string):Service[]{monthKey(month);return state.services.filter(s=>dateKey(s.startsAt).startsWith(month)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));}
export function coverage(state:PlannerState,s:Service,department:Department){const duties=CATALOG.filter(d=>d.department===department&&hasDuty(s,d.id));const filled=duties.filter(d=>s.assignments[d.id]);const problems=filled.filter(d=>{const m=s.assignments[d.id]!;return !isServing(state,m,department)||!memberFor(state,m)?.qualifications.includes(d.id)||!available(memberFor(state,m)!,s);});return{slots:duties.length,filled:filled.length,open:duties.length-filled.length,problems:problems.length};}
function audit(state:PlannerState,actor:PlannerActor,operation:string,reason:string,before:unknown,after:unknown):PlannerState {
 return{...state,audit:[...state.audit,{id:state.audit.length+1,actorId:actor.memberId,operation,reason:reasonText(reason),before:copy(before),after:copy(after),at:state.now}]};
}
/** Validate the entire proposed final state before changing the caller's state; supports legal swaps. */
export function saveBatch(state:PlannerState,actor:PlannerActor,department:Department,changes:readonly Change[],reason:string):PlannerState {
 requireDepartment(actor,department);reasonText(reason);
 if(!Array.isArray(changes)||changes.length<1||changes.length>40)throw new Error('Review between 1 and 40 changes per batch.');
 if(new Set(changes.map(c=>`${c.serviceId}:${c.dutyId}`)).size!==changes.length)throw new Error('A duty cannot appear twice in one batch.');
 const result=copy(state),touched=new Set<string>();
 for(const c of changes){
  const d=CATALOG.find(d=>d.id===c.dutyId),s=result.services.find(s=>s.id===c.serviceId);
  if(!d||d.department!==department)throw new Error('This duty is outside your department.');
  if(!s||closed(s,state.now))throw new Error('This service is closed to changes.');
  checkVersion(c.expectedVersion,s.version);if(!hasDuty(s,d.id))throw new Error('This duty does not apply to this service.');
  if(c.memberId!==null&&typeof c.memberId!=='string')throw new Error('Choose a member or explicitly leave the duty open.');
  if(c.memberId===null)delete s.assignments[d.id];else s.assignments[d.id]=c.memberId;touched.add(s.id);
 }
 for(const c of changes){if(c.memberId!==null){const problem=candidateProblem(result,result.services.find(s=>s.id===c.serviceId)!,c.dutyId,c.memberId);if(problem)throw new Error(`${meta(c.dutyId).label}: ${problem}`);}}
 for(const s of result.services)if(touched.has(s.id))s.version++;
 return audit(result,actor,'batch',reason,state.services.filter(s=>touched.has(s.id)),changes);
}
/** Suggestions are deliberately NOT named Usual/Auto/Rotation/Random; historical parity is separate. */
export function proposeOpenSlots(state:PlannerState,actor:PlannerActor,department:Department,month:string):Change[] {
 requireDepartment(actor,department);const working=copy(state),proposals:Change[]=[];
 for(const s of monthServices(working,month).filter(s=>!closed(s,state.now))){
  for(const d of CATALOG.filter(d=>d.department===department&&hasDuty(s,d.id)&&!s.assignments[d.id])){
   if(proposals.length===40)return proposals;
   const members=working.members.filter(m=>!candidateProblem(working,s,d.id,m.id)&&!m.manualOnly.includes(department)&&(d.id!=='opening_prayer'||m.id===working.openingDefault));
   const pair=(m:Member)=>USHERS.includes(d.id)&&dutiesFor(s,m.id).some(x=>PRAYERS.includes(x))?0:1;
   const load=(m:Member)=>monthServices(working,month).filter(x=>x.status!=='cancelled').reduce((n,x)=>n+dutiesFor(x,m.id).filter(id=>meta(id).department===department).length,0);
   members.sort((a,b)=>pair(a)-pair(b)||load(a)-load(b)||a.name.localeCompare(b.name));
   if(members[0]){s.assignments[d.id]=members[0].id;proposals.push({serviceId:s.id,dutyId:d.id,memberId:members[0].id,expectedVersion:s.version});}
  }
 }
 return proposals;
}
function validateDraft(d:ServiceDraft,now:string){
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(d.id)||typeof d.worship!=='string'||d.worship.trim().length<2||d.worship.trim().length>80||!periods.includes(d.period))throw new Error('Enter a valid service name and period.');
 const start=Date.parse(d.startsAt),end=Date.parse(d.endsAt),current=Date.parse(now);
 if(!Number.isFinite(start)||!Number.isFinite(end)||!/(Z|[+-]\d{2}:\d{2})$/.test(d.startsAt)||!/(Z|[+-]\d{2}:\d{2})$/.test(d.endsAt)||start<=current||start>current+732*86400000||end<=start||end-start>86400000)throw new Error('Choose a future start and end within two years, no more than 24 hours apart.');
}
const sameService=(s:Service,d:ServiceDraft)=>s.status!=='cancelled'&&Date.parse(s.startsAt)===Date.parse(d.startsAt)&&s.period===d.period&&s.worship.trim().toLowerCase()===d.worship.trim().toLowerCase();
function requireEditor(actor:PlannerActor){requirePlanning(actor);if(!actor.serviceEditor)throw new Error('An independent service-coordinator appointment is required.');}
export function createServices(state:PlannerState,actor:PlannerActor,drafts:readonly ServiceDraft[],reason:string):PlannerState {
 requireEditor(actor);reasonText(reason);if(!drafts.length||drafts.length>20)throw new Error('Review between 1 and 20 services at a time.');const result=copy(state);
 for(const d of drafts){validateDraft(d,state.now);if(result.services.some(s=>s.id===d.id||sameService(s,d)))throw new Error('A proposed service already exists. Reload and review the month.');const s:Service={...d,worship:d.worship.trim(),status:'draft',version:0,assignments:{}};
  if(result.openingDefault&&!candidateProblem(result,s,'opening_prayer',result.openingDefault))s.assignments.opening_prayer=result.openingDefault;
  result.services.push(s);
 }
 return audit(result,actor,'create-services',reason,[],drafts);
}
function validateAssigned(state:PlannerState,s:Service){
 for(const d of CATALOG){const id=s.assignments[d.id];if(id){const problem=candidateProblem(state,s,d.id,id);if(problem)throw new Error(`Review ${d.label}: ${problem}`);}}
 const p=state.programs.find(p=>p.serviceId===s.id);if(p&&((p.thanks&&!hasThanks(s))||(p.choir&&!hasChoir(s.worship))))throw new Error('Clear inapplicable song sections in Presider before changing this service.');
}
export function changeService(state:PlannerState,actor:PlannerActor,id:string,expectedVersion:number,action:'publish'|'cancel'|'reschedule',reason:string,draft?:ServiceDraft):PlannerState {
 requireEditor(actor);reasonText(reason);const result=copy(state),s=result.services.find(s=>s.id===id);if(!s)throw new Error('Service not found.');checkVersion(expectedVersion,s.version);
 if(closed(s,state.now)||result.programs.some(p=>p.serviceId===id&&p.status==='sung'))throw new Error('Historical or cancelled services cannot be edited.');const before=copy(s);
 if(action==='publish'){if(s.status!=='draft')throw new Error('Only a draft can be published.');validateAssigned(result,s);s.status='published';}
 else if(action==='cancel'){s.status='cancelled';result.requests=result.requests.map(r=>r.serviceId===id&&r.status==='pending'?{...r,status:'closed'}:r);}
 else if(action==='reschedule'){
  if(!draft||draft.id!==id)throw new Error('Choose the service to reschedule.');validateDraft(draft,state.now);
  if(result.services.some(other=>other.id!==id&&sameService(other,draft)))throw new Error('A service already exists at that time.');
  Object.assign(s,draft);validateAssigned(result,s);
  result.requests=result.requests.map(r=>r.serviceId===id&&r.status==='pending'?{...r,status:'closed'}:r);
  result.programs=result.programs.map(p=>p.serviceId===id?{...p,status:'draft',version:p.version+1}:p);
 }else throw new Error('Unknown service action.');
 s.version++;return audit(result,actor,action,reason,before,s);
}
export type RosterChange={memberId:string;department:Department;serving:boolean;manualOnly:boolean;qualifications:Duty[];expectedVersion:number};
export function configureRoster(state:PlannerState,actor:PlannerActor,change:RosterChange,reason:string):PlannerState {
 const {memberId,department,serving,manualOnly,qualifications,expectedVersion}=change;requireDepartment(actor,department);reasonText(reason);
 const member=memberFor(state,memberId);if(!member?.departments.includes(department))throw new Error('Add department membership through the member system first.');
 if(typeof serving!=='boolean'||typeof manualOnly!=='boolean'||!Array.isArray(qualifications)||new Set(qualifications).size!==qualifications.length||qualifications.some(d=>!CATALOG.some(x=>x.id===d&&x.department===department)))throw new Error('Choose valid qualifications for this department only.');
 const key=rosterKey(memberId,department);checkVersion(expectedVersion,state.rosterVersions[key]??0);const result=copy(state),m=memberFor(result,memberId)!;
 m.qualifications=[...m.qualifications.filter(d=>meta(d).department!==department),...qualifications];m.manualOnly=manualOnly?[...new Set([...m.manualOnly,department])]:m.manualOnly.filter(d=>d!==department);
 result.paused=serving?result.paused.filter(k=>k!==key):[...new Set([...result.paused,key])];result.rosterVersions[key]=(result.rosterVersions[key]??0)+1;
 return audit(result,actor,'roster',reason,{member,serving:!state.paused.includes(key)},change);
}
export function configureDefault(state:PlannerState,actor:PlannerActor,memberId:string|null,expectedVersion:number,reason:string):PlannerState {
 requireDepartment(actor,'Worship');reasonText(reason);checkVersion(expectedVersion,state.defaultVersion);
 if(memberId!==null&&(!isServing(state,memberId,'Worship')||!memberFor(state,memberId)?.qualifications.includes('opening_prayer')))throw new Error('Choose an active member qualified for Opening Prayer.');
 return audit({...state,openingDefault:memberId,defaultVersion:state.defaultVersion+1},actor,'opening-default',reason,state.openingDefault,memberId);
}
/** Unpublished regular-service drafts; two-hour end times are review placeholders, not service policy. */
export function regularDrafts(state:PlannerState,month:string):ServiceDraft[]{
 monthKey(month);const result:ServiceDraft[]=[];
 for(const date of calendarDays(month).filter((d):d is string=>d!==null)){
  const weekday=new Date(date+'T12:00:00Z').getUTCDay();const entries:{period:Period;time:string}[]=weekday===6?[{period:'Morning',time:'10:00'},{period:'Afternoon',time:'14:30'},{period:'Evening',time:'19:30'}]:weekday===2?[{period:'Evening',time:'19:30'}]:[];
  for(const entry of entries){const startsAt=localToInstant(`${date}T${entry.time}`),d:ServiceDraft={id:`regular-${date}-${entry.period.toLowerCase()}`,worship:weekday===6?'Sabbath Day':'Third Day',period:entry.period,startsAt,endsAt:new Date(Date.parse(startsAt)+7200000).toISOString()};if(Date.parse(startsAt)>Date.parse(state.now)&&!state.services.some(s=>s.id===d.id||sameService(s,d)))result.push(d);}
 }
 return result;
}
