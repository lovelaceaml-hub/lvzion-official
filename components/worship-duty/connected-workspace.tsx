'use client';
/**
 * Worship Duty in the shared Liquid Opal material (Atlas worship-calendar,
 * worship-duties, worship-service, worship-presider, worship-manage). Every
 * service, assignment and song comes from the authorized workspace; empty is valid.
 */
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {CATALOG,DEPARTMENTS,departmentOf,dutyLabel as title,hasChoir,hasDuty,hasThanks} from '../../lib/worship-duty/domain';
import type {Duty} from '../../lib/worship-duty/domain';
import {WorshipError,firstSuggestion,isClosed} from '../../lib/worship-duty/api-contract';
import type {CandidateList,Command,ProgramItem,ProgramView,RequestView,ServiceView,SongList,Workspace} from '../../lib/worship-duty/api-contract';
import {createHttpTransport} from '../../lib/worship-duty/client-transport';
import type {WorshipTransport} from '../../lib/worship-duty/client-transport';
import {serviceClock,serviceDay,serviceLabel,vegasDate} from '../../lib/worship-duty/service-time';
import {FrameControls} from '../app-frame';
import type {FrameAction} from '../app-frame';
import {ArrowDown,ArrowRight,ArrowUp,CalendarDays,Check,ChevronLeft,ChevronRight,ClipboardList,Clock3,ShieldCheck,UsersRound} from '../home-icons';
import {EmptyState,Glass,IconBox,PageHeading,Row,SectionHeader,StatGrid,StatTile,Tag,TextAction} from '../ui-kit';
import {useSwipeTabs} from '../../lib/use-swipe-tabs';
import {useUnsavedPlan} from './use-unsaved-plan';
import MonthlyPlanner from './monthly-planner';
import {Callout,DateBox,MonthGrid,STATUS,STATUS_TONE,Strip,eyebrowDate,longDate} from './parts';
import './worship-duty.css';
const label=(s:ServiceView)=>serviceLabel(s.startsAt);
type Tab='schedule'|'mine'|'presider'|'manage';
type Act=(command:Command)=>Promise<boolean>;
const TAB_NAMES:Record<Tab,string>={schedule:'Schedule',mine:'My Duties',presider:'Presider',manage:'Manage'};
const TAB_ICONS={schedule:'calendar',mine:'clipboard',presider:'music',manage:'people'} as const;
const EYEBROWS:Record<Tab,string>={schedule:'Prepare to serve',mine:'Your part matters',presider:'Prepare with care',manage:'Authorized management'};
const LEDES:Record<Exclude<Tab,'manage'>,string>={schedule:'Your service calendar, in Las Vegas time.',mine:'Your published assignments, in Las Vegas time.',presider:'The song plan for each service you preside.'};
const WEEK=7*24*60*60*1000;
const asError=(error:unknown)=>error instanceof WorshipError?error:new WorshipError('The workspace could not be loaded. Reload to verify your access.',503,'unavailable');

