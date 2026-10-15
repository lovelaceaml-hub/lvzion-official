'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {CATALOG,departmentOf,dutyLabel as title,hasChoir,hasDuty,hasThanks} from '../../lib/worship-duty/domain';
import type {Duty} from '../../lib/worship-duty/domain';
import {WorshipError,firstSuggestion,isClosed} from '../../lib/worship-duty/api-contract';
import type {CandidateList,Command,ProgramItem,ProgramView,RequestView,ServiceView,SongList,Workspace} from '../../lib/worship-duty/api-contract';
import {createHttpTransport} from '../../lib/worship-duty/client-transport';
import type {WorshipTransport} from '../../lib/worship-duty/client-transport';
import {serviceLabel,vegasDate} from '../../lib/worship-duty/service-time';
import {useUnsavedPlan} from './use-unsaved-plan';
import MonthlyPlanner from './monthly-planner';
import './worship-duty.css';
import './connected-workspace.css';
const localDate=(s:ServiceView)=>vegasDate(s.startsAt);
const label=(s:ServiceView)=>serviceLabel(s.startsAt);
type Tab='mine'|'presider'|'manage';
type Act=(command:Command)=>Promise<boolean>;
const asError=(error:unknown)=>error instanceof WorshipError?error:new WorshipError('The workspace could not be loaded. Reload to verify your access.',503,'unavailable');

