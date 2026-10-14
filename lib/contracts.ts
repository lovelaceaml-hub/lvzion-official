export type Person = { id: string; name: string; status?: 'active' | 'inactive' | 'intake'; groupId?: string; unitId?: string };
export type Entry = { id: string; name: string; parentId?: string; canManage?: boolean };
export type Onboarding = { requests: {id:string;name:string;email:string;status:string;memberId?:string;createdAt:string;reason?:string}[]; invitations:{id:string;memberId:string;email:string;delivery:string;expiresAt:string;consumedAt?:string;revokedAt?:string}[]; accounts:{memberId:string;username:string;enabled:boolean}[];linkedMemberIds:string[] };
export type Workspace = {
 onboarding?:Onboarding;
 self: Omit<Person,'groupId'|'unitId'> & { groupId: string | null; unitId: string | null; firstName?:string|null; lastName?:string|null };
 enrollment?: {state:'unassigned'|'assigned';placementHistory:{id:string;startedAt:string;endedAt:string|null;reason:string|null}[]};
 unassignedMembers?: {id:string;name:string;firstName?:string|null;lastName?:string|null;email:string|null;createdAt:string}[];
 permissions: { organization: boolean; memberManagement: boolean; departmentAdmin: boolean; technical: boolean };
 contacts: { email?: string | null; phone?: string | null };
 directory: Person[]; managedMembers: Person[]; categories: Entry[]; groups: Entry[]; units: Entry[];
 departments: (Entry & { members: Person[] })[];
 appointments: { id: string; memberId: string; role: string; unitId?: string; groupId?: string; departmentId?: string; endedAt?: string; effective: boolean }[];
 transfers: { id: string; memberId: string; name: string; status: string; unitId: string; requestedBy: string; canDecide: boolean }[];
 audit: { id: number; at: string; action: string; memberId: string; reason: string }[];
};
export const actions = ['member.create','member.rename','member.status','member.move','transfer.request','transfer.decide','department.membership','role.appoint','role.end','organization.create','profile.contacts','invitation.create','access.review','invitation.revoke','account.access','organization.rename','organization.archive','enrollment.assign','enrollment.reject'] as const;
export type Action = typeof actions[number];
export type Command = { action: Action; payload: Record<string,string>; requestId: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseCommand(value: unknown): Command {
 if (!value || typeof value !== 'object') throw new Error('Invalid command.');
 const x = value as Record<string,unknown>;
 if (!actions.includes(x.action as Action) || typeof x.requestId !== 'string' || !uuid.test(x.requestId)) throw new Error('Invalid command.');
 if (!x.payload || typeof x.payload !== 'object' || Array.isArray(x.payload)) throw new Error('Invalid command fields.');
 const p = x.payload as Record<string,unknown>;
 const allowed = ['memberId','unitId','groupId','departmentId','parentId','id','reason','name','status','decision','operation','role','kind','email','phone','tokenDigest','verified','enabled'];
 for (const [key,v] of Object.entries(p)) {
  if (!allowed.includes(key) || typeof v !== 'string' || v.length>500) throw new Error('Invalid command fields.');
  if (key.endsWith('Id') || key==='id') if (!uuid.test(v)) throw new Error('Invalid identifier.');
 }
 if (typeof p.reason !== 'string' || p.reason.trim().length<5 || p.reason.length>500) throw new Error('Explain the change in 5–500 characters.');
 if (p.name !== undefined && (typeof p.name!=='string' || p.name.trim().length<2 || p.name.trim().length>120)) throw new Error('Name must be 2–120 characters.');
 return { action:x.action as Action, payload:p as Record<string,string>, requestId:x.requestId };
}
export function normalizeIdentifier(value: unknown): string {
 if (typeof value!=='string') throw new Error('Invalid credentials.');
 const s=value.trim().toLowerCase();
 if (s.length>254 || !( /^[a-z][a-z0-9._-]{2,31}$/.test(s) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))) throw new Error('Invalid credentials.');
 return s;
}
export function safeNext(value: string | null): string { return value==='/activate' || value==='/reset-password' ? value : '/members'; }
export function sameOrigin(origin: string | null,expected: string): boolean {
 try { return origin!==null && new URL(origin).origin===new URL(expected).origin && origin===new URL(origin).origin; } catch { return false; }
}
