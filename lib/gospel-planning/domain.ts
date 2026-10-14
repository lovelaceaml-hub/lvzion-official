/** Fictional, in-memory workflow specification. NOT a server authorization boundary. */
export const ZONE = 'America/Los_Angeles';
export const INITIAL_CLOCK = '2026-10-14T17:00:00.000Z';
export const POLICY = { version: 'proposed-r1', crossGroup: false, automaticPublication: false, maximumRepeatWeeks: 4 } as const;
export type Role = 'unit-leader' | 'group-leader' | 'scheduler' | 'publisher' | 'overseer';
export type Person = { id: string; name: string; groupId: string; unitId: string; placementId: string; active: boolean; appAccess: boolean; roles: { kind: Role; scope: string; endedAt?: string }[] };
export type Range = { date: string; from: string; to: string; repeatWeeks: number; exceptions: string[] };
export type Window = { start: string; end: string };
export type Availability = { version: number; ranges: Range[]; windows: Window[] };
export type SafePlan = { summary: string; activity: string; nextAction: string };
export type Plan = { id: string; groupId: string; week: string; version: number; draft: SafePlan; published: null | { version: number; content: SafePlan; authorId: string; at: string } };
export type ReviewItem = { id: string; groupId: string; week: string; unitId: string; authorId: string; authorPlacementId: string; kind: 'member-update' | 'unit-contribution'; text: string; nextAction: string; responsibleId: string; responsiblePlacementId: string; version: number };
export type Request = { id: string; groupId: string; week: string; authorId: string; authorPlacementId: string; reviewerId: string; text: string; version: number; status: 'open' | 'clarification' | 'answered'; history: { authorId: string; text: string; status: Request['status']; at: string }[] };
export type Response = 'pending' | 'accepted' | 'declined';
export type Report = { version: number; authorId: string; outcome: 'completed' | 'not-held'; summary: string; reason: string; at: string; groupId: string };
export type Session = { id: string; groupId: string; week: string; creatorId: string; version: number; start: string; end: string; locationId: string; phase: 'proposal' | 'published' | 'cancelled'; participants: string[]; placements: Record<string, string>; availabilityVersions: Record<string, number>; responses: Record<string, { value: Response; version: number }>; commitments: Record<string, Window>; history: { version: number; start: string; end: string; locationId: string; participants: string[]; responses: Session['responses']; at: string }[]; reports: Report[] };
export type State = { now: string; serial: number; people: Person[]; groups: { id: string; name: string }[]; locations: { id: string; name: string }[]; availability: Record<string, Availability>; plans: Plan[]; items: ReviewItem[]; requests: Request[]; sessions: Session[]; receipts: Record<string, { payload: string; resourceId: string }>; audit: { id: string; actorId: string; kind: string; resourceId: string; at: string }[] };
export class WorkflowError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.name = 'WorkflowError'; this.code = code; }
}
function fail(code: string, message: string): never { throw new WorkflowError(code, message); }
function denied(): never { return fail('DENIED', 'This action is not available in your current scope.'); }
function text(value: string, label: string, required = true): string {
  if (typeof value !== 'string' || value.length > 1200 || (required && !value.trim())) fail('INVALID', `${label} needs between 1 and 1,200 characters.`);
  return value.trim();
}
export function instant(value: string): number {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail('INVALID_TIME', 'Use a valid time with an explicit timezone offset.');
  return Date.parse(value);
}
export function dateInZone(value: string): string { return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant(value))); }
export function addDays(date: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('INVALID_TIME', 'Choose a valid date.');
  const d = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== date) fail('INVALID_TIME', 'Choose a valid date.');
  d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export function weekOf(date: string): string { addDays(date, 0); return addDays(date, -(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7); }
/** Round-trip the wall time through IANA rules: nonexistent and ambiguous times are rejected. */
export function localInstant(date: string, time: string): string {
  addDays(date, 0);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail('INVALID_TIME', 'Choose a valid time.');
  const target = `${date}T${time}`;
  const wall = Date.parse(`${target}:00Z`);
  const format = new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const matches: number[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = wall - offset * 60000;
    if (format.format(new Date(candidate)).replace(' ', 'T') === target) matches.push(candidate);
  }
  if (matches.length !== 1) fail('INVALID_TIME', 'This local time is ambiguous or unavailable because of a clock change. Choose another time.');
  return new Date(matches[0]).toISOString();
}
export function overlaps(a: Window, b: Window): boolean { return instant(a.start) < instant(b.end) && instant(b.start) < instant(a.end); }
export function expandRanges(ranges: Range[]): Window[] {
  if (!Array.isArray(ranges) || ranges.length > 14) fail('INVALID', 'Use at most 14 availability ranges.');
  const windows: Window[] = [];
  for (const range of ranges) {
    if (!Number.isInteger(range.repeatWeeks) || range.repeatWeeks < 1 || range.repeatWeeks > POLICY.maximumRepeatWeeks || !Array.isArray(range.exceptions)) fail('INVALID', 'Repeat for one to four weeks.');
    const dates = Array.from({ length: range.repeatWeeks }, (_, index) => addDays(range.date, index * 7));
    if (range.exceptions.some(date => !dates.includes(date))) fail('INVALID', 'An exception must belong to this repeating range.');
    for (const date of dates.filter(date => !range.exceptions.includes(date))) {
      const window = { start: localInstant(date, range.from), end: localInstant(date, range.to) };
      if (instant(window.start) >= instant(window.end)) fail('INVALID_TIME', 'The end must be after the start.');
      if (windows.some(existing => overlaps(existing, window))) fail('OVERLAP', 'Your availability ranges overlap. Combine them first.');
      windows.push(window);
    }
  }
  return windows.sort((a, b) => instant(a.start) - instant(b.start));
}
export function actor(state: State, id: string): Person {
  const p = state.people.find(person => person.id === id);
  if (!p || !p.active || !p.appAccess) denied(); return p;
}
export function hasRole(state: State, p: Person, kind: Role, scope: string): boolean { return p.roles.some(role => role.kind === kind && role.scope === scope && (!role.endedAt || instant(role.endedAt) > instant(state.now))); }
export function leader(state: State, p: Person, groupId: string): boolean { return p.groupId === groupId && hasRole(state, p, 'group-leader', groupId); }
export function publisher(state: State, p: Person, groupId: string): boolean { return p.groupId === groupId && hasRole(state, p, 'publisher', groupId); }
export function unitLeader(state: State, p: Person): boolean { return hasRole(state, p, 'unit-leader', p.unitId); }
function validPlacement(state: State, id: string, placement: string, groupId: string): boolean { const p = state.people.find(person => person.id === id); return !!p && p.active && p.appAccess && p.placementId === placement && p.groupId === groupId; }
export function candidates(state: State, actorId: string): { id: string; name: string }[] {
  const p = actor(state, actorId);
  return state.people.filter(other => other.active && other.appAccess && other.groupId === p.groupId).map(({ id, name }) => ({ id, name }));
}
function manages(state: State, p: Person, session: Session): boolean {
  if (session.groupId !== p.groupId) return false;
  if (leader(state, p, session.groupId) || hasRole(state, p, 'scheduler', session.groupId)) return true;
  return unitLeader(state, p) && session.participants.every(id => state.people.find(person => person.id === id)?.unitId === p.unitId);
}
export function ownSession(state: State, p: Person, session: Session): boolean { return session.participants.includes(p.id) && validPlacement(state, p.id, session.placements[p.id], session.groupId); }
export function canReadSession(state: State, p: Person, session: Session): boolean { return ownSession(state, p, session) || manages(state, p, session); }
function getSession(state: State, p: Person, id: string): Session { const s = state.sessions.find(session => session.id === id); if (!s || !canReadSession(state, p, s)) denied(); return s; }
function currentVersion(actual: number, expected: number): void { if (actual !== expected) fail('STALE', 'This record changed. Review the current version before saving again.'); }
function covered(state: State, id: string, window: Window): boolean {
  const windows = state.availability[id]?.windows ?? []; let cursor = instant(window.start);
  for (const w of [...windows].sort((a,b) => instant(a.start) - instant(b.start))) { if (instant(w.start) > cursor) break; if (instant(w.end) > cursor) cursor = instant(w.end); if (cursor >= instant(window.end)) return true; }
  return false;
}
function noConflict(state: State, memberId: string, window: Window, exceptId: string): void {
  if (state.sessions.some(s => s.id !== exceptId && s.phase !== 'cancelled' && s.commitments[memberId] && overlaps(s.commitments[memberId], window))) fail('OVERLAP', 'A participant already has a commitment at this time. Choose another time.');
}
function validateSession(state: State, session: Session, checkSnapshot: boolean): void {
  if (instant(session.start) >= instant(session.end) || instant(session.start) <= instant(state.now)) fail('INVALID_TIME', 'Choose a future session with an end after its start.');
  if (!state.locations.some(location => location.id === session.locationId)) fail('INVALID', 'Choose an approved sample location.');
  for (const id of session.participants) {
    if (!validPlacement(state, id, session.placements[id], session.groupId)) denied();
    if (checkSnapshot && (state.availability[id]?.version ?? 0) !== session.availabilityVersions[id]) fail('STALE_AVAILABILITY', 'Availability changed. Refresh and review this proposal before publishing.');
    if (!covered(state, id, session)) fail('AVAILABILITY', 'Every participant needs confirmed availability covering this time.');
    noConflict(state, id, session, session.id);
  }
}
export type Command =
  | { kind: 'availability.save'; expected: number; ranges: Range[] }
  | { kind: 'plan.save'; id: string; expected: number; content: SafePlan }
  | { kind: 'plan.publish'; id: string; expected: number }
  | { kind: 'item.add'; week: string; itemKind: ReviewItem['kind']; text: string; nextAction: string; responsibleId: string }
  | { kind: 'request.create'; week: string; text: string; reviewerId: string }
  | { kind: 'request.respond'; id: string; expected: number; status: Request['status']; text: string }
  | { kind: 'session.create'; start: string; end: string; locationId: string; participants: string[] }
  | { kind: 'session.revise'; id: string; expected: number; start: string; end: string; locationId: string; participants: string[] }
  | { kind: 'session.publish'; id: string; expected: number }
  | { kind: 'session.respond'; id: string; expected: number; response: 'accepted' | 'declined' }
  | { kind: 'session.cancel'; id: string; expected: number }
  | { kind: 'report.save'; id: string; expected: number; expectedReport: number; outcome: Report['outcome']; summary: string; reason: string };
export function apply(state: State, actorId: string, command: Command, receipt: string): { state: State; resourceId: string; replayed: boolean } {
  const p = actor(state, actorId);
  if (!/^[A-Za-z0-9_-]{4,120}$/.test(receipt)) fail('INVALID', 'A retry receipt is required.');
  const key = `${p.id}:${p.placementId}:${receipt}`;
  const payload = JSON.stringify(command);
  // Reauthorize record reads before returning ANY previously stored result.
  if ('id' in command) {
    if (command.kind.startsWith('session.') || command.kind === 'report.save') getSession(state, p, command.id);
    if (command.kind.startsWith('plan.') && !state.plans.some(plan => plan.id === command.id && (command.kind === 'plan.publish' ? publisher(state,p,plan.groupId) : leader(state,p,plan.groupId)))) denied();
    if (command.kind === 'request.respond' && !visibleRequests(state,p).some(request => request.id === command.id)) denied();
  }
  if (command.kind === 'session.create' && command.participants.every(id => id !== p.id) && !leader(state,p,p.groupId) && !hasRole(state,p,'scheduler',p.groupId) && !unitLeader(state,p)) denied();
  // Recheck current capabilities even when returning a retry receipt.
  if (command.kind === 'item.add' || command.kind === 'request.create') {
    if (!leader(state,p,p.groupId) && !unitLeader(state,p)) denied();
  }
  if (command.kind.startsWith('session.') && 'id' in command) {
    const current = getSession(state,p,command.id);
    if (command.kind === 'session.publish' && !publisher(state,p,current.groupId)) denied();
    if (command.kind === 'session.respond' && !ownSession(state,p,current)) denied();
    if ((command.kind === 'session.revise' || command.kind === 'session.cancel') && current.creatorId !== p.id && !manages(state,p,current)) denied();
  }
  if (command.kind === 'report.save' && !ownSession(state,p,getSession(state,p,command.id))) denied();
  const previous = state.receipts[key];
  if (previous) { if (previous.payload !== payload) fail('RETRY_CONFLICT', 'This retry receipt belongs to a different action.'); return { state, resourceId: previous.resourceId, replayed: true }; }
  const next = structuredClone(state); const person = actor(next, actorId); const id = `gp-${++next.serial}`; let resourceId = id;
  switch (command.kind) {
    case 'availability.save': {
      const current = next.availability[p.id] ?? { version: 0, ranges: [], windows: [] };
      currentVersion(current.version, command.expected);
      next.availability[p.id] = { version: current.version + 1, ranges: structuredClone(command.ranges), windows: expandRanges(command.ranges) }; resourceId = p.id; break;
    }
    case 'plan.save': {
      const plan = next.plans.find(plan => plan.id === command.id); if (!plan || !leader(next, person, plan.groupId)) denied();
      currentVersion(plan.version, command.expected);
      plan.draft = { summary: text(command.content.summary, 'Review summary', false), activity: text(command.content.activity, 'Gospel plan'), nextAction: text(command.content.nextAction, 'Next action') }; plan.version++; resourceId = plan.id; break;
    }
    case 'plan.publish': {
      const plan = next.plans.find(plan => plan.id === command.id); if (!plan || !publisher(next,person,plan.groupId)) denied();
      currentVersion(plan.version,command.expected); text(plan.draft.activity,'Gospel plan'); text(plan.draft.nextAction,'Next action');
      plan.published = { version: plan.version, content: structuredClone(plan.draft), authorId: p.id, at: next.now }; resourceId = plan.id; break;
    }
    case 'item.add': {
      if (!leader(next,person,p.groupId) && !unitLeader(next,person)) denied();
      const responsible = actor(next,command.responsibleId); if (responsible.groupId !== p.groupId || (unitLeader(next,person) && !leader(next,person,p.groupId) && responsible.unitId !== p.unitId)) denied();
      if (weekOf(command.week) !== command.week || !['member-update','unit-contribution'].includes(command.itemKind)) fail('INVALID','Choose a valid review item.');
      next.items.push({ id, groupId:p.groupId, week:command.week, unitId:responsible.unitId, authorId:p.id, authorPlacementId:p.placementId, kind:command.itemKind, text:text(command.text,'Sample update'), nextAction:text(command.nextAction,'Next action'), responsibleId:responsible.id, responsiblePlacementId:responsible.placementId, version:1 }); break;
    }
    case 'request.create': {
      if (!leader(next,person,p.groupId) && !unitLeader(next,person)) denied();
      const reviewer = actor(next,command.reviewerId); if (!hasRole(next,reviewer,'overseer',p.groupId)) denied();
      if (weekOf(command.week) !== command.week) fail('INVALID','Choose a valid week.');
      const value=text(command.text,'Request'); next.requests.push({id,groupId:p.groupId,week:command.week,authorId:p.id,authorPlacementId:p.placementId,reviewerId:reviewer.id,text:value,version:1,status:'open',history:[{authorId:p.id,text:value,status:'open',at:next.now}]}); break;
    }
    case 'request.respond': {
      const request=next.requests.find(r=>r.id===command.id); if(!request || !visibleRequests(next,person).some(r=>r.id===request.id)) denied();
      if (request.reviewerId === p.id ? !['clarification','answered'].includes(command.status) : command.status !== 'open') denied();
      currentVersion(request.version,command.expected); request.history.push({authorId:p.id,text:text(command.text,'Response'),status:command.status,at:next.now});request.status=command.status;request.version++;resourceId=request.id;break;
    }
    case 'session.create':
    case 'session.revise': {
      const ids=[...command.participants]; if(ids.length!==2 || new Set(ids).size!==ids.length) fail('INVALID','Choose two distinct participants for this prototype.');
      const members=ids.map(id=>actor(next,id)); if(members.some(m=>m.groupId!==p.groupId)) denied();
      if(!ids.includes(p.id) && !leader(next,person,p.groupId) && !hasRole(next,person,'scheduler',p.groupId) && !(unitLeader(next,person) && members.every(m=>m.unitId===p.unitId))) denied();
      if(instant(command.start)<=instant(next.now) || instant(command.end)<=instant(command.start)) fail('INVALID_TIME','Choose a future session with an end after its start.');
      if(!next.locations.some(location=>location.id===command.locationId)) fail('INVALID','Choose an approved sample location.');
      const draft: Session={id,groupId:p.groupId,week:weekOf(dateInZone(command.start)),creatorId:p.id,version:1,start:command.start,end:command.end,locationId:command.locationId,phase:'proposal',participants:ids,placements:Object.fromEntries(members.map(m=>[m.id,m.placementId])),availabilityVersions:Object.fromEntries(ids.map(id=>[id,next.availability[id]?.version??0])),responses:Object.fromEntries(ids.map(id=>[id,{value:'pending' as const,version:1}])),commitments:{},history:[],reports:[]};
      ids.forEach(id=>noConflict(next,id,draft,command.kind==='session.revise'?command.id:draft.id));
      if(command.kind==='session.create') next.sessions.push(draft);
      else {
        const session=getSession(next,person,command.id);if(session.creatorId!==p.id && !manages(next,person,session)) denied();
        currentVersion(session.version,command.expected);if(session.phase==='cancelled'||session.reports.length||instant(session.start)<=instant(next.now)) fail('CLOSED','This session can no longer be revised.');
        session.history.push({version:session.version,start:session.start,end:session.end,locationId:session.locationId,participants:[...session.participants],responses:structuredClone(session.responses),at:next.now});
        Object.assign(session,{...draft,id:session.id,creatorId:session.creatorId,version:session.version+1,history:session.history,commitments:Object.fromEntries(Object.entries(session.commitments).filter(([id])=>ids.includes(id)))});
        ids.forEach(id=>session.responses[id]={value:'pending',version:session.version});resourceId=session.id;
      }
      break;
    }
    case 'session.publish': {
      const session=getSession(next,person,command.id);if(!publisher(next,person,session.groupId)) denied();currentVersion(session.version,command.expected);
      if(session.phase==='cancelled'||session.reports.length) fail('CLOSED','This session is closed.');validateSession(next,session,true);session.phase='published';resourceId=session.id;break;
    }
    case 'session.respond': {
      const session=getSession(next,person,command.id);if(!ownSession(next,person,session)) denied();currentVersion(session.version,command.expected);
      if(session.phase!=='published'||instant(session.end)<=instant(next.now)) fail('CLOSED','Responses are available for current published sessions.');
      if(!['accepted','declined'].includes(command.response)) fail('INVALID','Choose your response.');
      if(command.response==='accepted') { if(!covered(next,p.id,session)) fail('AVAILABILITY','Confirm your availability for this time first.'); noConflict(next,p.id,session,session.id);session.commitments[p.id]={start:session.start,end:session.end}; }
      else delete session.commitments[p.id];
      session.history.push({version:session.version,start:session.start,end:session.end,locationId:session.locationId,participants:[...session.participants],responses:structuredClone(session.responses),at:next.now});
      session.responses[p.id]={value:command.response,version:session.version};resourceId=session.id;break;
    }
    case 'session.cancel': {
      const session=getSession(next,person,command.id);if(session.creatorId!==p.id&&!manages(next,person,session)) denied();currentVersion(session.version,command.expected);
      if(session.reports.length||instant(session.start)<=instant(next.now)) fail('CLOSED','A past session needs an explicit result, not a cancellation.');
      session.phase='cancelled';session.version++;session.commitments={};resourceId=session.id;break;
    }
    case 'report.save': {
      const session=getSession(next,person,command.id);if(!ownSession(next,person,session)) denied();currentVersion(session.version,command.expected);currentVersion(session.reports.length,command.expectedReport);
      if(session.phase!=='published'||instant(session.end)>instant(next.now)) fail('CLOSED','Record a result after a published session ends.');
      if(!['completed','not-held'].includes(command.outcome)) fail('INVALID','Choose an explicit session outcome.');
      const reason=text(command.reason,'Correction reason',session.reports.length>0);
      session.reports.push({version:session.reports.length+1,authorId:p.id,outcome:command.outcome,summary:text(command.summary,'Group-safe result'),reason,at:next.now,groupId:session.groupId});resourceId=session.id;break;
    }
  }
  next.receipts[key]={payload,resourceId};next.audit.push({id,actorId:p.id,kind:command.kind,resourceId,at:next.now});
  return {state:next,resourceId,replayed:false};
}
export function visibleRequests(state: State, p: Person): Request[] { return state.requests.filter(r=>validPlacement(state,r.authorId,r.authorPlacementId,r.groupId) && ((r.authorId===p.id && (leader(state,p,r.groupId)||unitLeader(state,p))) || (r.reviewerId===p.id && hasRole(state,p,'overseer',r.groupId)))); }
export function project(state: State, actorId: string, week: string) {
  const p=actor(state,actorId);const plan=state.plans.find(plan=>plan.groupId===p.groupId&&plan.week===week);
  const canLead=leader(state,p,p.groupId), canUnit=unitLeader(state,p);
  const sessions=state.sessions.filter(s=>s.week===week&&canReadSession(state,p,s));
  const items=state.items.filter(i=>i.week===week&&i.groupId===p.groupId&&validPlacement(state,i.authorId,i.authorPlacementId,i.groupId)&&validPlacement(state,i.responsibleId,i.responsiblePlacementId,i.groupId)&&(canLead||(canUnit&&i.unitId===p.unitId)));
  return {me:{id:p.id,name:p.name},group:state.groups.find(g=>g.id===p.groupId),week,candidates:candidates(state,p.id),availability:structuredClone(state.availability[p.id]??{version:0,ranges:[],windows:[]}),plan:plan?{id:plan.id,published:structuredClone(plan.published),...(canLead?{version:plan.version,draft:structuredClone(plan.draft)}:{})}:null,items:structuredClone(items),requests:structuredClone(visibleRequests(state,p).filter(r=>r.week===week)),sessions:structuredClone(sessions),canLead,canUnit,canPublish:publisher(state,p,p.groupId),canSchedule:canLead||canUnit||hasRole(state,p,'scheduler',p.groupId),reviewers:canLead||canUnit?state.people.filter(r=>r.active&&r.appAccess&&hasRole(state,r,'overseer',p.groupId)).map(r=>({id:r.id,label:'Assigned sample overseer'})):[],completed:sessions.filter(s=>s.reports.at(-1)?.outcome==='completed').length,pendingReports:sessions.filter(s=>s.phase==='published'&&instant(s.end)<=instant(state.now)&&s.reports.length===0).length};
}
/** Minimized adapter example only; never written to the shared platform feed. */
export function myWeek(state: State, actorId: string) { const p=actor(state,actorId);return state.sessions.filter(s=>ownSession(state,p,s)&&s.phase==='published').map(s=>({id:`gospel-session:${s.id}`,version:s.version,start:s.start,end:s.end,label:'Preaching session',response:s.responses[p.id].value})); }
export function contactsHandoff(state: State, actorId: string, sessionId: string): {status:'unavailable';message:string} { const p=actor(state,actorId);getSession(state,p,sessionId);return {status:'unavailable',message:'Contacts integration is not connected. No contact was created, opened or shared.'}; }