export default function ConnectedWorkspace({canSetup=false}:{canSetup?:boolean}){
 const api=useMemo(()=>createHttpTransport(),[]);
 const {markDirty,permitNavigation}=useUnsavedPlan();
 const [data,setData]=useState<Workspace|null>(null),[tab,setTab]=useState<Tab>('mine'),[selected,setSelected]=useState('');
 const [detail,setDetail]=useState(''),[month,setMonth]=useState(''),[day,setDay]=useState('');
 const [loading,setLoading]=useState(true),[pending,setPending]=useState(false),[readOnly,setReadOnly]=useState(false),[message,setMessage]=useState(''),[issue,setIssue]=useState<WorshipError|null>(null);
 const generation=useRef(0),writeLock=useRef(false),alive=useRef(true);
 const error=useCallback((e:unknown)=>{
  if(!alive.current)return;
  const value=asError(e);setIssue(value);
  if(value.status===401||value.status===403){
   // Confidentiality takes priority over draft retention when authorization ends.
   markDirty(false);generation.current++;setData(null);setSelected('');setDetail('');setTab('mine');setLoading(false);
  }
  if(value.status!==422&&value.status!==400)setReadOnly(true);
 },[markDirty]);
 const load=useCallback(async(clear=false)=>{
  const current=++generation.current;if(clear)setData(null);setLoading(true);
  try{const next=await api.workspace();if(current!==generation.current||!alive.current)return false;setData(next);setReadOnly(false);setIssue(null);setSelected(old=>next.services.some(s=>s.id===old)?old:(next.services.find(s=>!isClosed(s,next.now))??next.services[0])?.id??'');return true;}
  catch(e){if(current===generation.current)error(e);return false;}finally{if(current===generation.current&&alive.current)setLoading(false);}
 },[api,error]);
 useEffect(()=>{alive.current=true;markDirty(false);setTab('mine');setSelected('');setDetail('');setIssue(null);setMessage('');setReadOnly(false);void load(true);return()=>{alive.current=false;markDirty(false);generation.current++;};},[load,markDirty]);
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
 const tabs:Tab[]=['schedule','mine',...(canPreside?['presider' as const]:[]),...(canManage?['manage' as const]:[])];
 // The service detail opens from the calendar or a duty card and closes with any section change.
 const opened=(safeTab==='schedule'||safeTab==='mine')?data?.services.find(s=>s.id===detail):undefined;
 const changeTab=(next:Tab)=>{if(next===safeTab&&!opened||pending||loading||!permitNavigation())return;setTab(next);setDetail('');setMessage('');if(next==='presider'&&!planServices.some(s=>s.id===selected))setSelected(planServices[0]?.id??'');};
 const swipe=useSwipeTabs(tabs,safeTab,changeTab);
 const reload=()=>{if(permitNavigation()){setMessage('');void load(true);}};
 const openService=(id:string)=>{setDetail(id);setMessage('');window.scrollTo?.({top:0});};
 const pendingRequests=data?.requests.filter(r=>r.status==='pending'&&data.manageDepartments.includes(departmentOf(r.dutyId)))??[];
 const tabAction=(key:Tab):FrameAction=>({label:TAB_NAMES[key],icon:TAB_ICONS[key],onClick:()=>changeTab(key),active:safeTab===key,disabled:!data||pending||loading});
 const openSetup=()=>{if(permitNavigation())window.location.assign('/modules/worship-duty/setup');};
 // The bottom bar keeps My Duties on the left and the member's main working view on the right; everything else is under More.
 const right:Tab=canManage?'manage':canPreside?'presider':'schedule';
 const more:FrameAction[]=[...tabs.filter(key=>key!=='mine'&&key!==right).map(tabAction),...(canSetup?[{label:'Setup',icon:'more' as const,onClick:openSetup}]:[]),{label:'Reload',icon:'clock',onClick:reload,disabled:loading||pending}];
 const thisWeek=data?upcoming.filter(s=>Date.parse(s.startsAt)-Date.parse(data.now)<WEEK).length:0;
 const denied=!data&&issue&&(issue.status===401||issue.status===403);
 const serviceSelect=(list:ServiceView[])=><label className="ui-field">Selected service<select className="ui-input" aria-label="Selected service" value={selected} onChange={e=>{if(permitNavigation())setSelected(e.target.value);else e.currentTarget.value=selected;}}><option value="" disabled>Choose a service</option>{list.map(s=><option key={s.id} value={s.id}>{label(s)} · {s.period}</option>)}</select></label>;
 return <div className="ui-page wd-page">
  <FrameControls title="Worship Duty" left={tabAction('mine')} right={tabAction(right)} more={more} onHome={()=>{if(permitNavigation())window.location.assign('/members');}}/>
  <main className="ui-main wd-main" aria-busy={loading||pending}>
   {opened?<>
    <button type="button" className="wd-back" onClick={()=>setDetail('')}><ChevronLeft size={20}/>{TAB_NAMES[safeTab]}</button>
    <PageHeading eyebrow={longDate(vegasDate(opened.startsAt))} title={opened.worship} lede={`${opened.period} service, in Las Vegas time.`}/>
   </>:denied?<PageHeading eyebrow="Prepare to serve" title="Worship Duty"/>:<PageHeading eyebrow={EYEBROWS[safeTab]} title={TAB_NAMES[safeTab]} lede={safeTab==='manage'&&data?`You schedule: ${data.manageDepartments.join(', ')}.`:safeTab==='manage'?'':LEDES[safeTab]}>
    {canSetup&&<p className="wd-heading-links"><a className="ui-text-action" href="/modules/worship-duty/setup" onClick={e=>{if(!permitNavigation())e.preventDefault();}}>Setup<ChevronRight size={16}/></a></p>}
   </PageHeading>}
   {data&&tabs.length>1&&!opened&&<nav className="ui-tabs wd-sections" aria-label="Worship workspace sections">{tabs.map(key=><button type="button" className="ui-tab" disabled={pending||loading} key={key} aria-current={safeTab===key?'page':undefined} onClick={()=>changeTab(key)}>{TAB_NAMES[key]}</button>)}</nav>}
   {message&&<p className="ui-notice" data-tone={message==='Saved.'?'success':'warning'} role="status">{message}</p>}
   {denied?<Glass className="wd-state" role="alert"><EmptyState icon={<ShieldCheck/>} title={issue.status===401?'Sign in to continue':'Worship Duty is not available'} action={<a className="ui-button" href="/sign-in">Sign in</a>}>{issue.message}</EmptyState></Glass>
    :issue&&<div className="ui-notice wd-issue" data-tone="danger" role="alert"><p>{issue.message}</p><button type="button" className="ui-button ui-button-secondary" disabled={pending||loading} onClick={reload}>Reload workspace</button></div>}
   {loading&&!data&&<Glass className="wd-state"><EmptyState icon={<Clock3/>} title="Loading your duties…" role="status"/></Glass>}
   {!loading&&!data&&!issue&&<Glass className="wd-state"><EmptyState icon={<CalendarDays/>} title="No workspace is available">Reload to try again.</EmptyState></Glass>}
   {data&&<fieldset className="wd-controls" disabled={pending||readOnly||loading} {...swipe}>
    {readOnly&&<p className="ui-notice" data-tone="warning">Read-only until the latest schedule and permissions are verified.</p>}
    {opened?<ServiceDetail service={opened} data={data} act={act}/>:<>
     {safeTab==='schedule'&&<Schedule data={data} month={month} day={day} onMonth={m=>{setMonth(m);setDay('');}} onDay={setDay} onOpen={openService}/>}
     {safeTab==='mine'&&<>
      <StatGrid label="Your duty summary">
       <StatTile label="Upcoming" value={upcoming.length} note={upcoming.length===1?'Published service':'Published services'}/>
       <StatTile label="Next 7 days" value={thisWeek} note={thisWeek===1?'Service to prepare':'Services to prepare'}/>
      </StatGrid>
      <SectionHeader title="Coming up for you" action={<TextAction onClick={()=>changeTab('schedule')} label="Open the service schedule">Schedule</TextAction>}/>
      {upcoming.length?<ul className="wd-cards">{upcoming.map((s,i)=><DutyCard key={s.id} service={s} data={data} next={i===0} act={act} onOpen={()=>openService(s.id)}/>)}</ul>
       :<Glass><EmptyState icon={<ClipboardList/>} title="No upcoming duties">Your published assignments will appear here.</EmptyState></Glass>}
     </>}
     {safeTab==='presider'&&<div className="wd-reading">
      <Glass className="wd-next">
       <p className="ui-eyebrow">Service to prepare</p>
       {service?.canPlan&&<><h2>{service.worship} · {service.period}</h2><p>{label(service)} · Las Vegas time</p><PlanTag program={data.programs.find(p=>p.serviceId===service.id)}/></>}
       {serviceSelect(planServices)}
      </Glass>
      {service&&service.canPlan&&<ProgramEditor key={`${service.id}:${service.version}:${data.programs.find(p=>p.serviceId===service.id)?.version??0}`} service={service} program={data.programs.find(p=>p.serviceId===service.id)} api={api} act={act} onError={error} onDirty={markDirty} now={data.now}/>}
     </div>}
     {safeTab==='manage'&&<div className="wd-layout">
      <div className="wd-col-main">
       {pendingRequests.length>0&&<div className="wd-waiting"><Callout icon={<UsersRound size={24}/>} title={`${pendingRequests.length} change ${pendingRequests.length===1?'request':'requests'} waiting`}>Members stay assigned until you answer. <a className="ui-link" href="#wd-requests">Review requests</a></Callout></div>}
       <MonthlyPlanner key={data.now} data={data} api={api} act={act} onError={error} onDirty={markDirty}/>
       <section aria-labelledby="wd-edit-title">
        <SectionHeader id="wd-edit-title" title="Edit one service"/>
        <Glass className="wd-edit">
         {serviceSelect(data.services)}
         {service&&(isClosed(service,data.now)?<p className="ui-notice" data-tone="warning">This service is closed to ordinary edits.</p>:<ul className="ui-list">{CATALOG.filter(d=>data.manageDepartments.includes(d.department)&&hasDuty(service,d.id)).map(d=><CandidateEditor key={`${service.id}:${d.id}:${service.version}`} service={service} dutyId={d.id} api={api} act={act} onError={error}/>)}</ul>)}
        </Glass>
       </section>
      </div>
      <aside className="wd-col-side" aria-label="Needs your attention">
       <SectionHeader id="wd-requests" title={<>Requests waiting{pendingRequests.length>0&&<span className="ui-count">{pendingRequests.length}</span>}</>}/>
       {!pendingRequests.length?<Callout icon={<Check size={24}/>} title="No change requests are waiting">Requests from members you schedule appear here.</Callout>
        :<Glass tight><ul className="ui-list">{pendingRequests.map(r=>{const s=data.services.find(s=>s.id===r.serviceId);return s?<RequestEditor key={`${r.id}:${s.version}`} request={r} service={s} act={act} api={api} onError={error}/>:<li className="ui-row" key={r.id}>A request is outside the displayed service window. It has not been changed.</li>;})}</ul></Glass>}
      </aside>
     </div>}
    </>}
   </fieldset>}
  </main>
 </div>;
}

