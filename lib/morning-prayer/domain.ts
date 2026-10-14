/** Framework-independent policy. Demo actors are not authentication; the SQL candidate derives its actor from the verified session. */
export const CAPABILITIES = ['view_schedule', 'join_gathering', 'volunteer_host', 'review_requests', 'manage_schedule', 'view_materials', 'edit_materials', 'publish_materials'] as const;
export type Capability = typeof CAPABILITIES[number];
export const ACTIVATION = Object.freeze({ live: false, sheetSync: false, messages: false, attendance: false, recaps: false });
export type Actor = { id: string; groupId: string; active: boolean; moduleAccess: boolean; grants: { seriesId: string; capability: Capability }[] };
export type Person = { id: string; name: string; groupId: string; active: boolean; eligible: boolean; moduleAccess: boolean; hostGrant: boolean };
export type Occurrence = { id: string; date: string; originalDate: string; startsAt: string; endsAt: string; timezone: string; kind: 'gathering' | 'app_day' | 'cancelled'; hostId: string | null; hostConfirmed: boolean; verified: boolean; accessVerified: boolean; revision: number; readingId: string | null; origin: 'reference' | 'app'; sourceHostId: string | null };
export type HostRequest = { id: string; occurrenceId: string; memberId: string; kind: 'volunteer' | 'change'; status: 'pending' | 'approved' | 'declined' | 'withdrawn' | 'superseded'; occurrenceRevision: number; revision: number; note: string; createdAt: string; resolvedBy?: string; resolvedAt?: string };
export type MaterialBody = { title: string; summary: string; items: string[]; sourceLabel: string };
export type Material = { id: string; key: string; kind: 'reading' | 'pwp'; revision: number; body: MaterialBody; sourceState: 'checked' | 'incomplete'; state: 'draft' | 'published'; createdBy: string };
export type Audit = { action: string; actorId: string; at: string; occurrenceId?: string; previousHost?: string | null; newHost?: string | null; version: number };
export type Workspace = { seriesId: string; version: number; occurrences: Occurrence[]; people: Person[]; requests: HostRequest[]; materials: Material[]; publication: Record<string, string>; audit: Audit[]; receipts: { actorId: string; key: string; fingerprint: string; message: string }[] };
export class PrayerError extends Error { readonly code: string; constructor(code: string) { super(code); this.code = code; this.name = 'PrayerError'; } }
const fail = (code: string): never => { throw new PrayerError(code); };
export function can(actor: Actor, capability: Capability, seriesId: string): boolean { return actor.active && actor.moduleAccess && actor.grants.some(g => g.seriesId === seriesId && g.capability === capability); }
function requireCap(actor: Actor, capability: Capability, seriesId: string): void { if (!can(actor, capability, seriesId)) fail('NOT_AUTHORIZED'); }
export function validDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value; }
export function instant(value: string): number { if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !validDate(value.slice(0,10)) || !Number.isFinite(Date.parse(value))) fail('INVALID_TIME'); return Date.parse(value); }
export function localDate(value: string, timezone: string): string { instant(value); try { const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(value)); return ['year','month','day'].map(k => parts.find(p => p.type === k)!.value).join('-'); } catch { return fail('INVALID_TIMEZONE'); } }
export function validateOccurrence(o: Occurrence): void { if (!validDate(o.date) || !validDate(o.originalDate) || instant(o.endsAt) <= instant(o.startsAt) || localDate(o.startsAt, o.timezone) !== o.date) fail('INVALID_TIME'); }
export function hostEligible(w: Workspace, memberId: string): boolean { const p = w.people.find(p => p.id === memberId); return !!p && p.active && p.eligible && p.moduleAccess && p.hostGrant; }
export function hostLabel(w: Workspace, actor: Actor, o: Occurrence): string {
  if (!can(actor,'view_schedule',w.seriesId)) return 'Unavailable';
  if (o.kind === 'app_day') return 'No live gathering'; if (o.kind === 'cancelled') return 'Cancelled'; if (!o.hostId) return 'Host needed'; if (o.hostId === actor.id) return 'You';
  const p = w.people.find(p => p.id === o.hostId); const coordinator = can(actor,'review_requests',w.seriesId) || can(actor,'manage_schedule',w.seriesId);
  return p && (p.groupId === actor.groupId || coordinator) ? p.name : 'Assigned host';
}
export function joinState(w: Workspace, actor: Actor, o: Occurrence, now: string): 'join' | 'not_authorized' | 'no_live_gathering' | 'needs_verification' | 'outside_window' {
  if (!can(actor,'join_gathering',w.seriesId) || !can(actor,'view_schedule',w.seriesId)) return 'not_authorized';
  if (o.kind !== 'gathering') return 'no_live_gathering'; if (!o.verified || !o.accessVerified) return 'needs_verification';
  try { validateOccurrence(o); const n=instant(now); return n >= instant(o.startsAt)-10*60000 && n < instant(o.endsAt) ? 'join' : 'outside_window'; } catch { return 'needs_verification'; }
}
export function nextGathering(w: Workspace, actor: Actor, now: string): Occurrence | undefined { if (!can(actor,'view_schedule',w.seriesId)) return; const n=instant(now); return w.occurrences.filter(o=>o.kind==='gathering'&&instant(o.endsAt)>n).sort((a,b)=>instant(a.startsAt)-instant(b.startsAt))[0]; }
export function visibleRequests(w: Workspace, actor: Actor): HostRequest[] { if (!can(actor,'view_schedule',w.seriesId)) return []; return structuredClone(w.requests.filter(r=>r.memberId===actor.id || can(actor,'review_requests',w.seriesId))); }
export function publishedMaterial(w: Workspace, actor: Actor, key: string): Material | undefined { if (!can(actor,'view_materials',w.seriesId)) return; return w.materials.find(m=>m.id===w.publication[key] && m.state==='published'); }
export function projectedSchedule(w: Workspace, actor: Actor) {
  if (!can(actor,'view_schedule',w.seriesId)) return [];
  return w.occurrences.map(o=>({id:o.id,date:o.date,startsAt:o.startsAt,endsAt:o.endsAt,timezone:o.timezone,kind:o.kind,host:hostLabel(w,actor,o),isMine:o.hostId===actor.id,hostConfirmed:o.hostConfirmed,verified:o.verified,revision:o.revision}));
}
export function validateMaterial(input: unknown): MaterialBody {
  const v=record(input); exact(v,['title','summary','items','sourceLabel']);
  const body={title:text(v.title,100),summary:text(v.summary,400),items:list(v.items,1,5).map(x=>text(x,240)),sourceLabel:text(v.sourceLabel,100)};
  if (/(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|<[^>]*>|\b(?:passcode|password|access_token)\b)/i.test(JSON.stringify(body))) fail('PRIVATE_OR_UNSAFE_CONTENT');
  return body;
}
function record(v:unknown):Record<string,unknown>{ if(!v||typeof v!=='object'||Array.isArray(v))fail('INVALID_COMMAND'); return v as Record<string,unknown>; }
function exact(v:Record<string,unknown>,keys:string[]){ if(Object.keys(v).some(k=>!keys.includes(k)))fail('INVALID_COMMAND'); }
function text(v:unknown,max:number,empty=false):string { if(typeof v!=='string'||v.length>max||(!empty&&!v.trim())||/[\u0000-\u001f]/.test(v))fail('INVALID_COMMAND');return (v as string).trim(); }
function id(v:unknown):string { const x=text(v,100);if(!/^[a-zA-Z0-9-]+$/.test(x))fail('INVALID_COMMAND');return x; }
function list(v:unknown,min:number,max:number):unknown[]{if(!Array.isArray(v)||v.length<min||v.length>max)fail('INVALID_COMMAND');return v as unknown[];}
export type Action = {type:'volunteer';occurrenceIds:string[]} | {type:'request_change';occurrenceId:string;note:string} | {type:'withdraw';requestId:string} | {type:'review';requestId:string;decision:'approve'|'decline'} | {type:'assign';occurrenceId:string;memberId:string} | {type:'confirm_host';occurrenceId:string} | {type:'schedule';occurrenceId:string;mode:'cancel'|'app_day'|'move'|'verify';startsAt?:string;endsAt?:string} | {type:'material_draft';key:string;body:MaterialBody;sourceChecked:boolean} | {type:'material_publish';materialId:string};
export type Command={key:string;expectedVersion:number;action:Action};
export function parseCommand(input:unknown):Command {
  const v=record(input); exact(v,['key','expectedVersion','action']);const key=id(v.key);if(!Number.isSafeInteger(v.expectedVersion)||Number(v.expectedVersion)<1)fail('INVALID_COMMAND');
  const a=record(v.action),type=a.type;let action:Action;
  switch(type){
    case 'volunteer': {exact(a,['type','occurrenceIds']);const ids=list(a.occurrenceIds,1,12).map(id);if(new Set(ids).size!==ids.length)fail('DUPLICATE_DATE');action={type,occurrenceIds:ids.sort()};break;}
    case 'request_change':exact(a,['type','occurrenceId','note']);action={type,occurrenceId:id(a.occurrenceId),note:text(a.note??'',200,true)};break;
    case 'withdraw':exact(a,['type','requestId']);action={type,requestId:id(a.requestId)};break;
    case 'review':exact(a,['type','requestId','decision']);if(a.decision!=='approve'&&a.decision!=='decline')fail('INVALID_COMMAND');action={type,requestId:id(a.requestId),decision:a.decision as 'approve'|'decline'};break;
    case 'assign':exact(a,['type','occurrenceId','memberId']);action={type,occurrenceId:id(a.occurrenceId),memberId:id(a.memberId)};break;
    case 'confirm_host':exact(a,['type','occurrenceId']);action={type,occurrenceId:id(a.occurrenceId)};break;
    case 'schedule':exact(a,['type','occurrenceId','mode','startsAt','endsAt']);if(!['cancel','app_day','move','verify'].includes(String(a.mode)))fail('INVALID_COMMAND');action={type,occurrenceId:id(a.occurrenceId),mode:a.mode as 'cancel'|'app_day'|'move'|'verify'};if(a.mode==='move'){action.startsAt=text(a.startsAt,40);action.endsAt=text(a.endsAt,40);instant(action.startsAt);instant(action.endsAt);}else if(a.startsAt!==undefined||a.endsAt!==undefined)fail('INVALID_COMMAND');break;
    case 'material_draft':exact(a,['type','key','body','sourceChecked']);if(typeof a.sourceChecked!=='boolean')fail('INVALID_COMMAND');action={type,key:id(a.key),body:validateMaterial(a.body),sourceChecked:a.sourceChecked as boolean};break;
    case 'material_publish':exact(a,['type','materialId']);action={type,materialId:id(a.materialId)};break;
    default:return fail('INVALID_COMMAND');
  }
  return{key,expectedVersion:Number(v.expectedVersion),action};
}
const ACTION_CAP:Record<Action['type'],Capability>={volunteer:'volunteer_host',request_change:'view_schedule',withdraw:'view_schedule',review:'review_requests',assign:'manage_schedule',confirm_host:'view_schedule',schedule:'manage_schedule',material_draft:'edit_materials',material_publish:'publish_materials'};
function stable(value:unknown):string { if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}';return JSON.stringify(value); }
export function applyCommand(current:Workspace,actor:Actor,input:unknown,now:string):{workspace:Workspace;message:string;replayed:boolean} {
  const command=parseCommand(input),a=command.action;instant(now);requireCap(actor,'view_schedule',current.seriesId);requireCap(actor,ACTION_CAP[a.type],current.seriesId);
  const fingerprint=stable({expectedVersion:command.expectedVersion,action:a});
  const prior=current.receipts.find(r=>r.actorId===actor.id&&r.key===command.key);
  if(prior){if(prior.fingerprint!==fingerprint)fail('IDEMPOTENCY_MISMATCH');return{workspace:structuredClone(current),message:prior.message,replayed:true};}
  if(current.version!==command.expectedVersion)fail('REVISION_CONFLICT');
  const w=structuredClone(current);let message='';let target:Occurrence|undefined;let previousHost:string|null|undefined;
  const get=(oid:string)=>w.occurrences.find(o=>o.id===oid)??fail('NOT_FOUND');
  const upcoming=(o:Occurrence,verified=true)=>{validateOccurrence(o);if(o.kind!=='gathering')fail('NO_LIVE_GATHERING');if(instant(o.startsAt)<=instant(now))fail('DATE_PASSED');if(verified&&!o.verified)fail('SCHEDULE_UNVERIFIED');};
  const pending=(oid:string,mid:string)=>w.requests.some(r=>r.occurrenceId===oid&&r.memberId===mid&&r.status==='pending');
  const resolve=(r:HostRequest,status:HostRequest['status'])=>{r.status=status;r.revision++;r.resolvedBy=actor.id;r.resolvedAt=now;};
  const supersede=(oid:string,except?:string)=>w.requests.filter(r=>r.occurrenceId===oid&&r.status==='pending'&&r.id!==except).forEach(r=>resolve(r,'superseded'));
  const request=(o:Occurrence,kind:'volunteer'|'change',note='')=>{if(pending(o.id,actor.id))fail('REQUEST_EXISTS');w.requests.push({id:`request-${command.key}-${o.id}`,occurrenceId:o.id,memberId:actor.id,kind,status:'pending',occurrenceRevision:o.revision,revision:1,note,createdAt:now});};
  if(a.type==='volunteer'){
    if(!hostEligible(w,actor.id))fail('HOST_INELIGIBLE');
    const dates=a.occurrenceIds.map(get);dates.forEach(o=>{upcoming(o);if(o.hostId)fail('HOST_ALREADY_ASSIGNED');if(pending(o.id,actor.id))fail('REQUEST_EXISTS');});
    dates.forEach(o=>request(o,'volunteer'));message=`${dates.length} hosting request${dates.length===1?'':'s'} submitted for review. No date is assigned yet.`;
  }else if(a.type==='request_change'){
    target=get(a.occurrenceId);upcoming(target,false);if(target.hostId!==actor.id)fail('NOT_YOUR_HOSTING_DATE');request(target,'change',a.note);message='Change requested. You remain the host until a coordinator approves it.';
  }else if(a.type==='withdraw'){
    const r=w.requests.find(r=>r.id===a.requestId)??fail('NOT_FOUND');if(r.memberId!==actor.id)fail('NOT_YOUR_REQUEST');if(r.status!=='pending')fail('REQUEST_RESOLVED');resolve(r,'withdrawn');message='Your pending request was withdrawn. The hosting schedule is unchanged.';
  }else if(a.type==='review'){
    const r=w.requests.find(r=>r.id===a.requestId)??fail('NOT_FOUND');if(r.status!=='pending')fail('REQUEST_RESOLVED');target=get(r.occurrenceId);upcoming(target,false);
    if(a.decision==='decline'){resolve(r,'declined');message='Request declined. The current host is unchanged.';}
    else{
      if(!target.verified)fail('SCHEDULE_UNVERIFIED');if(r.occurrenceRevision!==target.revision)fail('STALE_REQUEST');
      previousHost=target.hostId;
      if(r.kind==='volunteer'){if(target.hostId)fail('HOST_ALREADY_ASSIGNED');if(!hostEligible(w,r.memberId))fail('HOST_INELIGIBLE');target.hostId=r.memberId;target.hostConfirmed=true;}
      else{if(target.hostId!==r.memberId)fail('STALE_REQUEST');target.hostId=null;target.hostConfirmed=false;}
      target.origin='app';target.revision++;resolve(r,'approved');supersede(target.id,r.id);message=r.kind==='volunteer'?'Hosting request approved. Other pending requests for that date are marked superseded.':'Change approved. This date is now open for a new host.';
    }
  }else if(a.type==='assign'){
    target=get(a.occurrenceId);upcoming(target);if(!hostEligible(w,a.memberId))fail('HOST_INELIGIBLE');previousHost=target.hostId;if(target.hostId===a.memberId)fail('ALREADY_ASSIGNED');target.hostId=a.memberId;target.hostConfirmed=false;target.origin='app';target.revision++;supersede(target.id);message='Host assigned in the preview. Their confirmation is still needed.';
  }else if(a.type==='confirm_host'){
    target=get(a.occurrenceId);upcoming(target);if(target.hostId!==actor.id)fail('NOT_YOUR_HOSTING_DATE');if(!hostEligible(w,actor.id))fail('HOST_INELIGIBLE');if(target.hostConfirmed)fail('ALREADY_CONFIRMED');target.hostConfirmed=true;target.revision++;supersede(target.id);message='Your hosting date is confirmed in this preview.';
  }else if(a.type==='schedule'){
    target=get(a.occurrenceId);if(instant(target.startsAt)<=instant(now))fail('DATE_PASSED');previousHost=target.hostId;
    if(a.mode==='move'){
      const changed={...target,startsAt:a.startsAt!,endsAt:a.endsAt!,date:localDate(a.startsAt!,target.timezone)};validateOccurrence(changed);if(instant(changed.startsAt)<=instant(now))fail('DATE_PASSED');
      if(w.occurrences.some(o=>o.id!==target!.id&&o.date===changed.date))fail('DATE_CONFLICT');Object.assign(target,changed);target.verified=false;target.accessVerified=false;target.hostConfirmed=false;
    }else if(a.mode==='verify'){validateOccurrence(target);if(target.kind!=='gathering')fail('NO_LIVE_GATHERING');target.verified=true;target.accessVerified=false;}
    else{target.kind=a.mode==='cancel'?'cancelled':'app_day';target.hostId=null;target.hostConfirmed=false;target.verified=false;target.accessVerified=false;}
    target.origin='app';target.revision++;supersede(target.id);message=a.mode==='move'?'Gathering moved. Pending requests need a fresh submission; the host and meeting access need reconfirmation.':a.mode==='verify'?'Schedule details checked. Meeting credentials remain unverified.':'No live gathering on this date. The previous host and request history are retained.';
  }else if(a.type==='material_draft'){
    const previous=w.materials.find(m=>m.key===a.key)??fail('NOT_FOUND');const revision=Math.max(...w.materials.filter(m=>m.key===a.key).map(m=>m.revision))+1;
    w.materials.push({id:`material-${command.key}`,key:a.key,kind:previous.kind,revision,body:a.body,sourceState:a.sourceChecked?'checked':'incomplete',state:'draft',createdBy:actor.id});message='New material draft saved. Members still see the previously published version.';
  }else{
    const m=w.materials.find(m=>m.id===a.materialId)??fail('NOT_FOUND');
    if(m.sourceState!=='checked')fail('SOURCE_INCOMPLETE');
    if(m.state!=='draft')fail('MATERIAL_ALREADY_PUBLISHED');
    // A late editor must create a fresh revision, never downgrade a newer publication.
    const currentPublication=w.materials.find(previous=>previous.id===w.publication[m.key]);
    if(currentPublication && currentPublication.revision>=m.revision)fail('MATERIAL_REVISION_CONFLICT');
    validateMaterial(m.body);m.state='published';w.publication[m.key]=m.id;message='Checked material published in the fictional preview only.';
  }
  w.version++;
  w.audit.push({action:a.type==='schedule'?`schedule_${a.mode}`:a.type,actorId:actor.id,at:now,...(target?{occurrenceId:target.id}:{}),...(previousHost!==undefined?{previousHost,newHost:target?.hostId}:{}),version:w.version});
  w.receipts.push({actorId:actor.id,key:command.key,fingerprint,message});return{workspace:w,message,replayed:false};
}
export const ERROR_TEXT:Record<string,string>={NOT_AUTHORIZED:'This account does not have that separate Work Mission permission.',REVISION_CONFLICT:'The workspace changed. Review the latest schedule and submit again.',IDEMPOTENCY_MISMATCH:'This retry does not match the original request.',HOST_INELIGIBLE:'This member is not currently eligible to host.',HOST_ALREADY_ASSIGNED:'A host has already been assigned. No request was submitted.',REQUEST_EXISTS:'You already have a pending request for this date.',DATE_PASSED:'This gathering has already started. No scheduling change was made.',NO_LIVE_GATHERING:'There is no live gathering on this date.',SCHEDULE_UNVERIFIED:'The schedule needs verification before hosting can be approved.',STALE_REQUEST:'The schedule changed after this request. A new request is required.',NOT_YOUR_HOSTING_DATE:'Only the assigned host can request this change.',NOT_YOUR_REQUEST:'You can withdraw only your own pending requests.',REQUEST_RESOLVED:'This request has already been resolved.',DATE_CONFLICT:'Another occurrence already occupies this date.',SOURCE_INCOMPLETE:'The source must be checked before publication.',PRIVATE_OR_UNSAFE_CONTENT:'Remove private details or unsupported links before publishing.',MATERIAL_REVISION_CONFLICT:'A newer material revision is already published. Create a new correction instead of replacing it with this older draft.'};
