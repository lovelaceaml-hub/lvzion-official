/** Proposed policy for fictional simulation only. Never an authentication mechanism. */
export type Lifecycle = 'new' | 'active' | 'paused' | 'closed';
export type TaskState = 'scheduled' | 'completed' | 'cancelled';
export type Member = { id: string; name: string; group: string; placement: string; active: boolean; access: boolean; oversight?: string[]; stewardship?: string[]; technical?: boolean };
export type Share = { member: string; placement: string; methods: boolean; since: string; revokedAt?: string };
export type Interaction = { id: string; author: string; at: string; text: string; visibility: 'collaborators' | 'author' };
export type FollowUp = { id: string; assignee: string; due: string; action: string; state: TaskState; completedAt?: string; reason?: string };
export type Contact = { id: string; name: string; phone: string; preferred: 'unknown' | 'text' | 'phone' | 'email'; lifecycle: Lifecycle; doNotContact: boolean; archived: boolean; group: string; owner: string; ownerPlacement: string; version: number; shares: Share[]; interactions: Interaction[]; followUps: FollowUp[] };
export type Audit = { id: string; contactId: string; actor: string; action: string; at: string; version: number };
export type State = { members: Member[]; contacts: Contact[]; audit: Audit[]; receipts: { actor: string; requestId: string; signature: string }[] };
export type Command = { requestId: string; contactId: string; expectedVersion: number; action: 'share' | 'revoke' | 'interact' | 'schedule' | 'complete' | 'reassign' | 'status' | 'dnc' | 'archive' | 'duplicate-distinct'; target?: string; methods?: boolean; text?: string; visibility?: 'collaborators' | 'author'; due?: string; lifecycle?: Lifecycle };
export class PolicyError extends Error { code: 'DENIED' | 'CONFLICT' | 'INVALID' | 'REVIEW_REQUIRED'; constructor(code: 'DENIED' | 'CONFLICT' | 'INVALID' | 'REVIEW_REQUIRED') { super(code === 'CONFLICT' ? 'This record changed. Refresh before saving.' : code === 'REVIEW_REQUIRED' ? 'This action requires a separately approved review.' : code === 'INVALID' ? 'Review the sample action and try again.' : 'This record or action is not available.'); this.code=code; } }
const member = (s: State, id: string) => s.members.find(m => m.id === id);
const eligible = (m?: Member): m is Member => Boolean(m?.active && m.access);
export function onHold(s: State, c: Contact): boolean { const o = member(s, c.owner); return !eligible(o) || o.group !== c.group || o.placement !== c.ownerPlacement; }
export function owns(s: State, actor: string, c: Contact): boolean { return !onHold(s, c) && c.owner === actor; }
export function currentShare(s: State, actor: string, c: Contact): Share | undefined { const a = member(s, actor); if (!eligible(a) || onHold(s, c) || a.group !== c.group) return; return c.shares.find(x => x.member === actor && x.placement === a.placement && !x.revokedAt); }
export function mayRead(s: State, actor: string, c: Contact): boolean { return owns(s, actor, c) || Boolean(currentShare(s, actor, c)); }
export function maySteward(s: State, actor: string, c: Contact): boolean { const a = member(s, actor); return eligible(a) && a.group === c.group && Boolean(a.stewardship?.includes(c.group)); }
export function mayManage(s: State, actor: string, c: Contact): boolean { return owns(s, actor, c) || maySteward(s, actor, c); }
export function projectContact(s: State, actor: string, c: Contact) {
 if (!mayRead(s, actor, c)) return null;
 const own = owns(s, actor, c), grant = currentShare(s, actor, c);
 return { id: c.id, name: c.name, phone: own || grant?.methods ? c.phone : null, preferred: c.preferred, lifecycle: c.lifecycle, doNotContact: c.doNotContact, archived: c.archived, version: c.version, owner: member(s,c.owner)?.name ?? 'Responsible member', ownerId: c.owner, isOwner: own,
  collaborators: own ? c.shares.filter(x => !x.revokedAt).map(x => ({member:x.member, name:member(s,x.member)?.name ?? 'Collaborator',methods:x.methods})) : [],
  interactions: c.interactions.filter(i => i.visibility === 'author' ? i.author === actor : own || (grant && i.at >= grant.since)),
  followUps: c.followUps.filter(f => own || f.assignee === actor) };
}
export function visibleContacts(s: State, actor: string) { return s.contacts.map(c => projectContact(s,actor,c)).filter((c): c is NonNullable<typeof c> => c !== null); }
export function oversight(s: State, actor: string, now: string) {
 const a=member(s,actor); if(!eligible(a) || !a.oversight?.includes(a.group)) return null;
 const contacts=s.contacts.filter(c=>c.group===a.group && !c.archived);
 const tasks=contacts.flatMap(c=>c.followUps.filter(f=>f.state==='scheduled'));
 // No contact identifiers, names, per-member drilldowns, dates, methods or notes.
 return { active:contacts.filter(c=>c.lifecycle==='active').length, overdue:tasks.filter(f=>f.due<now).length, upcoming:tasks.filter(f=>f.due>=now).length, handoffs:contacts.filter(c=>onHold(s,c)).length };
}
export function handoffQueue(s: State, actor: string) { return s.contacts.filter(c=>maySteward(s,actor,c)).map(c=>({id:c.id,version:c.version,owner:member(s,c.owner)?.name ?? 'Unavailable member',onHold:onHold(s,c)})); }
export function duplicateCandidates(s: State, actor: string, id: string) {
 const visible=visibleContacts(s,actor), source=visible.find(c=>c.id===id); if(!source) throw new PolicyError('DENIED');
 const norm=(v:string)=>v.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
 return visible.filter(c=>c.id!==id && (norm(c.name)===norm(source.name) || (c.phone && source.phone && c.phone.replace(/\D/g,'')===source.phone.replace(/\D/g,'')))).map(c=>({id:c.id,name:c.name,reason:'Possible match, not proof of identity'}));
}
export function command(s: State, actor: string, q: Command, now: string): State {
 const a=member(s,actor), c=s.contacts.find(x=>x.id===q.contactId); if(!eligible(a) || !c) throw new PolicyError('DENIED');
 const manages=mayManage(s,actor,c), reads=mayRead(s,actor,c);
 const managerial=['share','revoke','reassign','status','archive'].includes(q.action);
 if(managerial ? !manages : !reads) throw new PolicyError('DENIED');
 if(!q.requestId || !Number.isInteger(q.expectedVersion) || !Number.isFinite(Date.parse(now))) throw new PolicyError('INVALID');
 const signature=JSON.stringify(q), receipt=s.receipts.find(r=>r.actor===actor && r.requestId===q.requestId);
 // Always reauthorize before consulting idempotency receipts; revoked access cannot retrieve old results.
 if(receipt) { if(receipt.signature!==signature) throw new PolicyError('CONFLICT'); return s; }
 if(c.version!==q.expectedVersion) throw new PolicyError('CONFLICT');
 if(c.archived) throw new PolicyError('DENIED');
 const next=structuredClone(s), record=next.contacts.find(x=>x.id===c.id)!;
 const cancel=(reason:string)=>{record.followUps=record.followUps.map(f=>f.state==='scheduled'?{...f,state:'cancelled' as const,reason}:f);};
 const target=q.target ? member(s,q.target) : undefined;
 switch(q.action) {
 case 'share':
  // Only the responsible member delegates; stewardship is not permission to disclose.
  if(!owns(s,actor,c) || c.doNotContact || c.lifecycle==='closed') throw new PolicyError('DENIED');
  if(!eligible(target) || target.id===c.owner) throw new PolicyError('INVALID');
  if(target.group!==c.group) throw new PolicyError('REVIEW_REQUIRED');
  if(record.shares.some(x=>x.member===target.id&&!x.revokedAt)) throw new PolicyError('CONFLICT');
  record.shares.push({member:target.id,placement:target.placement,methods:q.methods===true,since:now});break;
 case 'revoke':
  if(!owns(s,actor,c)) throw new PolicyError('DENIED');
  if(!record.shares.some(x=>x.member===q.target&&!x.revokedAt)) throw new PolicyError('INVALID');
  record.shares=record.shares.map(x=>x.member===q.target&&!x.revokedAt?{...x,revokedAt:now}:x);
  record.followUps=record.followUps.map(f=>f.assignee===q.target&&f.state==='scheduled'?{...f,state:'cancelled',reason:'sharing_revoked'}:f);break;
 case 'interact':
  if(!q.text?.trim() || q.text.length>500 || !['author','collaborators'].includes(q.visibility??'')) throw new PolicyError('INVALID');
  record.interactions.push({id:q.requestId,author:actor,at:now,text:q.text.trim(),visibility:q.visibility!});break;
 case 'schedule':
  if(record.doNotContact || !['new','active'].includes(record.lifecycle)) throw new PolicyError('DENIED');
  if(!q.due || !Number.isFinite(Date.parse(q.due)) || Date.parse(q.due)<=Date.parse(now) || !q.text?.trim() || q.text.length>160 || !eligible(target) || !mayRead(s,target.id,c)) throw new PolicyError('INVALID');
  if(!owns(s,actor,c) && target.id!==actor) throw new PolicyError('DENIED');
  if(record.followUps.some(f=>f.state==='scheduled')) throw new PolicyError('CONFLICT');
  record.followUps.push({id:q.requestId,assignee:target.id,due:new Date(q.due).toISOString(),action:q.text.trim(),state:'scheduled'});break;
 case 'complete': {
  const task=record.followUps.find(f=>f.id===q.target);
  if(!task || (task.assignee!==actor&&!owns(s,actor,c))) throw new PolicyError('DENIED');
  if(task.state!=='scheduled') throw new PolicyError('CONFLICT');
  if(record.doNotContact || !['new','active'].includes(record.lifecycle)) throw new PolicyError('DENIED');
  task.state='completed';task.completedAt=now;break;
 }
 case 'reassign':
  if(!eligible(target) || target.id===record.owner) throw new PolicyError('INVALID');
  if(target.group!==c.group) throw new PolicyError('REVIEW_REQUIRED');
  record.owner=target.id;record.ownerPlacement=target.placement;
  record.shares=record.shares.map(x=>x.revokedAt?x:{...x,revokedAt:now});cancel('handoff_review');break;
 case 'status': {
  if(!owns(s,actor,c)) throw new PolicyError('DENIED');
  const transitions:Record<Lifecycle,Lifecycle[]>={new:['active','paused','closed'],active:['paused','closed'],paused:['active','closed'],closed:['active']};
  if(!q.lifecycle || !transitions[record.lifecycle].includes(q.lifecycle)) throw new PolicyError('INVALID');
  if(record.doNotContact && q.lifecycle==='active') throw new PolicyError('REVIEW_REQUIRED');
  record.lifecycle=q.lifecycle;if(['paused','closed'].includes(q.lifecycle))cancel(q.lifecycle);break;
 }
 case 'dnc': record.doNotContact=true;record.lifecycle='closed';cancel('do_not_contact');break;
 case 'archive': if(!owns(s,actor,c) || record.lifecycle!=='closed')throw new PolicyError('DENIED');record.archived=true;cancel('archived');break;
 case 'duplicate-distinct': if(!q.target || !duplicateCandidates(s,actor,c.id).some(x=>x.id===q.target))throw new PolicyError('DENIED');break;
 default: throw new PolicyError('DENIED');
 }
 record.version++;
 next.audit.push({id:q.requestId,contactId:record.id,actor,action:q.action,at:now,version:record.version});
 next.receipts.push({actor,requestId:q.requestId,signature});return next;
}
export function safeIntegration() { return { key:'contacts', status:'draft', enabled:false, href:'/modules/contacts', activityTitle:'Private Contacts activity', notificationTitle:'Open LV Zion Official', notificationsEnabled:false, publicDisplay:false, offlineCache:false } as const; }