/** The saved plan state of the selected service, as the Atlas "Preparation" tag. */
function PlanTag({program}:{program?:ProgramView}){
 return <span className="wd-plan-tag"><Tag tone={program?.status==='confirmed'||program?.status==='sung'?'success':undefined}>{!program?'No song plan yet':program.status==='confirmed'?'Plan confirmed':program.status==='sung'?'Plan sung':'Draft plan'}</Tag></span>;
}

/** Atlas worship-calendar: month grid in glass, then the chosen day's services as rows. */
function Schedule({data,month,day,onMonth,onDay,onOpen}:{data:Workspace;month:string;day:string;onMonth:(month:string)=>void;onDay:(date:string)=>void;onOpen:(id:string)=>void}){
 const today=vegasDate(data.now),shown=month||today.slice(0,7);
 const on=(date:string)=>data.services.filter(s=>vegasDate(s.startsAt)===date);
 const mineOn=(date:string)=>on(date).some(s=>s.assignments.some(a=>a.isMine));
 const days=[...new Set(data.services.map(s=>vegasDate(s.startsAt)).filter(d=>d.startsWith(shown)))].sort();
 const active=days.includes(day)?day:days.find(d=>d>=today)??days[days.length-1]??'';
 const services=active?on(active):[];
 const own=services.flatMap(s=>s.assignments.filter(a=>a.isMine).map(a=>`${title(a.dutyId)} · ${s.worship} ${s.period}`));
 return <div className="wd-schedule">
  <MonthGrid month={shown} onMonth={onMonth} count={d=>on(d).length} mine={mineOn} selected={active} onSelect={onDay}
   legend={<ul className="ui-legend wd-legend"><li><i className="wd-key" data-key="dot"/>Services</li><li><i className="wd-key" data-key="mine"/>You serve</li><li><i className="wd-key" data-key="selected"/>Selected</li></ul>}/>
  {active?<section aria-labelledby="wd-day-title">
   <SectionHeader id="wd-day-title" title={longDate(active)}/>
   <Glass tight className="wd-day-card">
    {own.length>0&&<Strip lead={<Tag>You serve</Tag>}>{own.join(', ')}</Strip>}
    <ul className="ui-list">{services.map(s=><li key={s.id}><Row onClick={()=>onOpen(s.id)} lead={<IconBox><CalendarDays size={22}/></IconBox>} title={`${s.worship} · ${s.period}`} detail={`${serviceClock(s.startsAt)} · ${STATUS[s.status]}`}
     end={s.assignments.some(a=>a.isMine)?<Tag>You</Tag>:s.status!=='published'?<Tag tone={STATUS_TONE[s.status]}>{STATUS[s.status]}</Tag>:undefined}/></li>)}</ul>
   </Glass>
  </section>:<Glass className="wd-state"><EmptyState icon={<CalendarDays/>} title="No services this month">Services appear on this calendar once they are scheduled.</EmptyState></Glass>}
  <p className="wd-footnote">Shows services from the past week through the next 90 days.</p>
 </div>;
}

