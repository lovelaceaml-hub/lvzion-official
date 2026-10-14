import type {State,Contact} from './policy.ts';
export const NOW='2026-10-14T17:00:00.000Z';
export const NEXT='2026-10-15T18:00:00.000Z';
export const SAMPLE_NOTES=['Agreed to check availability next week.','Preferred communication method needs confirmation.','Follow-up completed; no further action agreed.'];
export function sampleContact(id:string,name:string,owner='maya',group='g1'):Contact { return {id,name,phone:'+1 202 555 0142',preferred:'text',lifecycle:'new',doNotContact:false,archived:false,group,owner,ownerPlacement:owner+'-p1',version:1,shares:[],interactions:[],followUps:[]}; }
export function fixture():State {
 const a=sampleContact('sample-avery','Avery Lane');a.lifecycle='active';a.followUps=[{id:'task-avery',assignee:'maya',due:'2026-10-14T16:00:00.000Z',action:'Confirm a suitable time',state:'scheduled'}];a.interactions=[{id:'note-1',author:'maya',at:'2026-10-12T19:00:00.000Z',text:'Agreed to check availability this week.',visibility:'collaborators'},{id:'note-2',author:'maya',at:'2026-10-12T19:10:00.000Z',text:'Sample author-only note. Not included in sharing or handoff.',visibility:'author'}];
 const b=sampleContact('sample-jordan','Jordan Ellis');b.phone='+1 202 555 0153';
 const c=sampleContact('sample-riley','Riley Chen','leo');c.phone='+1 202 555 0164';c.lifecycle='active';c.shares=[{member:'maya',placement:'maya-p1',methods:false,since:'2026-10-13T17:00:00.000Z'}];c.interactions=[{id:'shared-1',author:'leo',at:'2026-10-13T19:00:00.000Z',text:'Please help confirm a suitable time.',visibility:'collaborators'}];c.followUps=[{id:'task-riley',assignee:'maya',due:'2026-10-15T18:00:00.000Z',action:'Confirm a suitable time',state:'scheduled'}];
 const hidden=sampleContact('sample-private','Casey Brooks','noah','g2');
 return {members:[{id:'maya',name:'Maya (sample member)',group:'g1',placement:'maya-p1',active:true,access:true},{id:'leo',name:'Leo (sample collaborator)',group:'g1',placement:'leo-p1',active:true,access:true},{id:'sam',name:'Sam (oversight only)',group:'g1',placement:'sam-p1',active:true,access:true,oversight:['g1']},{id:'dina',name:'Dina (handoff steward)',group:'g1',placement:'dina-p1',active:true,access:true,stewardship:['g1']},{id:'noah',name:'Noah (different group)',group:'g2',placement:'noah-p1',active:true,access:true},{id:'rowan',name:'Rowan (technical admin)',group:'g1',placement:'rowan-p1',active:true,access:false,technical:true}],contacts:[a,b,c,hidden],audit:[],receipts:[]};
}
/** Fixed fixtures only: no user-entered identity, phone, file upload or address-book access. */
export function addSample(s:State,actor:string):State {
 const a=s.members.find(m=>m.id===actor);if(!a?.active || !a.access || a.id!=='maya')throw Error('Sample creation unavailable.');
 if(s.contacts.some(c=>c.id==='sample-taylor'))return s;
 const next=structuredClone(s);next.contacts.push(sampleContact('sample-taylor','Taylor Reed'));
 next.audit.push({id:'sample-create',actor,contactId:'sample-taylor',action:'create',at:NOW,version:1});return next;
}
