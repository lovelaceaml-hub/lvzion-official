// Imported ONLY by the explicitly fictional rehearsal route. Never by the live module or API.
import {DEMO_NOW,askForChange,assign,assignmentProblem,available,canManage,canPlan,dateKey,displayName,dutiesFor,meta,resolveRequest,saveProgram,setDayOff,withdrawRequest} from './domain.ts';
import {demoState,DEMO_SONGS,PREVIEW_ACTORS} from './fixtures.ts';
import {WorshipError,parseCommand,parseWorkspace,parseCandidates,parseSongs} from './api-contract.ts';
import type {Command,Workspace,CandidateList,SongList,ProgramItem} from './api-contract.ts';
import type {WorshipTransport} from './client-transport.ts';
import type {Duty,State} from './domain.ts';
const id=(type:string,n:number)=>`${type}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export type Rehearsal={transport:WorshipTransport;staleNext:()=>void;loseNextResponse:()=>void;revoke:()=>void};
export function createRehearsal(persona:number):Rehearsal{
 let state:State=demoState(),revoked=false,stale=false,lost=false,availabilityVersion=0;
 const actor=PREVIEW_ACTORS[persona]?.actor;if(!actor)throw new Error('Unknown fictional persona');
 // Roll the fixture forward by whole weeks, keeping the original service ordering and no live data.
 const shift=Math.max(0,Math.ceil((Date.now()-Date.parse(DEMO_NOW))/(7*86400000)))*7*86400000;
 state.services=state.services.map(s=>({...s,startsAt:new Date(Date.parse(s.startsAt)+shift).toISOString(),endsAt:new Date(Date.parse(s.endsAt)+shift).toISOString()}));
 const now=new Date(Date.parse(DEMO_NOW)+shift).toISOString();
 const members=new Map(state.members.map((m,n)=>[m.id,id('a',n+1)])),services=new Map(state.services.map((s,n)=>[s.id,id('b',n+1)])),songs=new Map(DEMO_SONGS.map((s,n)=>[s.id,id('c',n+1)]));
 const reverse=(map:Map<string,string>,value:string)=>{const result=[...map].find(([,mapped])=>mapped===value)?.[0];if(!result)throw new WorshipError('Fictional record unavailable.',403,'access');return result;};
 const requestId=(index:number)=>id('d',index+1);
 const request=(value:string)=>{const r=state.requests.find((_,index)=>requestId(index)===value);if(!r)throw new WorshipError('Request unavailable.',403,'access');return r;};
 const guard=async()=>{await new Promise(r=>setTimeout(r,120));if(revoked)throw new WorshipError('Your access changed. The workspace has been cleared.',403,'access');};
 const workspace=async():Promise<Workspace>=>{
  await guard();const self=state.members.find(m=>m.id===actor.memberId)!;
  return parseWorkspace({memberId:members.get(actor.memberId),timezone:'America/Los_Angeles',now,manageDepartments:actor.manageDepartments,availabilityVersion,daysOff:self.daysOff,
   services:state.services.map(s=>({id:services.get(s.id),worship:s.worship,period:s.period,startsAt:s.startsAt,endsAt:s.endsAt,status:s.status,version:s.version,canPlan:canPlan(actor,s),assignments:Object.entries(s.assignments).map(([key,member])=>{const d=key as Duty,name=displayName(state,actor,member,d),target=state.members.find(m=>m.id===member);return{dutyId:d,filled:!!member,isMine:member===actor.memberId,name,memberId:name==='Assigned member'?null:members.get(member!)??null,availabilityConflict:member===actor.memberId||canManage(actor,d)?!!target&&!available(target,s):null};})})),
   requests:state.requests.flatMap((r,n)=>{if(r.memberId!==actor.memberId&&!canManage(actor,r.duty))return[];const s=state.services.find(s=>s.id===r.serviceId)!;return[{id:requestId(n),serviceId:services.get(r.serviceId),dutyId:r.duty,isMine:r.memberId===actor.memberId,status:r.status,stale:s.assignments[r.duty]!==r.memberId||Date.parse(s.startsAt)<=Date.parse(now)}];}),
   programs:state.programs.filter(p=>canPlan(actor,state.services.find(s=>s.id===p.serviceId)!)).map(p=>({serviceId:services.get(p.serviceId),status:p.status,version:p.version,items:[...p.preparation.map((song,n)=>({section:'preparation',position:n+1,songId:songs.get(song)})),...(['glory','thanks','choir'] as const).filter(section=>p[section]).map(section=>({section,position:1,songId:songs.get(p[section])}))]}))
  });
 };
 const candidates=async(serviceId:string,dutyId:Duty):Promise<CandidateList>=>{
  await guard();if(!canManage(actor,dutyId))throw new WorshipError('Not authorized for this department.',403,'access');const s=state.services.find(s=>s.id===reverse(services,serviceId))!;
  return parseCandidates({kind:'candidates',serviceId,dutyId,version:s.version,hasMore:false,candidates:state.members.filter(m=>m.active&&m.departments.includes(meta(dutyId).department)&&m.qualifications.includes(dutyId)).map(m=>{const problem=assignmentProblem(s,dutyId,m,now);return{id:members.get(m.id),name:m.name,eligible:!problem,reason:!problem?'available':!available(m,s)?'unavailable':'conflict',manualOnly:m.manualOnly.includes(meta(dutyId).department),paired:dutyId.startsWith('usher_')&&dutiesFor(s,m.id).some(d=>['thanks_prayer','closing_prayer'].includes(d))};}).sort((a,b)=>Number(a.manualOnly)-Number(b.manualOnly)||Number(b.paired)-Number(a.paired)||a.name.localeCompare(b.name))});
 };
 const catalog=async(serviceId:string):Promise<SongList>=>{await guard();const s=state.services.find(s=>s.id===reverse(services,serviceId))!;if(!canPlan(actor,s))throw new WorshipError('Not authorized for this service plan.',403,'access');return parseSongs({kind:'songs',serviceId,hasMore:false,songs:DEMO_SONGS.map((s,n)=>({id:songs.get(s.id),code:`DEMO-${n+1}`,title:s.title,seconds:s.seconds}))});};
 const command=async(raw:Command)=>{
  await guard();const c=parseCommand(raw);if(stale){stale=false;throw new WorshipError('This record changed. Reload and review it before saving.',409,'stale');}
  try{
   if('serviceId' in c){const s=state.services.find(s=>s.id===reverse(services,c.serviceId))!;if(c.expectedVersion!==s.version)throw new WorshipError('The service changed. Reload.',409,'stale');}
   switch(c.op){
   case 'assign':state=assign(state,actor,reverse(services,c.serviceId),c.dutyId,c.memberId?reverse(members,c.memberId):null,c.expectedVersion,now);break;
   case 'request':state=askForChange(state,actor,reverse(services,c.serviceId),c.dutyId,now);break;
   case 'withdraw':state=withdrawRequest(state,actor,request(c.requestId).id);break;
   case 'resolve':state=resolveRequest(state,actor,request(c.requestId).id,c.decision,c.memberId?reverse(members,c.memberId):null,c.expectedVersion,now);break;
   case 'availability':if(c.expectedVersion!==availabilityVersion)throw new WorshipError('Availability changed.',409,'stale');state=setDayOff(state,actor,c.day,c.unavailable);availabilityVersion++;break;
   case 'program':{
    const get=(section:ProgramItem['section'])=>c.items.filter(i=>i.section===section).sort((a,b)=>a.position-b.position).map(i=>reverse(songs,i.songId));
    state=saveProgram(state,actor,{serviceId:reverse(services,c.serviceId),status:c.status,version:c.expectedProgramVersion,preparation:get('preparation'),glory:get('glory')[0]??'',thanks:get('thanks')[0]??'',choir:get('choir')[0]??''},DEMO_SONGS,c.expectedProgramVersion,now);break;
   }
   }
  }catch(e){if(e instanceof WorshipError)throw e;throw new WorshipError(e instanceof Error?e.message:'Fictional change refused.',422,'rule');}
  if(lost){lost=false;throw new WorshipError('Connection interrupted. A save may have completed. Reload to verify before trying again.',0,'connection');}
 };
 return{transport:{workspace,candidates,songs:catalog,command},staleNext:()=>{stale=true;},loseNextResponse:()=>{lost=true;},revoke:()=>{revoked=true;}};
}