/** Atlas worship-duties card: date eyebrow, the duty, the service line and the actions. */
function DutyCard({service:s,data,next,act,onOpen}:{service:ServiceView;data:Workspace;next:boolean;act:Act;onOpen:()=>void}){
 const mine=s.assignments.filter(a=>a.isMine);
 const requestFor=(dutyId:Duty)=>data.requests.find(r=>r.serviceId===s.id&&r.dutyId===dutyId&&r.isMine&&r.status==='pending');
 const requested=mine.filter(a=>requestFor(a.dutyId));
 const names=mine.map(a=>title(a.dutyId));
 const meta=`${s.worship} · ${s.period} · ${serviceClock(s.startsAt)}`;
 return <li className="ui-glass wd-duty" data-next={next||undefined}>
  {next?<>
   <p className="ui-eyebrow">{eyebrowDate(vegasDate(s.startsAt))}</p>
   <h3 className="wd-duty-title">{names.length===1?names[0]:names.join(' and ')}</h3>
   <p className="wd-duty-meta">{meta}</p>
  </>:<div className="wd-duty-head">
   <DateBox startsAt={s.startsAt}/>
   <div className="ui-row-body"><strong>{names.length===1?names[0]:names.join(' and ')}</strong><small>{meta}</small></div>
   {requested.length>0?<Tag tone="warning">Change requested</Tag>:<Tag>Upcoming</Tag>}
  </div>}
  {mine.filter(a=>a.availabilityConflict).map(a=><p key={a.dutyId} className="ui-notice" data-tone="warning">You marked this time unavailable. You are still assigned{mine.length>1?` as ${title(a.dutyId)}`:''}.</p>)}
  {requested.length>0?<Strip lead={<Clock3 size={22}/>}>Change requested{mine.length>1?` for ${requested.map(a=>title(a.dutyId)).join(' and ')}`:''}. You remain assigned until your leader answers.</Strip>
   :next&&<Strip lead={<Clock3 size={22}/>}>{serviceClock(s.startsAt)} – {serviceClock(s.endsAt)}, Las Vegas time</Strip>}
  {mine.length===2&&<p className="wd-footnote">Two duties are recorded for this service. The server verifies the approved pairing.</p>}
  <div className="wd-actions">
   <button type="button" className="ui-button ui-button-secondary" onClick={onOpen}>View service<ArrowRight size={18}/></button>
   {mine.map(a=>{const r=requestFor(a.dutyId),t=title(a.dutyId);return r
    ?<button key={a.dutyId} type="button" className="ui-button ui-button-quiet" onClick={()=>void act({op:'withdraw',requestId:r.id})} aria-label={`Withdraw ${t} request`}>{mine.length>1?`Withdraw ${t} request`:'Withdraw request'}</button>
    :<button key={a.dutyId} type="button" className="ui-button ui-button-quiet" onClick={()=>void act({op:'request',serviceId:s.id,dutyId:a.dutyId,expectedVersion:s.version})} aria-label={`Request change for ${t}`}>{mine.length>1?`Request change for ${t}`:'Request change'}</button>;})}
  </div>
 </li>;
}

