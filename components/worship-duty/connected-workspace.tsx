'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {CATALOG,departmentOf,dutyLabel as title,hasChoir,hasDuty,hasThanks} from '../../lib/worship-duty/domain';
import type {Duty} from '../../lib/worship-duty/domain';
import {WorshipError,firstSuggestion,isClosed} from '../../lib/worship-duty/api-contract';
import type {CandidateList,Command,ProgramItem,ProgramView,RequestView,ServiceView,SongList,Workspace} from '../../lib/worship-duty/api-contract';
import {createHttpTransport} from '../../lib/worship-duty/client-transport';
import type {WorshipTransport} from '../../lib/worship-duty/client-transport';
import {serviceDay,serviceLabel,vegasDate} from '../../lib/worship-duty/service-time';
import {FrameControls} from '../app-frame';
import type {FrameAction} from '../app-frame';
import {ArrowDown,ArrowUp} from '../home-icons';
import {useSwipeTabs} from '../../lib/use-swipe-tabs';
import {useUnsavedPlan} from './use-unsaved-plan';
import MonthlyPlanner from './monthly-planner';
import ServiceTime from './service-time';
import './worship-duty.css';
const localDate=(s:ServiceView)=>vegasDate(s.startsAt);
const label=(s:ServiceView)=>serviceLabel(s.startsAt);
type Tab='mine'|'presider'|'manage';
type Act=(command:Command)=>Promise<boolean>;
const TAB_NAMES:Record<Tab,string>={mine:'My Duties',presider:'Presider',manage:'Manage'};
const TAB_ICONS={mine:'calendar',presider:'info',manage:'people'} as const;
const WEEK=7*24*60*60*1000;
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
 const tabs:Tab[]=['mine',...(canPreside?['presider' as const]:[]),...(canManage?['manage' as const]:[])];
 const changeTab=(next:Tab)=>{if(next===safeTab||pending||loading||!permitNavigation())return;setTab(next);setMessage('');if(next==='presider'&&!planServices.some(s=>s.id===selected))setSelected(planServices[0]?.id??'');};
 const swipe=useSwipeTabs(tabs,safeTab,changeTab);
 const reload=()=>{if(permitNavigation()){setMessage('');void load(true);}};
 const pendingRequests=data?.requests.filter(r=>r.status==='pending'&&data.manageDepartments.includes(departmentOf(r.dutyId)))??[];
 const tabAction=(key:Tab):FrameAction=>({label:TAB_NAMES[key],icon:TAB_ICONS[key],onClick:()=>changeTab(key),active:safeTab===key,disabled:!data||pending||loading});
 const openSetup=()=>{if(permitNavigation())window.location.assign('/modules/worship-duty/setup');};
 // The bottom bar keeps My Duties on the left and the member's main working view on the right; everything else is under More.
 const right=canManage?'manage':canPreside?'presider':null;
 const more:FrameAction[]=[...tabs.filter(key=>key!=='mine'&&key!==right).map(tabAction),...(canSetup?[{label:'Setup',icon:'more' as const,onClick:openSetup}]:[]),{label:'Reload',icon:'clock',onClick:reload,disabled:loading||pending}];
 const thisWeek=data?upcoming.filter(s=>Date.parse(s.startsAt)-Date.parse(data.now)<WEEK).length:0;
 return <div className="ui-page wd-page">
  <FrameControls title="Worship Duty" left={tabAction('mine')} right={right?tabAction(right):{label:'Profile',icon:'user',href:'/members/manage?tab=profile'}} more={more} onHome={()=>{if(permitNavigation())window.location.assign('/members');}}/>
  <main className="ui-main wd-main" aria-busy={loading||pending}>
   <p className="ui-kicker">Worship Duty</p>
   <h1 className="ui-title">{TAB_NAMES[safeTab]}</h1>
   <p className="ui-lede">Your authorized services and assignments, in Las Vegas time.</p>
   <div className="wd-header-actions">{canSetup&&<a className="ui-link" href="/modules/worship-duty/setup" onClick={e=>{if(!permitNavigation())e.preventDefault();}}>Setup</a>}<button type="button" className="ui-button ui-button-quiet" disabled={loading||pending} onClick={reload}>Reload</button></div>
   {data&&safeTab==='mine'&&<div className="wd-stats"><p className="wd-stat"><span>Upcoming</span><strong>{upcoming.length}</strong><small>{upcoming.length===1?'Published service':'Published services'}</small></p><p className="wd-stat"><span>Next 7 days</span><strong>{thisWeek}</strong><small>{thisWeek===1?'Service to prepare':'Services to prepare'}</small></p></div>}
   {data&&tabs.length>1&&<nav className="ui-tabs" aria-label="Worship workspace sections">{tabs.map(key=><button type="button" className="ui-tab" disabled={pending||loading} key={key} aria-current={safeTab===key?'page':undefined} onClick={()=>changeTab(key)}>{TAB_NAMES[key]}</button>)}</nav>}
   {message&&<p className="ui-notice" data-tone={message==='Saved.'?'success':'warning'} role="status">{message}</p>}
   {issue&&<div className="ui-notice wd-issue" data-tone="danger" role="alert"><p>{issue.message}</p>{(issue.status===401||issue.status===403)?<a className="ui-link" href="/sign-in">Sign in</a>:<button type="button" className="ui-button ui-button-secondary" disabled={pending||loading} onClick={reload}>Reload workspace</button>}</div>}
   {loading&&!data&&<p className="ui-empty" role="status">Loading your duties…</p>}
   {!loading&&!data&&!issue&&<p className="ui-empty">No workspace is available.</p>}
   {data&&<fieldset className="wd-controls" disabled={pending||readOnly||loading} {...swipe}>
    {readOnly&&<p className="ui-notice" data-tone="warning">Read-only until the latest schedule and permissions are verified.</p>}
    {safeTab!=='presider'&&<div className={safeTab==='manage'?'wd-layout wd-side-first':'wd-layout'}><div className="wd-col-main">
    {safeTab==='mine'&&<>
     <h2 className="ui-section-title">Coming up for you</h2>
     {upcoming.length?<ul className="ui-list wd-cards">{upcoming.map(s=><li className="ui-row wd-entry" key={s.id}><ServiceTime startsAt={s.startsAt}/><div className="ui-row-body">
      <small>{s.worship} · {s.period}</small>
      {s.assignments.filter(a=>a.isMine).map(a=>{const r=data.requests.find(r=>r.serviceId===s.id&&r.dutyId===a.dutyId&&r.isMine&&r.status==='pending');return <div className="wd-own-duty" key={a.dutyId}>
       <strong>{title(a.dutyId)}</strong>
       {a.availabilityConflict&&<p className="ui-notice" data-tone="warning">You marked this time unavailable. You are still assigned.</p>}
       {r?<><small>Change requested. You remain assigned until your leader answers.</small><button type="button" className="ui-button ui-button-secondary" onClick={()=>void act({op:'withdraw',requestId:r.id})} aria-label={`Withdraw ${title(a.dutyId)} request`}>Withdraw request</button></>
        :<button type="button" className="ui-button ui-button-secondary" onClick={()=>void act({op:'request',serviceId:s.id,dutyId:a.dutyId,expectedVersion:s.version})} aria-label={`Request change for ${title(a.dutyId)}`}>Request change</button>}
      </div>;})}
      {s.assignments.filter(a=>a.isMine).length===2&&<small>Two duties are recorded for this service. The server verifies the approved pairing.</small>}
     </div></li>)}</ul>:<p className="ui-empty"><strong>No upcoming duties</strong>Your published assignments will appear here.</p>}
     <h2 className="ui-section-title">Service schedule</h2>
    </>}
    {safeTab==='mine'&&<label className="ui-field">Selected service<select className="ui-input" aria-label="Selected service" value={selected} onChange={e=>{if(permitNavigation())setSelected(e.target.value);else e.currentTarget.value=selected;}}><option value="" disabled>Choose a service</option>{data.services.map(s=><option key={s.id} value={s.id}>{label(s)} · {s.period}</option>)}</select></label>}
    {service&&safeTab==='mine'&&<>
     <div className="wd-service-head"><ServiceTime startsAt={service.startsAt}/><div><strong>{service.worship} · {service.period}</strong><small>Las Vegas time</small></div></div>
     <ul className="ui-list">{service.assignments.map(a=><li key={a.dutyId} className="ui-row wd-line"><span>{title(a.dutyId)}</span><strong className={a.isMine?'wd-you':a.filled?undefined:'wd-open'}>{a.name}</strong></li>)}</ul>
     <p className="ui-hint">Other-group names remain hidden unless you manage the relevant duty department.</p>
    </>}
    {safeTab==='manage'&&<>
     <MonthlyPlanner key={data.now} data={data} api={api} act={act} onError={error} onDirty={markDirty}/>
     <h2 className="ui-section-title">Edit one service</h2>
     <label className="ui-field">Selected service<select className="ui-input" aria-label="Selected service" value={selected} onChange={e=>{if(permitNavigation())setSelected(e.target.value);else e.currentTarget.value=selected;}}><option value="" disabled>Choose a service</option>{data.services.map(s=><option key={s.id} value={s.id}>{label(s)} · {s.period}</option>)}</select></label>
     {service&&(isClosed(service,data.now)?<p className="ui-notice" data-tone="warning">This service is closed to ordinary edits.</p>:<ul className="ui-list">{CATALOG.filter(d=>data.manageDepartments.includes(d.department)&&hasDuty(service,d.id)).map(d=><CandidateEditor key={`${service.id}:${d.id}:${service.version}`} service={service} dutyId={d.id} api={api} act={act} onError={error}/>)}</ul>)}
    </>}
    </div>
    {service&&safeTab==='mine'&&!isClosed(service,data.now)&&<aside className="wd-col-side" aria-label="Your availability"><h2 className="ui-section-title">Your availability</h2><div className="ui-row wd-row-action"><div className="ui-row-body"><strong>{data.daysOff.includes(localDate(service))?'Marked unavailable':'Available'} on {serviceDay(service.startsAt)}</strong><small>Applies to every service that Las Vegas day. Existing assignments are never removed by an availability change.</small></div><button type="button" className="ui-button ui-button-secondary" onClick={()=>void act({op:'availability',day:localDate(service),unavailable:!data.daysOff.includes(localDate(service)),expectedVersion:data.availabilityVersion})}>{data.daysOff.includes(localDate(service))?'Remove day off':'Mark day unavailable'}</button></div></aside>}
    {safeTab==='manage'&&<aside className="wd-col-side" aria-label="Needs your attention">
     <p className="ui-hint">You schedule: {data.manageDepartments.join(', ')}.</p>
     <h2 className="ui-section-title">Requests waiting {pendingRequests.length>0&&<span className="ui-count">{pendingRequests.length}</span>}</h2>
     {!pendingRequests.length&&<p className="ui-hint">No change requests are waiting.</p>}
     {pendingRequests.length>0&&<><ul className="ui-list">{pendingRequests.map(r=>{const s=data.services.find(s=>s.id===r.serviceId);return s?<RequestEditor key={`${r.id}:${s.version}`} request={r} service={s} act={act} api={api} onError={error}/>:<li className="ui-row" key={r.id}>A request is outside the displayed service window. It has not been changed.</li>;})}</ul></>}
    </aside>}
    </div>}
    {safeTab==='presider'&&<div className="wd-reading"><label className="ui-field">Selected service<select className="ui-input" aria-label="Selected service" value={selected} onChange={e=>{if(permitNavigation())setSelected(e.target.value);else e.currentTarget.value=selected;}}><option value="" disabled>Choose a service</option>{planServices.map(s=><option key={s.id} value={s.id}>{label(s)} · {s.period}</option>)}</select></label>
    {service&&safeTab==='presider'&&service.canPlan&&<ProgramEditor key={`${service.id}:${service.version}:${data.programs.find(p=>p.serviceId===service.id)?.version??0}`} service={service} program={data.programs.find(p=>p.serviceId===service.id)} api={api} act={act} onError={error} onDirty={markDirty} now={data.now}/>}</div>}
   </fieldset>}
  </main>
 </div>;
}
function useCandidates(api:WorshipTransport,service:ServiceView,dutyId:Duty,onError:(e:unknown)=>void){
 const [options,setOptions]=useState<CandidateList|null>(null);
 useEffect(()=>{let cancelled=false;setOptions(null);api.candidates(service.id,dutyId).then(next=>{if(cancelled)return;if(next.version!==service.version){onError(new WorshipError('The service changed while loading members. Reload before saving.',409,'stale'));return;}setOptions(next);}).catch(e=>{if(!cancelled)onError(e);});return()=>{cancelled=true;};},[api,service.id,service.version,dutyId,onError]);return options;
}
function CandidateEditor({service,dutyId,api,act,onError}:{service:ServiceView;dutyId:Duty;api:WorshipTransport;act:Act;onError:(e:unknown)=>void}){
 const current=service.assignments.find(a=>a.dutyId===dutyId),[open,setOpen]=useState(false);
 return <li className="wd-editor"><div className="ui-row"><div className="ui-row-body"><strong>{title(dutyId)}</strong><small>{current?.name??'Not filled'}</small></div>{!open&&<button type="button" className="ui-button ui-button-quiet" onClick={()=>setOpen(true)}>Edit {title(dutyId)}</button>}</div>
  {current?.availabilityConflict&&<p className="ui-notice" data-tone="warning">The assigned member marked this time unavailable.</p>}
  {open&&<CandidateForm service={service} dutyId={dutyId} api={api} onError={onError} currentId={current?.memberId??''} onSave={id=>act({op:'assign',serviceId:service.id,dutyId,memberId:id||null,expectedVersion:service.version})}/>}
 </li>;
}
function CandidateForm({service,dutyId,api,onError,currentId='',excludeId,onSave}:{service:ServiceView;dutyId:Duty;api:WorshipTransport;onError:(e:unknown)=>void;currentId?:string;excludeId?:string;onSave:(id:string)=>Promise<boolean>}){
 const options=useCandidates(api,service,dutyId,onError),[value,setValue]=useState(currentId);
 const chosen=options?.candidates.find(c=>c.id===value),valid=!value||!!chosen?.eligible,suggestion=firstSuggestion(options?.candidates,excludeId);
 return <div className="ui-surface wd-form">
  <label className="ui-field">Member for {title(dutyId)}<select className="ui-input" aria-label={`Member for ${title(dutyId)}`} value={value} onChange={e=>setValue(e.target.value)} disabled={!options}><option value="">Leave open</option>{currentId&&!options?.candidates.some(c=>c.id===currentId)&&<option value={currentId} disabled>Current member · no longer eligible</option>}{options?.candidates.filter(c=>c.id!==excludeId).map(c=><option key={c.id} value={c.id} disabled={!c.eligible}>{c.name}{!c.eligible?` · ${c.reason}`:c.manualOnly?' · manual only':c.paired?' · prayer pairing':''}</option>)}</select></label>
  {!options&&<p className="ui-hint" role="status">Loading authorized members…</p>}
  {options?.hasMore&&<p className="ui-notice" data-tone="warning">This list is incomplete. Do not infer that an omitted member is ineligible.</p>}
  {chosen?.paired&&chosen.eligible&&<p className="ui-notice">Prayer and usher: an approved pairing.</p>}
  <div className="wd-actions"><button type="button" className="ui-button" disabled={!options||!valid} onClick={()=>void onSave(value)}>Save {title(dutyId)}</button>{dutyId!=='opening_prayer'&&<button type="button" className="ui-button ui-button-secondary" disabled={!suggestion} onClick={()=>setValue(suggestion?.id??'')}>Suggest eligible member</button>}</div>
  <p className="ui-hint">Suggestions are not saved until you confirm. Existing assignments are not moved automatically.</p>
 </div>;
}
function RequestEditor({request,service,act,api,onError}:{request:RequestView;service:ServiceView;act:Act;api:WorshipTransport;onError:(e:unknown)=>void}){
 const [replacement,setReplacement]=useState(false);
 const resolve=(decision:'open'|'decline'|'close'|'replace',memberId?:string)=>act({op:'resolve',requestId:request.id,decision,expectedVersion:service.version,...(memberId?{memberId}:{})});
 return <li className="wd-editor"><div className="ui-row wd-entry"><ServiceTime startsAt={service.startsAt}/><div className="ui-row-body"><strong>{title(request.dutyId)}</strong><small>{request.stale?'This request no longer matches an editable assignment.':'The member remains assigned until the request is approved.'}</small></div></div>
  <div className="wd-actions">{request.stale?<button type="button" className="ui-button ui-button-secondary" onClick={()=>void resolve('close')}>Close stale request</button>:<>
   {!replacement&&<button type="button" className="ui-button ui-button-secondary" onClick={()=>setReplacement(true)}>Choose replacement</button>}
   <button type="button" className="ui-button ui-button-secondary" onClick={()=>void resolve('open')}>Approve and leave open</button>
   <button type="button" className="ui-button ui-button-quiet" onClick={()=>void resolve('decline')}>Decline request</button>
  </>}</div>
  {!request.stale&&replacement&&<CandidateForm service={service} dutyId={request.dutyId} api={api} onError={onError} excludeId={service.assignments.find(a=>a.dutyId===request.dutyId)?.memberId??undefined} onSave={id=>id?resolve('replace',id):resolve('open')}/>}
 </li>;
}
function ProgramEditor({service,program,api,act,onError,onDirty,now}:{service:ServiceView;program?:ProgramView;api:WorshipTransport;act:Act;onError:(e:unknown)=>void;onDirty:(value:boolean)=>void;now:string}){
 const [catalog,setCatalog]=useState<SongList|null>(null),[items,setItems]=useState<ProgramItem[]>(program?.items??[]),[share,setShare]=useState('');
 useEffect(()=>{let cancelled=false;api.songs(service.id).then(result=>{if(!cancelled)setCatalog(result);}).catch(e=>{if(!cancelled)onError(e);});return()=>{cancelled=true;};},[api,service.id,onError]);
 const locked=isClosed(service,now)||program?.status==='sung',preparation=items.filter(i=>i.section==='preparation').sort((a,b)=>a.position-b.position);
 const normalize=(value:ProgramItem[])=>JSON.stringify([...value].sort((a,b)=>a.section.localeCompare(b.section)||a.position-b.position));
 const dirty=normalize(items)!==normalize(program?.items??[]);
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
 const statusLabel=dirty?'Unsaved draft':program?.status==='confirmed'?'Confirmed':program?.status==='sung'?'Sung':'Draft';
 const name=(id:string)=>catalog?.songs.find(s=>s.id===id)?.title??'Song not available in current catalog';
 const update=(section:ProgramItem['section'],position:number,songId:string)=>{setItems(old=>[...old.filter(i=>!(i.section===section&&i.position===position)),...(songId?[{section,position,songId}]:[])]);setShare('');};
 const setPreparation=(next:ProgramItem[])=>{setItems(old=>[...old.filter(i=>i.section!=='preparation'),...next.map((i,n)=>({...i,position:n+1}))]);setShare('');};
 const reorder=(index:number,by:number)=>{const ordered=[...preparation],to=index+by;if(to<0||to>=ordered.length)return;[ordered[index],ordered[to]]=[ordered[to],ordered[index]];setPreparation(ordered);};
 const choose=(section:ProgramItem['section'],position:number,label:string)=>{const value=items.find(i=>i.section===section&&i.position===position)?.songId??'';return <label className="ui-field">{label}<select className="ui-input" aria-label={label} disabled={locked||!catalog} value={value} onChange={e=>update(section,position,e.target.value)}><option value="">Not selected</option>{value&&!catalog?.songs.some(s=>s.id===value)&&<option value={value} disabled>Unavailable catalog entry</option>}{catalog?.songs.map(s=><option key={s.id} value={s.id}>{s.code} · {s.title}</option>)}</select></label>;};
 const save=(status:'draft'|'confirmed')=>act({op:'program',serviceId:service.id,expectedVersion:service.version,expectedProgramVersion:program?.version??0,status,items});
 const seconds=items.reduce((n,i)=>n+(catalog?.songs.find(s=>s.id===i.songId)?.seconds??0),0);
 const copy=async()=>{const lines=['Worship service plan',service.worship,label(service)+' · Las Vegas',`Status: ${statusLabel} · review selected songs before sharing`,...(['preparation','glory','thanks','choir'] as const).filter(section=>section!=='thanks'||hasThanks(service)).filter(section=>section!=='choir'||hasChoir(service.worship)).map(section=>`${section[0].toUpperCase()+section.slice(1)}: ${items.filter(i=>i.section===section).sort((a,b)=>a.position-b.position).map(i=>name(i.songId)).join('; ')||'Not selected'}`),'Copied for review only. Nothing was sent.'];const value=lines.join('\n');setShare(value);try{await navigator.clipboard.writeText(value);}catch{/* Read-only text below is the manual fallback. */}};
 return <section aria-labelledby="wd-plan-title">
  <div className="wd-section-head"><h2 className="ui-section-title" id="wd-plan-title">Song plan</h2><span className="ui-hint">{statusLabel}</span></div>
  {locked&&<p className="ui-notice" data-tone="warning">This plan is read-only. Historical records are not changed here.</p>}
  {!catalog?<p className="ui-empty" role="status">Loading authorized songs…</p>:<>
   <p className="ui-hint">{Math.floor(seconds/60)}m {seconds%60}s selected.</p>
   {catalog.hasMore&&<p className="ui-notice" data-tone="warning">Only part of the catalog is shown. Missing songs are not automatically removed.</p>}
   <fieldset className="wd-controls" disabled={locked}>
    <h3 className="wd-subhead">Preparation</h3>
    {!preparation.length&&<p className="ui-hint">No preparation songs yet.</p>}
    <ol className="ui-list">{preparation.map((item,index)=><li className="wd-preparation" key={item.position}>{choose('preparation',item.position,`Preparation song ${index+1}`)}<div className="wd-reorder"><button type="button" className="ui-button ui-button-secondary wd-icon-button" aria-label={`Move song ${index+1} up`} disabled={index===0} onClick={()=>reorder(index,-1)}><ArrowUp/></button><button type="button" className="ui-button ui-button-secondary wd-icon-button" aria-label={`Move song ${index+1} down`} disabled={index===preparation.length-1} onClick={()=>reorder(index,1)}><ArrowDown/></button><button type="button" className="ui-button ui-button-quiet" aria-label={`Remove song ${index+1}`} onClick={()=>setPreparation(preparation.filter((_,n)=>n!==index))}>Remove</button></div></li>)}</ol>
    <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={preparation.length>=20||!catalog.songs.length} onClick={()=>setPreparation([...preparation,{section:'preparation',position:preparation.length+1,songId:catalog.songs[0].id}])}>Add preparation song</button>
    <div className="wd-song-fields">{choose('glory',1,'Glory song')}{hasThanks(service)&&choose('thanks',1,'Thanks song')}{hasChoir(service.worship)&&choose('choir',1,'Choir song')}</div>
    <div className="wd-actions"><button type="button" className="ui-button" onClick={()=>void save('draft')}>Save plan</button><button type="button" className="ui-button ui-button-secondary" onClick={()=>void save('confirmed')}>Confirm plan</button></div>
   </fieldset>
   <button type="button" className="ui-button ui-button-quiet wd-copy" onClick={()=>void copy()}>Copy song plan</button>
   {share&&<label className="ui-field">Share preview<textarea className="ui-input" aria-label="Share preview" readOnly rows={9} value={share}/></label>}
  </>}
 </section>;
}
