/** R2 proposed workflow. Pure, fictional preview only; no database or communications. */
import {command,owns,mayRead,visibleContacts,PolicyError,currentShare} from './policy.ts';
import type {State,Command,Contact,Lifecycle} from './policy.ts';
export type ExtensionCommand={requestId:string;contactId:string;expectedVersion:number;action:'edit'|'reschedule'|'cancel-followup'|'restore'|'correct-interaction';target?:string;due?:string;text?:string;preferred?:Contact['preferred'];name?:string};
export type WorkflowCommand=Command|ExtensionCommand;
export type Filter='open'|'attention'|'closed'|'archived';
const extraActions=new Set(['edit','reschedule','cancel-followup','restore','correct-interaction']);
const keys:Record<string,string[]>={share:['target','methods'],revoke:['target'],interact:['text','visibility'],schedule:['target','due','text'],complete:['target'],reassign:['target'],status:['lifecycle'],dnc:[],archive:[],'duplicate-distinct':['target'],edit:['name','preferred'],reschedule:['target','due'],'cancel-followup':['target'],restore:[],'correct-interaction':['target','text']};
const base=['requestId','contactId','expectedVersion','action'];
export function validateCommand(input:unknown):WorkflowCommand {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new PolicyError('INVALID');
 const q=input as Record<string,unknown>;
 if(typeof q.action!=='string'||!Object.hasOwn(keys,q.action)||Object.keys(q).some(k=>![...base,...keys[q.action as string]].includes(k)))throw new PolicyError('INVALID');
 if(typeof q.requestId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(q.requestId)||typeof q.contactId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(q.contactId)||!Number.isSafeInteger(q.expectedVersion)||(q.expectedVersion as number)<1)throw new PolicyError('INVALID');
 for(const k of ['target','due','text','name','preferred','visibility','lifecycle'])if(q[k]!==undefined&&(typeof q[k]!=='string'||(q[k] as string).length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(q[k] as string)))throw new PolicyError('INVALID');
 if(q.methods!==undefined&&typeof q.methods!=='boolean')throw new PolicyError('INVALID');
 // Canonical key order makes identical semantic retries independent of JSON object order.
 return Object.fromEntries([...base,...keys[q.action]].filter(k=>q[k]!==undefined).map(k=>[k,q[k]])) as WorkflowCommand;
}
export function applyWorkflow(s:State,actor:string,input:unknown,now:string):State {
 const q=validateCommand(input);if(!Number.isFinite(Date.parse(now)))throw new PolicyError('INVALID');
 const c=s.contacts.find(c=>c.id===q.contactId);
 // This projection also enforces current membership, module access and placement.
 if(!c||(!mayRead(s,actor,c)&&q.action!=='reassign'))throw new PolicyError('DENIED');
 if(!extraActions.has(q.action))return command(s,actor,q as Command,now);
 const x=q as ExtensionCommand,owner=owns(s,actor,c!);
 if(['edit','restore'].includes(x.action)&&!owner)throw new PolicyError('DENIED');
 if(x.action==='restore'?!c!.archived:c!.archived)throw new PolicyError('DENIED');
 const signature=JSON.stringify(x),prior=s.receipts.find(r=>r.actor===actor&&r.requestId===x.requestId);
 if(prior){if(prior.signature!==signature)throw new PolicyError('CONFLICT');return s;}
 if(c!.version!==x.expectedVersion)throw new PolicyError('CONFLICT');
 const next=structuredClone(s),record=next.contacts.find(v=>v.id===x.contactId)!;
 switch(x.action){
 case 'edit':
  if(x.name===undefined&&x.preferred===undefined)throw new PolicyError('INVALID');
  if(x.name!==undefined){const name=x.name.normalize('NFKC').trim();if(name.length<2||name.length>120)throw new PolicyError('INVALID');record.name=name;}
  if(x.preferred!==undefined){if(!['unknown','text','phone','email'].includes(x.preferred))throw new PolicyError('INVALID');record.preferred=x.preferred;}break;
 case 'reschedule':case 'cancel-followup':{
  const task=record.followUps.find(t=>t.id===x.target);if(!task||(!owner&&task.assignee!==actor))throw new PolicyError('DENIED');
  if(task.state!=='scheduled')throw new PolicyError('CONFLICT');
  if(x.action==='reschedule'){
   if(record.doNotContact||!['new','active'].includes(record.lifecycle)||!mayRead(s,task.assignee,c!))throw new PolicyError('DENIED');
   const due=Date.parse(x.due??'');if(!Number.isFinite(due)||due<=Date.parse(now)||due>Date.parse(now)+366*86400000)throw new PolicyError('INVALID');
   record.followUps.push({...task,id:x.requestId,due:new Date(due).toISOString()});
  }
  task.state='cancelled';task.reason=x.action==='reschedule'?'rescheduled':'agreed_cancellation';break;
 }
 case 'restore':record.archived=false;break; // Remains Closed and preserves any do-not-contact restriction.
 case 'correct-interaction':{
  const note=record.interactions.find(i=>i.id===x.target);
  if(!note||note.author!==actor)throw new PolicyError('DENIED');
  if(!x.text?.trim()||x.text.length>500)throw new PolicyError('INVALID');
  // Append correction; never rewrite the original or widen its audience.
  record.interactions.push({id:x.requestId,author:actor,at:now,visibility:note.visibility,text:'Correction: '+x.text.trim().slice(0,488)});break;
 }
 }
 record.version++;next.audit.push({id:x.requestId,actor,contactId:record.id,action:x.action,at:now,version:record.version});next.receipts.push({actor,requestId:x.requestId,signature});return next;
}
export function contactList(s:State,actor:string,filter:Filter,search:string,now:string){
 const query=search.normalize('NFKC').trim().toLocaleLowerCase('en-US').slice(0,120);
 // Search only after field authorization. No hidden-name/hidden-phone match oracle.
 return visibleContacts(s,actor).filter(c=>{
  if(filter==='archived'?!c.archived:c.archived)return false;
  if(filter==='open'&&c.lifecycle==='closed')return false;
  if(filter==='closed'&&c.lifecycle!=='closed')return false;
  if(filter==='attention'&&!c.followUps.some(f=>f.state==='scheduled'&&Date.parse(f.due)<Date.parse(now)))return false;
  return !query||[c.name,c.phone??''].some(v=>v.toLocaleLowerCase('en-US').includes(query));
 }).sort((a,b)=>a.name.localeCompare(b.name,'en-US'));
}
export function changeHistory(s:State,actor:string,id:string){
 const c=s.contacts.find(c=>c.id===id);if(!c||!owns(s,actor,c))return [];
 return s.audit.filter(e=>e.contactId===id&&(!['interact','correct-interaction'].includes(e.action)||e.actor===actor)).map(e=>({id:e.id,action:e.action,at:e.at,version:e.version,actor:e.actor===actor?'You':'Authorized collaborator'})).reverse();
}
export function privateAgenda(s:State,actor:string){
 return visibleContacts(s,actor).filter(c=>!c.archived&&!c.doNotContact&&['new','active'].includes(c.lifecycle)).flatMap(c=>c.followUps.filter(t=>t.state==='scheduled'&&t.assignee===actor).map(t=>({id:t.id,module:'contacts',title:'Private Contacts activity',href:'/modules/contacts',deliveryEnabled:false} as const)));
}
export function remainingTransitions(c:{lifecycle:Lifecycle;doNotContact:boolean;archived:boolean}):Lifecycle[]{
 if(c.archived)return [];
 const transitions:Record<Lifecycle,Lifecycle[]>={new:['active','paused','closed'],active:['paused','closed'],paused:['active','closed'],closed:['active']};
 return transitions[c.lifecycle].filter(x=>!c.doNotContact||x!=='active');
}
export function currentCollaborators(s:State,actor:string,id:string){
 const c=s.contacts.find(c=>c.id===id);if(!c||!owns(s,actor,c))return [];
 return s.members.filter(m=>currentShare(s,m.id,c)).map(m=>({id:m.id,name:m.name}));
}