/** Atlas worship-service: time strip and availability, then assignments by department. */
function ServiceDetail({service:s,data,act}:{service:ServiceView;data:Workspace;act:Act}){
 const date=vegasDate(s.startsAt),off=data.daysOff.includes(date);
 const groups=DEPARTMENTS.map(d=>[d,s.assignments.filter(a=>departmentOf(a.dutyId)===d)] as const).filter(([,list])=>list.length);
 const mine=s.assignments.filter(a=>a.isMine);
 return <>
  <Glass tight className="wd-service-card">
   <Strip lead={<Clock3 size={22}/>} end={<Tag tone={STATUS_TONE[s.status]}>{STATUS[s.status]}</Tag>}><span className="wd-nowrap">{serviceClock(s.startsAt)}</span> <small className="wd-until">until {serviceClock(s.endsAt)}</small></Strip>
   {mine.length>0&&<Row lead={<IconBox><ClipboardList size={22}/></IconBox>} title={mine.map(a=>title(a.dutyId)).join(' and ')} detail="Your duty for this service"/>}
   {!isClosed(s,data.now)&&<div className="ui-row wd-row-action"><IconBox><CalendarDays size={22}/></IconBox><div className="ui-row-body"><strong>{off?'Marked unavailable':'Available'} on {serviceDay(s.startsAt)}</strong><small>Applies to every service that Las Vegas day. Existing assignments are never removed by an availability change.</small></div><button type="button" className="ui-button ui-button-secondary" onClick={()=>void act({op:'availability',day:date,unavailable:!off,expectedVersion:data.availabilityVersion})}>{off?'Remove day off':'Mark day unavailable'}</button></div>}
  </Glass>
  {groups.length?groups.map(([department,list])=><section key={department} aria-label={department}>
   <SectionHeader title={department}/>
   <Glass tight><ul className="ui-list">{list.map(a=><li key={a.dutyId}><Row lead={<IconBox><UsersRound size={22}/></IconBox>} title={title(a.dutyId)} detail={a.name}
    end={a.isMine?<Tag>You</Tag>:!a.filled?<Tag tone="warning">Open</Tag>:undefined}/></li>)}</ul></Glass>
  </section>):<Glass className="wd-state"><EmptyState icon={<UsersRound/>} title="No duties listed">Assignments for this service will appear here.</EmptyState></Glass>}
  <p className="wd-footnote">Other-group names remain hidden unless you manage the relevant duty department.</p>
 </>;
}

