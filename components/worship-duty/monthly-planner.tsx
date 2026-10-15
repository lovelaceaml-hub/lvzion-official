'use client';
import {useEffect,useState} from 'react';
import {CATALOG,dutyLabel,hasDuty} from '../../lib/worship-duty/domain';
import type {Duty} from '../../lib/worship-duty/domain';
import type {Workspace,BatchChange,CandidateList,ServiceView,Command} from '../../lib/worship-duty/api-contract';
import {firstSuggestion,isClosed,WorshipError} from '../../lib/worship-duty/api-contract';
import type {WorshipTransport} from '../../lib/worship-duty/client-transport';
import {serviceClock,serviceDay,serviceLabel,serviceLocalTime} from '../../lib/worship-duty/service-time';
type Props={data:Workspace;api:WorshipTransport;act:(c:Command)=>Promise<boolean>;onError:(e:unknown)=>void;onDirty:(d:boolean)=>void};
const STATUS={draft:'Draft',published:'Published',cancelled:'Cancelled'} as const;
export default function MonthlyPlanner({data,api,act,onError,onDirty}:Props){
 const [month,setMonth]=useState(serviceLocalTime(data.now).slice(0,7)),[calendar,setCalendar]=useState(false),[selected,setSelected]=useState(''),[duty,setDuty]=useState<Duty>('presider'),[options,setOptions]=useState<CandidateList|null>(null),[choice,setChoice]=useState(''),[changes,setChanges]=useState<BatchChange[]>([]),[review,setReview]=useState(false),[names,setNames]=useState<Record<string,string>>({});
 const services=data.services.filter(s=>serviceLocalTime(s.startsAt).startsWith(month));
 const s=services.find(s=>s.id===selected),duties=CATALOG.filter(d=>data.manageDepartments.includes(d.department)&&(!s||hasDuty(s,d.id)));
 const activeDuty=duties.some(d=>d.id===duty)?duty:duties[0]?.id;
 useEffect(()=>{onDirty(changes.length>0);return()=>onDirty(false);},[changes.length,onDirty]);
 useEffect(()=>{
  let done=false;setOptions(null);if(!s||!activeDuty||isClosed(s,data.now))return;
  setChoice(changes.find(c=>c.serviceId===s.id&&c.dutyId===activeDuty)?.memberId??s.assignments.find(a=>a.dutyId===activeDuty)?.memberId??'');
  api.candidates(s.id,activeDuty).then(o=>{if(done)return;if(o.version!==s.version)throw new WorshipError('The schedule changed. Reload before planning.',409,'stale');setOptions(o);setNames(old=>({...old,...Object.fromEntries(o.candidates.map(c=>[c.id,c.name]))}));}).catch(e=>{if(!done)onError(e);});
  return()=>{done=true;};
 },[api,s?.id,s?.version,activeDuty,data.now,onError]);
 const stage=()=>{if(!s||!activeDuty)return;const current=s.assignments.find(a=>a.dutyId===activeDuty)?.memberId??null;setChanges(old=>{const others=old.filter(c=>c.serviceId!==s.id||c.dutyId!==activeDuty);return choice===current?others:[...others,{serviceId:s.id,dutyId:activeDuty,memberId:choice||null,expectedVersion:s.version}];});setReview(false);};
 const label=(s:ServiceView)=>`${serviceLabel(s.startsAt)} · ${s.worship} · ${s.period}`;
 const days=Array.from(new Set(services.map(s=>serviceLocalTime(s.startsAt).slice(0,10))));
 const suggestion=firstSuggestion(options?.candidates);
 return <section className="wd-planner" aria-labelledby="wd-planner-title">
  <h2 className="ui-section-title" id="wd-planner-title">Monthly planner</h2>
  <p className="ui-hint">Stage up to 40 assignment changes, then review the whole batch before saving. All changes succeed together or stay unsaved.</p>
  <div className="wd-planner-bar"><label className="ui-field">Month<input className="ui-input" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><button type="button" className="ui-button ui-button-secondary" aria-pressed={calendar} onClick={()=>setCalendar(!calendar)}>{calendar?'Show list':'Show calendar'}</button></div>
  <p className="ui-hint">Shows the first 80 services from the past week through the next 90 days. A month outside that window may be incomplete.</p>
  {!services.length&&<p className="ui-empty">No services are visible in this month. The owner can create services in Setup.</p>}
  {calendar?<div className="wd-calendar">{days.map(day=><section key={day}><h3 className="wd-subhead">{serviceDay(day+'T12:00:00Z')}</h3>{services.filter(s=>serviceLocalTime(s.startsAt).startsWith(day)).map(s=><button type="button" className="ui-row wd-calendar-row" key={s.id} aria-pressed={s.id===selected} onClick={()=>{setSelected(s.id);setReview(false);}}><span className="wd-time"><strong>{serviceClock(s.startsAt)}</strong></span><span className="ui-row-body"><strong>{s.period}</strong><small>{STATUS[s.status]}</small></span></button>)}</section>)}</div>
   :services.length>0&&<label className="ui-field">Service<select className="ui-input" aria-label="Planner service" value={selected} onChange={e=>{setSelected(e.target.value);setReview(false);}}><option value="">Choose a service</option>{services.map(s=><option key={s.id} value={s.id}>{label(s)} · {STATUS[s.status]}</option>)}</select></label>}
  {s&&!isClosed(s,data.now)&&<div className="ui-surface wd-form">
   <label className="ui-field">Duty<select className="ui-input" aria-label="Planner duty" value={activeDuty??''} onChange={e=>setDuty(e.target.value as Duty)}>{duties.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
   <p className="ui-hint">Saved assignment: {s.assignments.find(a=>a.dutyId===activeDuty)?.name??'Not filled'}</p>
   <label className="ui-field">Proposed member<select className="ui-input" aria-label="Proposed member" disabled={!options} value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Leave open</option>{choice&&!options?.candidates.some(c=>c.id===choice)&&<option value={choice}>Current assignment</option>}{options?.candidates.map(c=><option key={c.id} value={c.id}>{c.name}{!c.eligible?' (current conflict or unavailable)':c.manualOnly?' (manual only)':''}</option>)}</select></label>
   {options?.hasMore&&<p className="ui-notice" data-tone="warning">Candidate list is incomplete. Omitted members are not confirmed ineligible.</p>}
   <p className="ui-hint">A current conflict can be resolved by another staged change, such as a swap. The database checks the final batch. Availability and qualifications are always enforced.</p>
   <div className="wd-actions"><button type="button" className="ui-button ui-button-secondary" disabled={!options||changes.length>=40} onClick={stage}>Stage assignment</button>{activeDuty!=='opening_prayer'&&<button type="button" className="ui-button ui-button-quiet" disabled={!suggestion} onClick={()=>setChoice(suggestion?.id??'')}>Suggest eligible member</button>}</div>
  </div>}
  {!!changes.length&&<div className="wd-batch">
   <div className="wd-section-head"><h3 className="wd-subhead">{changes.length} unsaved {changes.length===1?'change':'changes'}</h3></div>
   <div className="wd-actions"><button type="button" className="ui-button ui-button-secondary" onClick={()=>setReview(true)}>Review assignment batch</button><button type="button" className="ui-button ui-button-quiet" onClick={()=>{if(window.confirm('Discard all staged assignments?')){setChanges([]);setReview(false);}}}>Discard staged changes</button></div>
   {review&&<div className="ui-surface wd-form" role="region" aria-label="Assignment batch review"><h3 className="wd-subhead">Review before saving</h3>
    <ul className="ui-list">{changes.map(c=>{const service=data.services.find(s=>s.id===c.serviceId);return <li className="ui-row" key={c.serviceId+c.dutyId}><div className="ui-row-body"><strong>{dutyLabel(c.dutyId)}: {service?.assignments.find(a=>a.dutyId===c.dutyId)?.name??'Not filled'} → {c.memberId?names[c.memberId]??'Selected member':'Leave open'}</strong><small>{service?label(service):'Service no longer visible'}</small></div></li>;})}</ul>
    <button type="button" className="ui-button ui-button-block" onClick={async()=>{if(await act({op:'batch',changes})){setChanges([]);setReview(false);}}}>Apply reviewed assignments</button>
   </div>}
  </div>}
 </section>;
}
