import type { Actor, Capability, Material, Person, Workspace } from './domain.ts';
export const SERIES = 'demo-morning-prayer';
export const DEMO_NOW = '2026-10-14T06:55:00-07:00';
export const PEOPLE:Person[] = [
 {id:'alex',name:'Alex Example',groupId:'group-a',active:true,eligible:true,moduleAccess:true,hostGrant:true},
 {id:'jordan',name:'Jordan Example',groupId:'group-a',active:true,eligible:true,moduleAccess:true,hostGrant:true},
 {id:'riley',name:'Riley Example',groupId:'group-b',active:true,eligible:true,moduleAccess:true,hostGrant:true},
 {id:'sam',name:'Sam Example',groupId:'group-b',active:false,eligible:false,moduleAccess:false,hostGrant:false},
];
const makeActor=(id:string,capabilities:Capability[],groupId='group-a'):Actor=>({id,groupId,active:true,moduleAccess:true,grants:capabilities.map(capability=>({seriesId:SERIES,capability}))});
export const PERSONAS:{key:string;label:string;description:string;actor:Actor}[] = [
 {key:'member',label:'Member / eligible host',description:'Your schedule, materials, hosting dates and requests.',actor:makeActor('alex',['view_schedule','join_gathering','volunteer_host','view_materials'])},
 {key:'other-member',label:'Another eligible host',description:'A fictional member in another group; their own requests only.',actor:makeActor('riley',['view_schedule','join_gathering','volunteer_host','view_materials'],'group-b')},
 {key:'reviewer',label:'Hosting request reviewer',description:'Review hosting requests, not schedule settings or PWP content.',actor:makeActor('reviewer',['view_schedule','review_requests','view_materials'])},
 {key:'scheduler',label:'Schedule coordinator',description:'Manage occurrences and assign eligible hosts; no request approval or material editing.',actor:makeActor('scheduler',['view_schedule','manage_schedule'])},
 {key:'editor',label:'PWP / reading editor',description:'Prepare checked material drafts; publication is separate.',actor:makeActor('editor',['view_schedule','view_materials','edit_materials'])},
 {key:'publisher',label:'Material publisher',description:'Publish checked material revisions; no hosting management.',actor:makeActor('publisher',['view_schedule','view_materials','publish_materials'])},
 {key:'technical',label:'Technical administrator only',description:'Technical authority does not grant access to this application.',actor:makeActor('technical',[])},
];
const material=(key:string,kind:Material['kind'],title:string,summary:string,items:string[]):Material=>({id:`material-${key}-1`,key,kind,revision:1,body:{title,summary,items,sourceLabel:'Fictional source prepared for interface review'},sourceState:'checked',state:'published',createdBy:'editor'});
export function demoWorkspace():Workspace {
 const materials:Material[]=[
  material('october-theme','pwp','October Work Mission plan','Fictional monthly theme. Real PWP wording will come only from an approved source.',['Monthly activity placeholder — not a real assignment.']),
  ...Array.from({length:5},(_,i)=>material(`october-week-${i+1}`,'pwp',`Week ${i+1} activity`,'Fictional content for this weekly card.',['Approved weekly activity will appear here.','A second source-supported item can appear when provided.'])),
  ...Array.from({length:3},(_,i)=>material(`reading-${i+1}`,'reading',`Daily reading · Example ${i+1}`,'This is a reading placeholder, not a sermon recap or a quotation.',['The approved reading title and permitted resource will appear here.','No source recording, scripture or real lesson text was imported.'])),
 ];
 const dates=['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-11-02','2026-11-03'];
 const occurrences=dates.map((date,i)=>{
  const hostId=['2026-10-16','2026-10-23','2026-10-28'].includes(date)?'alex':date==='2026-10-14'?'jordan':['2026-10-15','2026-10-20'].includes(date)?null:i%3===0?'riley':null;
  const offset=date.startsWith('2026-11')?'-08:00':'-07:00';
  return {id:`occ-${date}`,date,originalDate:date,startsAt:`${date}T07:00:00${offset}`,endsAt:`${date}T07:30:00${offset}`,timezone:'America/Los_Angeles',kind:(date==='2026-10-19'?'app_day':date==='2026-10-21'?'cancelled':'gathering') as 'app_day'|'cancelled'|'gathering',hostId:['2026-10-19','2026-10-21'].includes(date)?null:hostId,hostConfirmed:true,verified:date!=='2026-10-22',accessVerified:date==='2026-10-14',revision:1,readingId:`reading-${(i%3)+1}`,origin:'reference' as const,sourceHostId:hostId};
 });
 return {seriesId:SERIES,version:1,occurrences,people:structuredClone(PEOPLE),materials,publication:Object.fromEntries(materials.map(m=>[m.key,m.id])),requests:[{id:'demo-riley-oct15',occurrenceId:'occ-2026-10-15',memberId:'riley',kind:'volunteer',status:'pending',occurrenceRevision:1,revision:1,note:'',createdAt:'2026-10-13T08:00:00-07:00'}],audit:[],receipts:[]};
}