function useCandidates(api:WorshipTransport,service:ServiceView,dutyId:Duty,onError:(e:unknown)=>void){
 const [options,setOptions]=useState<CandidateList|null>(null);
 useEffect(()=>{let cancelled=false;setOptions(null);api.candidates(service.id,dutyId).then(next=>{if(cancelled)return;if(next.version!==service.version){onError(new WorshipError('The service changed while loading members. Reload before saving.',409,'stale'));return;}setOptions(next);}).catch(e=>{if(!cancelled)onError(e);});return()=>{cancelled=true;};},[api,service.id,service.version,dutyId,onError]);return options;
}
function CandidateEditor({service,dutyId,api,act,onError}:{service:ServiceView;dutyId:Duty;api:WorshipTransport;act:Act;onError:(e:unknown)=>void}){
 const current=service.assignments.find(a=>a.dutyId===dutyId),[open,setOpen]=useState(false);
 return <li className="wd-editor"><div className="ui-row"><IconBox><UsersRound size={22}/></IconBox><div className="ui-row-body"><strong>{title(dutyId)}</strong><small>{current?.name??'Not filled'}</small></div>{!open&&<button type="button" className="ui-button ui-button-quiet" onClick={()=>setOpen(true)}>Edit<span className="ui-visually-hidden"> {title(dutyId)}</span></button>}</div>
  {current?.availabilityConflict&&<p className="ui-notice" data-tone="warning">The assigned member marked this time unavailable.</p>}
  {open&&<CandidateForm service={service} dutyId={dutyId} api={api} onError={onError} currentId={current?.memberId??''} onSave={id=>act({op:'assign',serviceId:service.id,dutyId,memberId:id||null,expectedVersion:service.version})}/>}
 </li>;
}
function CandidateForm({service,dutyId,api,onError,currentId='',excludeId,onSave}:{service:ServiceView;dutyId:Duty;api:WorshipTransport;onError:(e:unknown)=>void;currentId?:string;excludeId?:string;onSave:(id:string)=>Promise<boolean>}){
 const options=useCandidates(api,service,dutyId,onError),[value,setValue]=useState(currentId);
 const chosen=options?.candidates.find(c=>c.id===value),valid=!value||!!chosen?.eligible,suggestion=firstSuggestion(options?.candidates,excludeId);
 return <div className="wd-form">
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
 return <li className="wd-editor"><div className="ui-row"><DateBox startsAt={service.startsAt}/><div className="ui-row-body"><strong>{title(request.dutyId)}</strong><small>{service.worship} · {serviceClock(service.startsAt)}</small><small>{request.stale?'This request no longer matches an editable assignment.':'The member remains assigned until the request is approved.'}</small></div></div>
  <div className="wd-actions">{request.stale?<button type="button" className="ui-button ui-button-secondary" onClick={()=>void resolve('close')}>Close stale request</button>:<>
   {!replacement&&<button type="button" className="ui-button ui-button-secondary" onClick={()=>setReplacement(true)}>Choose replacement</button>}
   <button type="button" className="ui-button ui-button-secondary" onClick={()=>void resolve('open')}>Approve and leave open</button>
   <button type="button" className="ui-button ui-button-quiet" onClick={()=>void resolve('decline')}>Decline request</button>
  </>}</div>
  {!request.stale&&replacement&&<CandidateForm service={service} dutyId={request.dutyId} api={api} onError={onError} excludeId={service.assignments.find(a=>a.dutyId===request.dutyId)?.memberId??undefined} onSave={id=>id?resolve('replace',id):resolve('open')}/>}
 </li>;
}

