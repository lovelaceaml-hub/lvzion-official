/** Wire contracts for the authenticated Contacts adapter. No fixtures or permissions live here. */
export class ContactsContractError extends Error {constructor(){super('Invalid Contacts data.');}}
const fail=():never=>{throw new ContactsContractError();};
const uuid=(v:unknown):string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v.toLowerCase():fail();
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail();
const text=(v:unknown,min:number,max:number):string=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)?v.trim():fail();
const choice=<T extends string>(v:unknown,values:readonly T[]):T=>typeof v==='string'&&values.includes(v as T)?v as T:fail();
const bool=(v:unknown):boolean=>typeof v==='boolean'?v:fail();
const integer=(v:unknown,min:number):number=>Number.isSafeInteger(v)&&(v as number)>=min?v as number:fail();
const time=(v:unknown):string=>{const s=text(v,1,40);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))return fail();return new Date(s).toISOString();};
const array=(v:unknown,max:number):unknown[]=>Array.isArray(v)&&v.length<=max?v:fail();
function exact(o:Record<string,unknown>,keys:string[]){if(Object.keys(o).some(k=>!keys.includes(k)))fail();}
export const lifecycle=['new','active','paused','closed'] as const;
export const methods=['unknown','text','phone','email'] as const;
export type Lifecycle=typeof lifecycle[number];
export type PreferredMethod=typeof methods[number];
const fields:Record<string,string[]>={create:['name','preferred','phone'],edit:['name','preferred'],share:['target','methods'],revoke:['target'],interact:['text','visibility'],schedule:['target','due','text'],complete:['target'],reassign:['target'],status:['lifecycle'],dnc:[],archive:[],restore:[],reschedule:['target','due'],'cancel-followup':['target'],'correct-interaction':['target','text'],'duplicate-distinct':['target']};
export type Operation=keyof typeof fields;
export type DatabaseCommand={p_id:string;p_version:number;p_request:string;p_op:string;p_data:Record<string,string|boolean>};
export function parseDatabaseCommand(input:unknown):DatabaseCommand{
 const o=object(input);exact(o,['id','version','requestId','operation','data']);
 const op=text(o.operation,1,32);if(!Object.hasOwn(fields,op))fail();
 const data=object(o.data);exact(data,fields[op]);
 const v=integer(o.version,0);if(op==='create'?v!==0:v<1)fail();
 const parsed:Record<string,string|boolean>={};
 if('name'in data)parsed.name=text(data.name,2,120).normalize('NFKC');
 if('phone'in data)parsed.phone=text(data.phone,3,30);
 if('preferred'in data)parsed.preferred=choice(data.preferred,methods);
 if('lifecycle'in data)parsed.lifecycle=choice(data.lifecycle,lifecycle);
 if('methods'in data)parsed.methods=bool(data.methods);
 if('target'in data)parsed.target=uuid(data.target);
 if('due'in data)parsed.due=time(data.due);
 if('text'in data)parsed.text=text(data.text,1,op==='schedule'?160:500);
 if('visibility'in data)parsed.visibility=choice(data.visibility,['author','collaborators'] as const);
 const required:Record<string,string[]>={create:['name'],share:['target'],revoke:['target'],interact:['text','visibility'],schedule:['target','due','text'],complete:['target'],reassign:['target'],status:['lifecycle'],reschedule:['target','due'],'cancel-followup':['target'],'correct-interaction':['target','text'],'duplicate-distinct':['target']};
 if((required[op]??[]).some(k=>!(k in parsed)))fail();
 if(op==='edit'&&!('name'in parsed)&&!('preferred'in parsed))fail();
 return {p_id:uuid(o.id),p_version:v,p_request:uuid(o.requestId),p_op:op,p_data:parsed};
}
export function parseRecordId(input:unknown){const o=object(input);exact(o,['id']);return uuid(o.id);}
export function parseWorkspaceRequest(input:unknown){const o=object(input);exact(o,['after']);return o.after===undefined||o.after===null?null:uuid(o.after);}
export type ContactSummary={id:string;version:number;name:string;ownerId:string;lifecycle:Lifecycle;preferred:PreferredMethod;doNotContact:boolean;archived:boolean};
export type ContactDetail=ContactSummary&{methods:{kind:'phone'|'email';value:string}[];interactions:{id:string;author:string;at:string;text:string;visibility:'author'|'collaborators';supersedes:string|null}[];followUps:{id:string;assignee:string;due:string;action:string;state:'scheduled'|'completed'|'cancelled';completedAt:string|null;reason:string|null}[]};
function summary(value:unknown):ContactSummary{const o=object(value);return {id:uuid(o.id),version:integer(o.version,1),name:text(o.name,2,120),ownerId:uuid(o.owner),lifecycle:choice(o.lifecycle,lifecycle),preferred:choice(o.preferred,methods),doNotContact:bool(o.do_not_contact),archived:bool(o.archived)};}
export function parseContactDetail(value:unknown):ContactDetail{
 const o=object(value),base=summary(o);
 return {...base,
 methods:array(o.methods,8).map(v=>{const m=object(v);return {kind:choice(m.kind,['phone','email'] as const),value:text(m.value,3,254)};}),
 interactions:array(o.interactions,200).map(v=>{const i=object(v);return {id:uuid(i.id),author:uuid(i.author),at:time(i.at),text:text(i.text,1,500),visibility:choice(i.visibility,['author','collaborators'] as const),supersedes:i.supersedes===null?null:uuid(i.supersedes)};}),
 followUps:array(o.follow_ups,200).map(v=>{const f=object(v);return {id:uuid(f.id),assignee:uuid(f.assigned),due:time(f.due),action:text(f.action,1,160),state:choice(f.state,['scheduled','completed','cancelled'] as const),completedAt:f.completed_at===null?null:time(f.completed_at),reason:f.reason===null?null:text(f.reason,1,40)};})};
}
export function parseWorkspace(value:unknown){const o=object(value);return {memberId:uuid(o.member_id),canCreate:bool(o.can_create),contacts:array(o.contacts,100).map(summary),nextCursor:o.next_cursor===null?null:uuid(o.next_cursor)};}
export type ContactsWorkspace=ReturnType<typeof parseWorkspace>;
export function parseReceipt(value:unknown,expected:string){const o=object(value);const id=uuid(o.id);if(id!==expected.toLowerCase())fail();return {id,version:integer(o.version,1)};}
export function parseDuplicateResults(value:unknown){return array(value,20).map(v=>{const o=object(v);return {id:uuid(o.id),name:text(o.name,2,120)};});}
export function parseAgenda(value:unknown){return array(value,100).map(v=>{const o=object(v);if(o.title!=='Private Contacts activity'||o.href!=='/modules/contacts'||o.delivery_enabled!==false)fail();return {id:uuid(o.id),title:'Private Contacts activity',href:'/modules/contacts',deliveryEnabled:false};});}
