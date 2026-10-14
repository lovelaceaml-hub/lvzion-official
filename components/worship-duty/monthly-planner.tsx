'use client';
import {useEffect,useState} from 'react';
import {CATALOG,hasChoir,hasThanks} from '../../lib/worship-duty/domain';
import type {Duty} from '../../lib/worship-duty/domain';
import type {Workspace,BatchChange,CandidateList,ServiceView,Command} from '../../lib/worship-duty/api-contract';
import {isClosed,WorshipError} from '../../lib/worship-duty/api-contract';
import type {WorshipTransport} from '../../lib/worship-duty/client-transport';
import {serviceLocalTime} from '../../lib/worship-duty/service-time';
type Props={data:Workspace;api:WorshipTransport;act:(c:Command)=>Promise<boolean>;onError:(e:unknown)=>void;onDirty:(d:boolean)=>void};
export default function MonthlyPlanner({data,api,act,onError,onDirty}:Props){
 const [month,setMonth]=useState(serviceLocalTime(data.now).slice(0,7)),[calendar,setCalendar]=useState(false),[selected,setSelected]=useState(''),[duty,setDuty]=useState<Duty>('presider'),[options,setOptions]=useState<CandidateList|null>(null),[choice,setChoice]=useState(''),[changes,setChanges]=useState<BatchChange[]>([]),[review,setReview]=useState(false),[names,setNames]=useState<Record<string,string>>({});
 const services=data.services.filter(s=>serviceLocalTime(s.startsAt).startsWith(month));
 const s=services.find(s=>s.id===selected),duties=CATALOG.filter(d=>data.manageDepartments.includes(d.department)&&(!s||d.id!=='thanks_prayer'||hasThanks(s))&&(!s||d.id!=='closing_prayer'||hasChoir(s.worship)));
 const activeDuty=duties.some(d=>d.id===duty)?duty:duties[0]?.id;
 useEffect(()=>{onDirty(changes.length>0);return()=>onDirty(false);},[changes.length,onDirty]);
 useEffect(()=>{
  let done=false;setOptions(null);if(!s||!activeDuty||isClosed(s,data.now))return;
  setChoice(changes.find(c=>c.serviceId===s.id&&c.dutyId===activeDuty)?.memberId??s.assignments.find(a=>a.dutyId===activeDuty)?.memberId??'');
  api.candidates(s.id,activeDuty).then(o=>{if(done)return;if(o.version!==s.version)throw new WorshipError('The schedule changed. Reload before planning.',409,'stale');setOptions(o);setNames(old=>({...old,...Object.fromEntries(o.candidates.map(c=>[c.id,c.name]))}));}).catch(e=>{if(!done)onError(e);});
  return()=>{done=true;};
 },[api,s?.id,s?.version,activeDuty,data.now,onError]);
 const stage=()=>{if(!s||!activeDuty)return;const current=s.assignments.find(a=>a.dutyId===activeDuty)?.memberId??null;setChanges(old=>{const others=old.filter(c=>c.serviceId!==s.id||c.dutyId!==activeDuty);return choice===current?others:[...others,{serviceId:s.id,dutyId:activeDuty,memberId:choice||null,expectedVersion:s.version}];});setReview(false);};
 const label=(s:ServiceView)=>`${serviceLocalTime(s.startsAt).replace('T',' ')} | ${s.worship} | ${s.period}`;
 const days=Array.from(new Set(services.map(s=>serviceLocalTime(s.startsAt).slice(0,10))));
 return <section className="wd-card wm-planner"><h2>Monthly planner</h2><p>Stage up to 40 assignment changes, then review the complete batch before saving. All changes succeed together or remain unsaved.</p>
  <label>Month<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><button type="button" aria-pressed={calendar} onClick={()=>setCalendar(!calendar)}>{calendar?'Show list':'Show calendar'}</button>
  <p className="wd-muted">The workspace shows the first 80 services from the past week through the next 90 days. A month outside this window may be incomplete.</p>
  {!services.length&&<p>No services are visible in this month. The owner can create services in Setup.</p>}
  {calendar?<div className="wm-calendar">{days.map(day=><section key={day}><h3>{day}</h3>{services.filter(s=>serviceLocalTime(s.startsAt).startsWith(day)).map(s=><button type="button" key={s.id} aria-pressed={s.id===selected} onClick={()=>{setSelected(s.id);setReview(false);}}>{s.period} | {s.status}</button>)}</section>)}</div>:<label>Service<select aria-label="Planner service" value={selected} onChange={e=>{setSelected(e.target.value);setReview(false);}}><option value="">Choose a service</option>{services.map(s=><option key={s.id} value={s.id}>{label(s)} | {s.status}</option>)}</select></label>}
  {s&&!isClosed(s,data.now)&&<><label>Duty<select aria-label="Planner duty" value={activeDuty??''} onChange={e=>setDuty(e.target.value as Duty)}>{duties.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label><p>Saved assignment: {s.assignments.find(a=>a.dutyId===activeDuty)?.name??'Not filled'}</p>
   <label>Proposed member<select aria-label="Proposed member" disabled={!options} value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Leave open</option>{choice&&!options?.candidates.some(c=>c.id===choice)&&<option value={choice}>Current assignment</option>}{options?.candidates.map(c=><option key={c.id} value={c.id}>{c.name}{!c.eligible?' (current conflict or unavailable)':c.manualOnly?' (manual only)':''}</option>)}</select></label>
   {options?.hasMore&&<p className="wd-warning">Candidate list is incomplete. Omitted members are not confirmed ineligible.</p>}
   <p className="wd-muted">Current conflicts may be resolved by another staged change, such as a swap. The database validates the final batch. Availability and qualifications are always enforced.</p>
   <div className="wd-actions"><button type="button" disabled={!options||changes.length>=40} onClick={stage}>Stage assignment</button>{activeDuty!=='opening_prayer'&&<button type="button" disabled={!options?.candidates.some(c=>c.eligible&&!c.manualOnly)} onClick={()=>setChoice(options?.candidates.find(c=>c.eligible&&!c.manualOnly)?.id??'')}>Suggest eligible member</button>}</div>
  </>}
  {!!changes.length&&<><h3>{changes.length} unsaved changes</h3><div className="wd-actions"><button type="button" onClick={()=>setReview(true)}>Review assignment batch</button><button type="button" onClick={()=>{if(window.confirm('Discard all staged assignments?')){setChanges([]);setReview(false);}}}>Discard staged changes</button></div>
   {review&&<div role="region" aria-label="Assignment batch review"><h3>Review before saving</h3>{changes.map(c=>{const service=data.services.find(s=>s.id===c.serviceId);return <p key={c.serviceId+c.dutyId}>{service?label(service):'Service no longer visible'}<br/>{CATALOG.find(d=>d.id===c.dutyId)?.label}: {service?.assignments.find(a=>a.dutyId===c.dutyId)?.name??'Not filled'} → {c.memberId?names[c.memberId]??'Selected member':'Leave open'}</p>;})}<button type="button" className="wd-primary" onClick={async()=>{if(await act({op:'batch',changes})){setChanges([]);setReview(false);}}}>Apply reviewed assignments</button></div>}
  </>}
 </section>;
}