export default function ConnectedWorkspace({canSetup=false}:{canSetup?:boolean}){
 const api=useMemo(()=>createHttpTransport(),[]);
 const {markDirty,permitNavigation}=useUnsavedPlan();
 const [data,setData]=useState<Workspace|null>(null),[tab,setTab]=useState<Tab>('mine'),[selected,setSelected]=useState('');
 const [loading,setLoading]=useState(true),[pending,setPending]=useState(false),[readOnly,setReadOnly]=useState(false),[message,setMessage]=useState(''),[issue,setIssue]=useState<WorshipError|null>(null);
 const generation=useRef(0),writeLock=useRef(false),alive=useRef(true);
 const error=useCallback((e:unknown)=>{
  if(!alive.current)return;
  const value=asError(e);setIssue(value);
  if(value.status===401||value.status===403){
   // Confidentiality takes priority over draft retention when authorization ends.
   markDirty(false);generation.current++;setData(null);setSelected('');setTab('mine');setLoading(false);
  }
  if(value.status!==422&&value.status!==400)setReadOnly(true);
 },[markDirty]);
 const load=useCallback(async(clear=false)=>{
  const current=++generation.current;if(clear)setData(null);setLoading(true);
  try{const next=await api.workspace();if(current!==generation.current||!alive.current)return false;setData(next);setReadOnly(false);setIssue(null);setSelected(old=>next.services.some(s=>s.id===old)?old:next.services[0]?.id??'');return true;}
  catch(e){if(current===generation.current)error(e);return false;}finally{if(current===generation.current&&alive.current)setLoading(false);}
 },[api,error]);
 useEffect(()=>{alive.current=true;markDirty(false);setTab('mine');setSelected('');setIssue(null);setMessage('');setReadOnly(false);void load(true);return()=>{alive.current=false;markDirty(false);generation.current++;};},[load,markDirty]);
 const act:Act=async command=>{
  if(writeLock.current||readOnly||loading)return false;
  if(command.op!=='batch'&&command.op!=='program'&&!permitNavigation())return false;
  writeLock.current=true;setPending(true);setIssue(null);setMessage('');let accepted=false;
  try{
   await api.command(command);accepted=true;
   if(!alive.current)return false;
   const refreshed=await load();
   if(!alive.current)return false;
   setMessage(refreshed?'Saved.':'Save was accepted, but the refreshed schedule is unavailable. Reload; do not submit it again.');
   if(!refreshed)setReadOnly(true);return refreshed;
  }catch(e){if(alive.current){error(e);if(!accepted&&(asError(e).status===0||asError(e).status>=500))setMessage('Save status is uncertain. Reload to verify before trying again.');}return false;}
  finally{writeLock.current=false;if(alive.current)setPending(false);}
 };
 const service=data?.services.find(s=>s.id===selected),planServices=data?.services.filter(s=>s.canPlan)??[];
 const upcoming=data?.services.filter(s=>s.status==='published'&&!isClosed(s,data.now)&&s.assignments.some(a=>a.isMine))??[];
 const canManage=!!data?.manageDepartments.length,canPreside=planServices.length>0;
 const safeTab=tab==='manage'&&!canManage||tab==='presider'&&!canPreside?'mine':tab;
 const changeTab=(next:Tab)=>{if(next===safeTab||!permitNavigation())return;setTab(next);setMessage('');if(next==='presider'&&!planServices.some(s=>s.id===selected))setSelected(planServices[0]?.id??'');};
 const reload=()=>{if(permitNavigation()){setMessage('');void load(true);}};
 return <div className="wd-stage"><div className="wd-shell">
  <header className="wd-header"><a className="wd-back" href="/members" onClick={e=>{if(!permitNavigation())e.preventDefault();}}>‹ LV Zion</a>{canSetup&&<a href="/modules/worship-duty/setup" onClick={e=>{if(!permitNavigation())e.preventDefault();}}>Setup</a>}<button type="button" disabled={loading||pending} onClick={reload}>Reload</button></header>
  <main className="wd-main" aria-busy={loading||pending}>
   <div className="wd-heading"><span className="wd-kicker">WORSHIP DUTY</span><h1>{safeTab==='mine'?'My Duties':safeTab==='presider'?'Presider':'Manage'}</h1><p>Your authorized services and assignments.</p></div>
   {message&&<p className="wd-notice" role="status">{message}</p>}
   {issue&&<div className="wd-notice wd-error" role="alert"><p>{issue.message}</p>{(issue.status===401||issue.status===403)?<a href="/sign-in">Sign in</a>:<button type="button" disabled={pending||loading} onClick={reload}>Reload workspace</button>}</div>}
   {loading&&!data&&<p role="status">Loading your workspace…</p>}
   {!loading&&!data&&!issue&&<p>No workspace is available.</p>}
   {data&&<fieldset className="wc-controls" disabled={pending||readOnly||loading}>
    {readOnly&&<p className="wd-warning">Read-only until the latest schedule and permissions are verified.</p>}
    {safeTab==='mine'&&<>
     {upcoming.length?upcoming.map((s,index)=><section className={index===0?'wd-card wc-next':'wd-card'} key={s.id}><span className="wd-kicker">{index===0?'NEXT SERVICE':'COMING UP'}</span><h2>{label(s)}</h2><p>{s.worship} · {s.period}</p>{s.assignments.filter(a=>a.isMine).map(a=>{const r=data.requests.find(r=>r.serviceId===s.id&&r.dutyId===a.dutyId&&r.isMine&&r.status==='pending');return <div className="wd-own-duty" key={a.dutyId}><h3>{title(a.dutyId)}</h3>{a.availabilityConflict&&<p className="wd-warning">You marked this time unavailable. You are still assigned.</p>}{r?<><p>You remain assigned until your leader answers.</p><button type="button" onClick={()=>void act({op:'withdraw',requestId:r.id})}>Withdraw {title(a.dutyId)} request</button></>:<button type="button" onClick={()=>void act({op:'request',serviceId:s.id,dutyId:a.dutyId,expectedVersion:s.version})}>Request change for {title(a.dutyId)}</button>}</div>;})}{s.assignments.filter(a=>a.isMine).length===2&&<p className="wd-approved">Two duties are recorded for this service. The server verifies the approved pairing.</p>}</section>):<section className="wd-card wd-empty"><h2>No upcoming duties</h2><p>Your published assignments will appear here.</p></section>}
     <h2>Service schedule</h2>
    </>}
    <label className="wd-service-picker">Selected service<select aria-label="Selected service" value={selected} onChange={e=>{if(permitNavigation())setSelected(e.target.value);else e.currentTarget.value=selected;}}><option value="" disabled>Choose a service</option>{(safeTab==='presider'?planServices:data.services).map(s=><option key={s.id} value={s.id}>{label(s)} · {s.period}</option>)}</select></label>
    {service&&safeTab==='mine'&&<><section className="wd-card"><h2>{service.worship} · {service.period}</h2><p>{label(service)} · Las Vegas</p>{service.assignments.map(a=><div key={a.dutyId} className="wd-schedule-line"><span>{title(a.dutyId)}</span><strong>{a.name}</strong></div>)}<p className="wd-muted">Other-group names remain hidden unless you manage the relevant duty department.</p></section>{!isClosed(service,data.now)&&<section className="wd-card"><h2>Your availability</h2><p>{localDate(service)} · all services on this Las Vegas date. Existing assignments are never removed by an availability change.</p><button type="button" onClick={()=>void act({op:'availability',day:localDate(service),unavailable:!data.daysOff.includes(localDate(service)),expectedVersion:data.availabilityVersion})}>{data.daysOff.includes(localDate(service))?'Remove day off':'Mark day unavailable'}</button></section>}</>}
    {safeTab==='manage'&&<MonthlyPlanner key={data.now} data={data} api={api} act={act} onError={error} onDirty={markDirty}/>}
    {service&&safeTab==='manage'&&<>
     {data.requests.filter(r=>r.status==='pending'&&data.manageDepartments.includes(departmentOf(r.dutyId))).length>0&&<section className="wd-card"><h2>Requests waiting</h2>{data.requests.filter(r=>r.status==='pending'&&data.manageDepartments.includes(departmentOf(r.dutyId))).map(r=>{const s=data.services.find(s=>s.id===r.serviceId);return s?<RequestEditor key={`${r.id}:${s.version}`} request={r} service={s} act={act} api={api} onError={error}/>:<p key={r.id}>A request is outside the displayed service window. It has not been changed.</p>;})}</section>}
     <p className="wd-muted">Authorized departments: {data.manageDepartments.join(', ')}.</p>
     {isClosed(service,data.now)?<p className="wd-warning">This service is closed to ordinary edits.</p>:CATALOG.filter(d=>data.manageDepartments.includes(d.department)&&hasDuty(service,d.id)).map(d=><CandidateEditor key={`${service.id}:${d.id}:${service.version}`} service={service} dutyId={d.id} api={api} act={act} onError={error}/>)}
    </>}
    {service&&safeTab==='presider'&&service.canPlan&&<ProgramEditor key={`${service.id}:${service.version}:${data.programs.find(p=>p.serviceId===service.id)?.version??0}`} service={service} program={data.programs.find(p=>p.serviceId===service.id)} api={api} act={act} onError={error} onDirty={markDirty} now={data.now}/>}
   </fieldset>}
  </main>
  {data&&<nav className="wd-nav" aria-label="Worship workspace sections">{([['mine','My Duties'],...(canPreside?[['presider','Presider']]:[]),...(canManage?[['manage','Manage']]:[])] as [Tab,string][]).map(([key,name])=><button type="button" disabled={pending||loading} key={key} aria-current={safeTab===key?'page':undefined} onClick={()=>changeTab(key)}>{name}</button>)}</nav>}
 </div></div>;
}
function useCandidates(api:WorshipTransport,service:ServiceView,dutyId:Duty,onError:(e:unknown)=>void){
 const [options,setOptions]=useState<CandidateList|null>(null);
 useEffect(()=>{let cancelled=false;setOptions(null);api.candidates(service.id,dutyId).then(next=>{if(cancelled)return;if(next.version!==service.version){onError(new WorshipError('The service changed while loading members. Reload before saving.',409,'stale'));return;}setOptions(next);}).catch(e=>{if(!cancelled)onError(e);});return()=>{cancelled=true;};},[api,service.id,service.version,dutyId,onError]);return options;
}
function CandidateEditor({service,dutyId,api,act,onError}:{service:ServiceView;dutyId:Duty;api:WorshipTransport;act:Act;onError:(e:unknown)=>void}){
 const current=service.assignments.find(a=>a.dutyId===dutyId),[open,setOpen]=useState(false);
 return <section className="wd-card"><div className="wd-section-heading"><h3>{title(dutyId)}</h3><span>{current?.name??'Not filled'}</span></div>{current?.availabilityConflict&&<p className="wd-warning">The assigned member marked this time unavailable.</p>}{open?<CandidateForm service={service} dutyId={dutyId} api={api} onError={onError} currentId={current?.memberId??''} onSave={id=>act({op:'assign',serviceId:service.id,dutyId,memberId:id||null,expectedVersion:service.version})}/>:<button type="button" onClick={()=>setOpen(true)}>Edit {title(dutyId)}</button>}</section>;
}
function CandidateForm({service,dutyId,api,onError,currentId='',excludeId,onSave}:{service:ServiceView;dutyId:Duty;api:WorshipTransport;onError:(e:unknown)=>void;currentId?:string;excludeId?:string;onSave:(id:string)=>Promise<boolean>}){
 const options=useCandidates(api,service,dutyId,onError),[value,setValue]=useState(currentId);
 const chosen=options?.candidates.find(c=>c.id===value),valid=!value||!!chosen?.eligible;
 return <div><label>Member for {title(dutyId)}<select aria-label={`Member for ${title(dutyId)}`} value={value} onChange={e=>setValue(e.target.value)} disabled={!options}><option value="">Leave open</option>{currentId&&!options?.candidates.some(c=>c.id===currentId)&&<option value={currentId} disabled>Current member · no longer eligible</option>}{options?.candidates.filter(c=>c.id!==excludeId).map(c=><option key={c.id} value={c.id} disabled={!c.eligible}>{c.name}{!c.eligible?` · ${c.reason}`:c.manualOnly?' · manual only':c.paired?' · prayer pairing':''}</option>)}</select></label>{!options&&<p role="status">Loading authorized members…</p>}{options?.hasMore&&<p className="wd-warning">This list is incomplete. Do not infer that an omitted member is ineligible.</p>}{chosen?.paired&&chosen.eligible&&<p className="wd-approved">Prayer + usher · approved pairing.</p>}<div className="wd-actions"><button type="button" className="wd-primary" disabled={!options||!valid} onClick={()=>void onSave(value)}>Save {title(dutyId)}</button>{dutyId!=='opening_prayer'&&<button type="button" disabled={!firstSuggestion(options?.candidates,excludeId)} onClick={()=>setValue(firstSuggestion(options?.candidates,excludeId)?.id??'')}>Suggest eligible member</button>}</div><p className="wd-muted">Suggestions are not saved until you confirm. Existing assignments are not moved automatically.</p></div>;
}
function RequestEditor({request,service,act,api,onError}:{request:RequestView;service:ServiceView;act:Act;api:WorshipTransport;onError:(e:unknown)=>void}){
 const [replacement,setReplacement]=useState(false);
 const resolve=(decision:'open'|'decline'|'close'|'replace',memberId?:string)=>act({op:'resolve',requestId:request.id,decision,expectedVersion:service.version,...(memberId?{memberId}:{})});
 return <div className="wd-request"><h3>{title(request.dutyId)} · {label(service)}</h3>{request.stale?<><p>This request no longer matches an editable assignment.</p><button type="button" onClick={()=>void resolve('close')}>Close stale request</button></>:<><p>The member remains assigned until the request is approved.</p>{replacement?<CandidateForm service={service} dutyId={request.dutyId} api={api} onError={onError} excludeId={service.assignments.find(a=>a.dutyId===request.dutyId)?.memberId??undefined} onSave={id=>id?resolve('replace',id):resolve('open')}/>:<button type="button" onClick={()=>setReplacement(true)}>Choose replacement</button>}<div className="wd-actions"><button type="button" onClick={()=>void resolve('open')}>Approve and leave open</button><button type="button" onClick={()=>void resolve('decline')}>Decline request</button></div></>}</div>;
}
function ProgramEditor({service,program,api,act,onError,onDirty,now}:{service:ServiceView;program?:ProgramView;api:WorshipTransport;act:Act;onError:(e:unknown)=>void;onDirty:(value:boolean)=>void;now:string}){
 const [catalog,setCatalog]=useState<SongList|null>(null),[items,setItems]=useState<ProgramItem[]>(program?.items??[]),[share,setShare]=useState('');
 useEffect(()=>{let cancelled=false;api.songs(service.id).then(result=>{if(!cancelled)setCatalog(result);}).catch(e=>{if(!cancelled)onError(e);});return()=>{cancelled=true;};},[api,service.id,onError]);
 const locked=isClosed(service,now)||program?.status==='sung',preparation=items.filter(i=>i.section==='preparation').sort((a,b)=>a.position-b.position);
 const normalize=(value:ProgramItem[])=>JSON.stringify([...value].sort((a,b)=>a.section.localeCompare(b.section)||a.position-b.position));
 const dirty=normalize(items)!==normalize(program?.items??[]);
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
 const statusLabel=dirty?'Unsaved draft':program?.status??'draft';
 const name=(id:string)=>catalog?.songs.find(s=>s.id===id)?.title??'Song not available in current catalog';
 const update=(section:ProgramItem['section'],position:number,songId:string)=>{setItems(old=>[...old.filter(i=>!(i.section===section&&i.position===position)),...(songId?[{section,position,songId}]:[])]);setShare('');};
 const reorder=(index:number,by:number)=>{const ordered=[...preparation],to=index+by;if(to<0||to>=ordered.length)return;[ordered[index],ordered[to]]=[ordered[to],ordered[index]];setItems(old=>[...old.filter(i=>i.section!=='preparation'),...ordered.map((i,n)=>({...i,position:n+1}))]);setShare('');};
 const choose=(section:ProgramItem['section'],position:number,label:string)=>{const value=items.find(i=>i.section===section&&i.position===position)?.songId??'';return <label>{label}<select aria-label={label} disabled={locked||!catalog} value={value} onChange={e=>update(section,position,e.target.value)}><option value="">Not selected</option>{value&&!catalog?.songs.some(s=>s.id===value)&&<option value={value} disabled>Unavailable catalog entry</option>}{catalog?.songs.map(s=><option key={s.id} value={s.id}>{s.code} · {s.title}</option>)}</select></label>;};
 const save=(status:'draft'|'confirmed')=>act({op:'program',serviceId:service.id,expectedVersion:service.version,expectedProgramVersion:program?.version??0,status,items});
 const seconds=items.reduce((n,i)=>n+(catalog?.songs.find(s=>s.id===i.songId)?.seconds??0),0);
 const copy=async()=>{const lines=['Worship service plan',service.worship,label(service)+' · Las Vegas',`Status: ${statusLabel} · review selected songs before sharing`,...(['preparation','glory','thanks','choir'] as const).filter(section=>section!=='thanks'||hasThanks(service)).filter(section=>section!=='choir'||hasChoir(service.worship)).map(section=>`${section[0].toUpperCase()+section.slice(1)}: ${items.filter(i=>i.section===section).sort((a,b)=>a.position-b.position).map(i=>name(i.songId)).join('; ')||'Not selected'}`),'Copied for review only. Nothing was sent.'];const value=lines.join('\n');setShare(value);try{await navigator.clipboard.writeText(value);}catch{/* Read-only text below is the manual fallback. */}};
 return <section className="wd-card"><div className="wd-section-heading"><h2>Song plan</h2><span>{statusLabel}</span></div>{locked&&<p className="wd-warning">This plan is read-only. Historical records are not changed here.</p>}{!catalog?<p role="status">Loading authorized songs…</p>:<><p className="wd-muted">{Math.floor(seconds/60)}m {seconds%60}s selected.</p>{catalog.hasMore&&<p className="wd-warning">Only part of the catalog is shown. Missing songs are not automatically removed.</p>}<fieldset className="wc-controls" disabled={locked}><h3>Preparation</h3>{preparation.map((item,index)=><div className="wc-preparation" key={item.position}>{choose('preparation',item.position,`Preparation song ${index+1}`)}<div className="wd-actions"><button type="button" disabled={index===0} onClick={()=>reorder(index,-1)}>Move song {index+1} up</button><button type="button" disabled={index===preparation.length-1} onClick={()=>reorder(index,1)}>Move song {index+1} down</button><button type="button" onClick={()=>{setItems(old=>[...old.filter(i=>i.section!=='preparation'),...preparation.filter((_,n)=>n!==index).map((i,n)=>({...i,position:n+1}))]);setShare('');}}>Remove song {index+1}</button></div></div>)}<button type="button" disabled={preparation.length>=20||!catalog.songs.length} onClick={()=>{setItems(old=>[...old.filter(i=>i.section!=='preparation'),...preparation.map((i,n)=>({...i,position:n+1})),{section:'preparation',position:preparation.length+1,songId:catalog.songs[0].id}]);setShare('');}}>Add preparation song</button><div className="wc-song-fields">{choose('glory',1,'Glory song')}{hasThanks(service)&&choose('thanks',1,'Thanks song')}{hasChoir(service.worship)&&choose('choir',1,'Choir song')}</div><div className="wd-actions"><button type="button" className="wd-primary" onClick={()=>void save('draft')}>Save plan</button><button type="button" onClick={()=>void save('confirmed')}>Confirm plan</button></div></fieldset><button type="button" className="wd-wide" onClick={()=>void copy()}>Copy plan for Signal</button>{share&&<label className="wd-share">Share preview<textarea aria-label="Share preview" readOnly rows={9} value={share}/></label>}</>}</section>;
}
