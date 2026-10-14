// Independently implemented policies. No Firebase, network, account or storage dependencies.
export const CATALOG = [
 {id:'presider',label:'Presider',department:'Worship'},
 {id:'opening_prayer',label:'Opening Prayer',department:'Worship'},
 {id:'thanks_prayer',label:'Thanks Prayer',department:'Worship'},
 {id:'closing_prayer',label:'Closing Prayer',department:'Worship'},
 {id:'usher_door',label:'Usher Door',department:'Usher Sisters'},
 {id:'usher_front',label:'Usher Front',department:'Usher Sisters'},
 {id:'usher_back',label:'Usher Back',department:'Usher Sisters'},
 {id:'usher_1',label:'Usher #1',department:'Usher Brothers'},
 {id:'usher_2',label:'Usher #2',department:'Usher Brothers'},
 {id:'lobby_security',label:'Lobby Security',department:'Usher Brothers'},
 {id:'lobby_1',label:'Lobby Desk #1',department:'Lobby'},
 {id:'lobby_2',label:'Lobby Desk #2',department:'Lobby'},
 {id:'translation_1',label:'Translation #1',department:'Translation'},
 {id:'translation_2',label:'Translation #2',department:'Translation'},
 {id:'media_1',label:'Media Booth #1',department:'Media'},
 {id:'media_2',label:'Media Booth #2',department:'Media'},
 {id:'parking_1',label:'Parking #1',department:'Parking Lot'},
 {id:'parking_2',label:'Parking #2',department:'Parking Lot'},
 {id:'parking_3',label:'Parking #3',department:'Parking Lot'},
 {id:'parking_4',label:'Parking #4',department:'Parking Lot'},
 {id:'parking_5',label:'Parking #5',department:'Parking Lot'},
 {id:'offering_1',label:'Offering #1',department:'Offering'},
 {id:'offering_2',label:'Offering #2',department:'Offering'},
 {id:'offering_3',label:'Offering #3',department:'Offering'},
 {id:'offering_4',label:'Offering #4',department:'Offering'},
 {id:'offering_5',label:'Offering #5',department:'Offering'},
 {id:'offering_6',label:'Offering #6',department:'Offering'}
] as const;
export type Duty = typeof CATALOG[number]['id'];
export type Department = typeof CATALOG[number]['department'];
export type Period = 'Early Morning'|'Morning'|'Afternoon'|'Evening'|'Commemoration';
export const DEPARTMENTS:Department[] = [...new Set(CATALOG.map(x=>x.department))];
export const PRAYERS:readonly Duty[] = ['thanks_prayer','closing_prayer'];
export const USHERS:readonly Duty[] = ['usher_door','usher_front','usher_back','usher_1','usher_2'];
export type Service = {id:string;worship:string;period:Period;startsAt:string;endsAt:string;status:'draft'|'published'|'cancelled';version:number;assignments:Partial<Record<Duty,string>>};
export type Member = {id:string;name:string;groupId:string;unit:string;active:boolean;departments:Department[];qualifications:Duty[];manualOnly:Department[];unavailablePeriods:Period[];daysOff:string[];serviceAvailability:Record<string,boolean>};
// These are demonstration/verified-server inputs, NEVER authorization claims accepted from a browser.
export type Actor = {memberId:string;enabled:boolean;manageDepartments:Department[];songEditor:boolean};
export type ChangeRequest = {id:string;serviceId:string;duty:Duty;memberId:string;status:'pending'|'withdrawn'|'approved'|'declined'|'closed'};
export type Song = {id:string;title:string;seconds:number};
export type Program = {serviceId:string;preparation:string[];glory:string;thanks:string;choir:string;status:'draft'|'confirmed'|'sung';version:number};
export type State = {members:Member[];services:Service[];requests:ChangeRequest[];programs:Program[]};
export const DEMO_NOW = '2026-10-14T17:00:00Z';
const clean = (s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
export const meta = (id:Duty)=>CATALOG.find(x=>x.id===id)!;
export const pairKey = (a:Duty,b:Duty)=>[a,b].sort().join('|');
export function allowedTogether(duties:readonly Duty[],approvedPairs:readonly string[]=[]):boolean {
 if(duties.some(d=>!CATALOG.some(x=>x.id===d))||new Set(duties).size!==duties.length||duties.length>2)return false;
 if(duties.length<2)return true;
 if(duties.includes('opening_prayer'))return false;
 const [a,b]=duties;
 return (PRAYERS.includes(a)&&USHERS.includes(b))||(PRAYERS.includes(b)&&USHERS.includes(a))||approvedPairs.includes(pairKey(a,b));
}
export function hasChoir(worship:string):boolean {return ['sabbath day','third day'].includes(clean(worship));}
export function hasThanks(s:Pick<Service,'worship'|'period'>):boolean {
 const w=clean(s.worship)||'sabbath day';
 return clean(s.period)==='morning'&&(w==='sabbath day'||!['sabbath day','third day','prayer week','preaching week'].includes(w));
}
export function hasDuty(s:Pick<Service,'worship'|'period'>,d:Duty):boolean {
 if(d==='thanks_prayer')return hasThanks(s);
 if(d==='closing_prayer')return hasChoir(s.worship||'Sabbath Day');
 return CATALOG.some(x=>x.id===d);
}
export function dateKey(iso:string):string {
 const date=new Date(iso);if(Number.isNaN(date.valueOf()))throw new Error('Invalid service time.');
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function serviceLabel(s:Service):string {return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'short',month:'short',day:'numeric'}).format(new Date(s.startsAt));}
export function serviceTime(s:Service):string {return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit'}).format(new Date(s.startsAt));}
export function available(m:Member,s:Service):boolean {
 const override=m.serviceAvailability[s.id];
 if(typeof override==='boolean')return override;
 return !m.daysOff.includes(dateKey(s.startsAt))&&!m.unavailablePeriods.includes(s.period);
}
export const dutiesFor = (s:Service,memberId:string):Duty[] => CATALOG.filter(d=>s.assignments[d.id]===memberId).map(d=>d.id);
export function canManage(a:Actor,d:Duty):boolean {return a.enabled&&a.manageDepartments.includes(meta(d).department);}
export function canPlan(a:Actor,s:Service):boolean {return a.enabled&&(a.songEditor||s.assignments.presider===a.memberId);}
export function displayName(state:State,a:Actor,id:string|undefined,d:Duty):string {
 if(!id)return 'Not filled';
 const subject=state.members.find(m=>m.id===id),self=state.members.find(m=>m.id===a.memberId);
 if(!a.enabled||!subject)return 'Assigned member';
 return id===a.memberId?'You':self?.groupId===subject.groupId||canManage(a,d)?subject.name:'Assigned member';
}
export function assignmentProblem(s:Service,d:Duty,m:Member|undefined,now:string,approvedPairs:readonly string[]=[]):string|null {
 if(!Number.isFinite(Date.parse(now))||!Number.isFinite(Date.parse(s.startsAt))||Date.parse(s.startsAt)<=Date.parse(now)||s.status==='cancelled')return 'This service is closed to changes.';
 if(!hasDuty(s,d))return 'This duty does not apply to this service.';
 if(!m||!m.active||!m.departments.includes(meta(d).department))return 'An active department member is required.';
 if(!m.qualifications.includes(d))return 'This member is not qualified for this duty.';
 if(!available(m,s))return 'This member is not available for this service.';
 const other=dutiesFor(s,m.id).filter(x=>x!==d);
 if(!allowedTogether([...other,d],approvedPairs))return 'This member has a conflicting assignment.';
 return null;
}
export function assign(state:State,a:Actor,serviceId:string,d:Duty,memberId:string|null,expectedVersion:number,now=DEMO_NOW):State {
 const s=state.services.find(x=>x.id===serviceId);
 if(!s||!canManage(a,d))throw new Error('You cannot manage this department.');
 if(s.version!==expectedVersion)throw new Error('The service changed. Review it before saving.');
 if(!Number.isFinite(Date.parse(now))||Date.parse(s.startsAt)<=Date.parse(now)||s.status==='cancelled')throw new Error('This service is closed to changes.');
 if(!hasDuty(s,d))throw new Error('This duty does not apply to this service.');
 if(memberId!==null){const problem=assignmentProblem(s,d,state.members.find(x=>x.id===memberId),now);if(problem)throw new Error(problem);}
 const assignments={...s.assignments};if(memberId===null)delete assignments[d];else assignments[d]=memberId;
 return {...state,services:state.services.map(x=>x.id===serviceId?{...x,assignments,version:x.version+1}:x)};
}
export function askForChange(state:State,a:Actor,serviceId:string,d:Duty,now=DEMO_NOW):State {
 const s=state.services.find(x=>x.id===serviceId);
 if(!a.enabled||!s||s.status!=='published'||s.assignments[d]!==a.memberId||Date.parse(s.startsAt)<=Date.parse(now))throw new Error('Only your upcoming published duty can be requested.');
 if(state.requests.some(r=>r.serviceId===serviceId&&r.duty===d&&r.memberId===a.memberId&&r.status==='pending'))throw new Error('A request is already waiting.');
 return {...state,requests:[...state.requests,{id:`request-${state.requests.length+1}`,serviceId,duty:d,memberId:a.memberId,status:'pending'}]};
}
export function withdrawRequest(state:State,a:Actor,id:string):State {
 const r=state.requests.find(x=>x.id===id);
 if(!a.enabled||!r||r.memberId!==a.memberId||r.status!=='pending')throw new Error('This request cannot be withdrawn.');
 return {...state,requests:state.requests.map(x=>x.id===id?{...x,status:'withdrawn'}:x)};
}
export function resolveRequest(state:State,a:Actor,id:string,decision:'replace'|'open'|'decline'|'close',replacement:string|null,expectedVersion:number,now=DEMO_NOW):State {
 const r=state.requests.find(x=>x.id===id),s=state.services.find(x=>x.id===r?.serviceId);
 if(!r||r.status!=='pending'||!canManage(a,r.duty))throw new Error('This request is outside your authority.');
 let next=state;
 if(decision!=='close'){
  if(!s||s.assignments[r.duty]!==r.memberId)throw new Error('The assignment changed. Close this stale request.');
  if(s.version!==expectedVersion)throw new Error('The service changed. Review it before saving.');
  if(s.status==='cancelled'||Date.parse(s.startsAt)<=Date.parse(now))throw new Error('Close this request for a past or cancelled service.');
  if(decision==='replace'&&(!replacement||replacement===r.memberId))throw new Error('Choose a different eligible member.');
  if(decision==='replace'||decision==='open')next=assign(state,a,s.id,r.duty,decision==='open'?null:replacement,expectedVersion,now);
 }
 return {...next,requests:next.requests.map(x=>x.id===id?{...x,status:decision==='close'?'closed':decision==='decline'?'declined':'approved'}:x)};
}
// A bounded review aid, not a replacement for the reference's four historical Fill algorithms.
export function suggestions(state:State,a:Actor,s:Service,d:Duty,now=DEMO_NOW):Member[] {
 if(!canManage(a,d)||d==='opening_prayer')return [];
 return state.members.filter(m=>!m.manualOnly.includes(meta(d).department)&&!assignmentProblem(s,d,m,now)).sort((a,b)=>{
  const paired=(m:Member)=>USHERS.includes(d)&&dutiesFor(s,m.id).some(x=>PRAYERS.includes(x))?0:1;
  const load=(m:Member)=>state.services.filter(x=>dateKey(x.startsAt).slice(0,7)===dateKey(s.startsAt).slice(0,7)).reduce((n,x)=>n+dutiesFor(x,m.id).length,0);
  return paired(a)-paired(b)||load(a)-load(b)||a.name.localeCompare(b.name);
 });
}
export function setDayOff(state:State,a:Actor,date:string,off:boolean):State {
 if(!a.enabled||!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Invalid availability change.');
 return {...state,members:state.members.map(m=>m.id===a.memberId?{...m,daysOff:off?[...new Set([...m.daysOff,date])]:m.daysOff.filter(d=>d!==date)}:m)};
}
export function saveProgram(state:State,a:Actor,p:Program,catalog:readonly Song[],expectedVersion:number,now=DEMO_NOW):State {
 const s=state.services.find(x=>x.id===p.serviceId),old=state.programs.find(x=>x.serviceId===p.serviceId);
 if(!s||!canPlan(a,s)||s.status==='cancelled'||Date.parse(s.startsAt)<=Date.parse(now)||old?.status==='sung')throw new Error('This service plan is not editable by you.');
 if((old?.version??0)!==expectedVersion)throw new Error('The song plan changed. Reload it before saving.');
 if(p.status==='sung'||p.preparation.length>20)throw new Error('Invalid plan.');
 const ids=[...p.preparation,p.glory,p.thanks,p.choir].filter(Boolean);
 if(ids.some(id=>!catalog.some(x=>x.id===id)))throw new Error('Choose songs from the approved catalog.');
 const saved={...p,thanks:hasThanks(s)?p.thanks:'',choir:hasChoir(s.worship)?p.choir:'',version:expectedVersion+1};
 return {...state,programs:[...state.programs.filter(x=>x.serviceId!==p.serviceId),saved]};
}
export function programText(s:Service,p:Program,songs:readonly Song[]):string {
 const name=(id:string)=>songs.find(x=>x.id===id)?.title||'Not selected';
 const lines=[`DEMO — ${s.worship}`,`${serviceLabel(s)} · ${serviceTime(s)} · Las Vegas`,`Preparation: ${p.preparation.map(name).join('; ')||'Not selected'}`,`Glory: ${name(p.glory)}`];
 if(hasThanks(s))lines.push(`Thanks: ${name(p.thanks)}`);
 if(hasChoir(s.worship))lines.push(`Choir: ${name(p.choir)}`);
 lines.push('Fictional review only. Not the live service plan.');return lines.join('\n');
}