/** Atlas worship-presider: a readiness list from the plan itself, then the song plan in glass cards. */
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
 const has=(section:ProgramItem['section'])=>items.some(i=>i.section===section);
 const checks:[string,boolean][]=[
  [preparation.length?`Preparation songs chosen (${preparation.length})`:'Preparation songs chosen',preparation.length>0],
  ['Glory song chosen',has('glory')],
  ...(hasThanks(service)?[['Thanks song chosen',has('thanks')] as [string,boolean]]:[]),
  ...(hasChoir(service.worship)?[['Choir song chosen',has('choir')] as [string,boolean]]:[]),
  ['Plan saved',!!program&&!dirty],
  ['Plan confirmed by the presider',!dirty&&(program?.status==='confirmed'||program?.status==='sung')],
 ];
 return <>
  <section aria-labelledby="wd-ready-title">
   <SectionHeader id="wd-ready-title" title="Before the service"/>
   <Glass tight><ul className="ui-list wd-checklist">{checks.map(([text,done])=><li key={text} data-done={done}><span className="wd-checkbox" aria-hidden="true">{done&&<Check size={16}/>}</span><span>{text}</span><span className="ui-visually-hidden">{done?', done':', not yet'}</span></li>)}</ul></Glass>
  </section>
  <section aria-labelledby="wd-plan-title">
   <SectionHeader id="wd-plan-title" title="Song plan" note={<span className="wd-status" data-dirty={dirty||undefined}>{statusLabel}</span>}/>
   {locked&&<p className="ui-notice" data-tone="warning">This plan is read-only. Historical records are not changed here.</p>}
   {!catalog?<Glass className="wd-state"><EmptyState icon={<Clock3/>} title="Loading authorized songs…" role="status"/></Glass>:<>
    {catalog.hasMore&&<p className="ui-notice" data-tone="warning">Only part of the catalog is shown. Missing songs are not automatically removed.</p>}
    <fieldset className="wd-controls" disabled={locked}>
     <Glass className="wd-songs">
      <div className="wd-songs-head"><h3>Preparation</h3><span>{Math.floor(seconds/60)}m {seconds%60}s selected.</span></div>
      {!preparation.length&&<p className="ui-hint">No preparation songs yet.</p>}
      <ol className="ui-list">{preparation.map((item,index)=><li className="wd-preparation" key={item.position}>{choose('preparation',item.position,`Preparation song ${index+1}`)}<div className="wd-reorder"><button type="button" className="wd-round" aria-label={`Move song ${index+1} up`} disabled={index===0} onClick={()=>reorder(index,-1)}><ArrowUp/></button><button type="button" className="wd-round" aria-label={`Move song ${index+1} down`} disabled={index===preparation.length-1} onClick={()=>reorder(index,1)}><ArrowDown/></button><button type="button" className="ui-button ui-button-quiet" aria-label={`Remove song ${index+1}`} onClick={()=>setPreparation(preparation.filter((_,n)=>n!==index))}>Remove</button></div></li>)}</ol>
      <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={preparation.length>=20||!catalog.songs.length} onClick={()=>setPreparation([...preparation,{section:'preparation',position:preparation.length+1,songId:catalog.songs[0].id}])}>Add preparation song</button>
     </Glass>
     <Glass className="wd-songs">{choose('glory',1,'Glory song')}{hasThanks(service)&&choose('thanks',1,'Thanks song')}{hasChoir(service.worship)&&choose('choir',1,'Choir song')}</Glass>
     <div className="wd-actions wd-plan-actions"><button type="button" className="ui-button" onClick={()=>void save('draft')}>Save plan</button><button type="button" className="ui-button ui-button-secondary" onClick={()=>void save('confirmed')}>Confirm plan</button></div>
    </fieldset>
    <button type="button" className="ui-button ui-button-quiet wd-copy" onClick={()=>void copy()}>Copy song plan</button>
    {share&&<Glass className="wd-share"><label className="ui-field">Share preview<textarea className="ui-input" aria-label="Share preview" readOnly rows={9} value={share}/></label></Glass>}
   </>}
  </section>
 </>;
}
