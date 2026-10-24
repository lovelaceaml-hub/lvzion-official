'use client';
/**
 * Atlas worship-manage: service days as round chips (or the month calendar),
 * a department pill control and the assignment form in a glass card. Changes
 * are staged in a floating tray and saved together after a visible review.
 */
import {useEffect,useState} from 'react';
import {CATALOG,dutyLabel,hasDuty} from '../../lib/worship-duty/domain';
import type {Department,Duty} from '../../lib/worship-duty/domain';
import type {Workspace,BatchChange,CandidateList,ServiceView,Command} from '../../lib/worship-duty/api-contract';
import {firstSuggestion,isClosed,WorshipError} from '../../lib/worship-duty/api-contract';
import type {WorshipTransport} from '../../lib/worship-duty/client-transport';
import {serviceClock,serviceLabel,serviceLocalTime} from '../../lib/worship-duty/service-time';
import {CalendarDays,UsersRound} from '../home-icons';
import {DateStrip,EmptyState,Glass,IconBox,SectionHeader,Segmented,Tag,Tray} from '../ui-kit';
import {Callout,MonthGrid,STATUS,STATUS_TONE,Strip,longDate} from './parts';
type Props={data:Workspace;api:WorshipTransport;act:(c:Command)=>Promise<boolean>;onError:(e:unknown)=>void;onDirty:(d:boolean)=>void};
const noon=(date:string)=>new Date(date+'T12:00:00Z');
export default function MonthlyPlanner({data,api,act,onError,onDirty}:Props){
 const [month,setMonth]=useState(serviceLocalTime(data.now).slice(0,7)),[calendar,setCalendar]=useState(false),[selected,setSelected]=useState(''),[duty,setDuty]=useState<Duty>('presider'),[options,setOptions]=useState<CandidateList|null>(null),[choice,setChoice]=useState(''),[changes,setChanges]=useState<BatchChange[]>([]),[review,setReview]=useState(false),[names,setNames]=useState<Record<string,string>>({}),[day,setDay]=useState('');
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
 const dateOf=(s:ServiceView)=>serviceLocalTime(s.startsAt).slice(0,10);
 const days=Array.from(new Set(services.map(dateOf))).sort();
 const onDay=(date:string)=>services.filter(s=>dateOf(s)===date);
 const activeDay=days.includes(day)?day:days[0]??'';
 const suggestion=firstSuggestion(options?.candidates);
 const choose=(id:string)=>{setSelected(id);setReview(false);};
 const departments=[...new Set(duties.map(d=>d.department))] as Department[];
 const activeDepartment=CATALOG.find(d=>d.id===activeDuty)?.department??departments[0];
 const staged=(dutyId:Duty)=>changes.find(c=>c.serviceId===s?.id&&c.dutyId===dutyId);
 const open=s&&!isClosed(s,data.now)?duties.filter(d=>{const c=staged(d.id);return c?!c.memberId:!s.assignments.find(a=>a.dutyId===d.id)?.filled;}).length:0;
 return <section className="wd-planner" aria-labelledby="wd-planner-title">
  <SectionHeader id="wd-planner-title" title="Monthly planner"/>
  <div className="wd-planner-controls"><label className="ui-field">Month<input className="ui-input" type="month" value={month} onChange={e=>{setMonth(e.target.value);setDay('');}}/></label><button type="button" className="ui-button ui-button-secondary" aria-pressed={calendar} onClick={()=>setCalendar(!calendar)}>{calendar?'Show list':'Show calendar'}</button></div>
  {!services.length&&<Glass className="wd-state"><EmptyState icon={<CalendarDays/>} title="No services this month">The owner can create services in Setup.</EmptyState></Glass>}
  {calendar?<>
   <MonthGrid month={month} onMonth={m=>{setMonth(m);setDay('');}} count={d=>onDay(d).length} selected={activeDay} onSelect={setDay} level={3}/>
   {activeDay&&<section aria-label="Services on the chosen day"><SectionHeader level={3} title={longDate(activeDay)}/><Glass tight><ul className="ui-list">{onDay(activeDay).map(s=><li key={s.id}><button type="button" className="ui-row wd-pick" aria-pressed={s.id===selected} onClick={()=>choose(s.id)}><IconBox><CalendarDays size={22}/></IconBox><span className="ui-row-body"><strong>{s.worship} · {s.period}</strong><small>{serviceClock(s.startsAt)} · {STATUS[s.status]}</small></span></button></li>)}</ul></Glass></section>}
  </>:days.length>0&&<div className="wd-chips" data-no-swipe>
   <DateStrip label="Service days this month" days={days.map(date=>{const n=onDay(date).length;return {key:date,top:noon(date).toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'}),day:Number(date.slice(8)),
    bottom:n>1?`${n} services`:noon(date).toLocaleDateString('en-US',{month:'short',timeZone:'UTC'}),label:`${longDate(date)}, ${n} ${n===1?'service':'services'}`,selected:!!s&&dateOf(s)===date,onClick:()=>choose(onDay(date)[0].id)};})}/>
  </div>}
  {s&&!isClosed(s,data.now)&&departments.length>1&&activeDepartment&&<Segmented label="Department" className="wd-departments" value={activeDepartment} onChange={d=>{const first=duties.find(x=>x.department===d);if(first)setDuty(first.id);}} options={departments.map(d=>[d,d] as const)}/>}
  {(s||!calendar&&services.length>0)&&<Glass className="wd-form-card">
   {s&&<Strip lead={<Tag tone={STATUS_TONE[s.status]}>{STATUS[s.status]}</Tag>}>{s.worship} {s.period} <small className="wd-until">{serviceClock(s.startsAt)}</small></Strip>}
   {!calendar&&<label className="ui-field">Service<select className="ui-input" aria-label="Planner service" value={selected} onChange={e=>choose(e.target.value)}><option value="">Choose a service</option>{services.map(s=><option key={s.id} value={s.id}>{label(s)} · {STATUS[s.status]}</option>)}</select></label>}
   {s&&isClosed(s,data.now)&&<p className="ui-notice" data-tone="warning">This service is closed to ordinary edits.</p>}
   {s&&!isClosed(s,data.now)&&<>
    <label className="ui-field">Duty<select className="ui-input" aria-label="Planner duty" value={activeDuty??''} onChange={e=>setDuty(e.target.value as Duty)}>{departments.map(d=><optgroup key={d} label={d}>{duties.filter(x=>x.department===d).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</optgroup>)}</select></label>
    <p className="ui-hint">Saved assignment: {s.assignments.find(a=>a.dutyId===activeDuty)?.name??'Not filled'}</p>
    <label className="ui-field">Proposed member<select className="ui-input" aria-label="Proposed member" disabled={!options} value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Leave open</option>{choice&&!options?.candidates.some(c=>c.id===choice)&&<option value={choice}>Current assignment</option>}{options?.candidates.map(c=><option key={c.id} value={c.id}>{c.name}{!c.eligible?' (current conflict or unavailable)':c.manualOnly?' (manual only)':''}</option>)}</select></label>
    {options?.hasMore&&<p className="ui-notice" data-tone="warning">Candidate list is incomplete. Omitted members are not confirmed ineligible.</p>}
    <div className="wd-actions"><button type="button" className="ui-button ui-button-secondary" disabled={!options||changes.length>=40} onClick={stage}>Stage assignment</button>{activeDuty!=='opening_prayer'&&<button type="button" className="ui-button ui-button-quiet" disabled={!suggestion} onClick={()=>setChoice(suggestion?.id??'')}>Suggest eligible member</button>}</div>
   </>}
  </Glass>}
  {open>0&&<Callout icon={<UsersRound size={24}/>} title={`${open} open ${open===1?'assignment':'assignments'}`}>Duties you schedule for this service that are not filled yet, counting staged changes.</Callout>}
  <p className="wd-footnote">Stage up to 40 assignment changes, then review the whole batch before saving. All changes succeed together or stay unsaved. A current conflict can be resolved by another staged change, such as a swap; the database checks the final batch, and availability and qualifications are always enforced.</p>
  <p className="wd-footnote">Shows the first 80 services from the past week through the next 90 days. A month outside that window may be incomplete.</p>
  {review&&!!changes.length&&<div className="wd-batch">
   <Glass className="wd-review" role="region" aria-label="Assignment batch review"><h3 className="wd-subhead">Review before saving</h3>
    <ul className="ui-list">{changes.map(c=>{const service=data.services.find(s=>s.id===c.serviceId);return <li className="ui-row" key={c.serviceId+c.dutyId}><div className="ui-row-body"><strong>{dutyLabel(c.dutyId)}: {service?.assignments.find(a=>a.dutyId===c.dutyId)?.name??'Not filled'} → {c.memberId?names[c.memberId]??'Selected member':'Leave open'}</strong><small>{service?label(service):'Service no longer visible'}</small></div></li>;})}</ul>
    <button type="button" className="ui-button ui-button-block" onClick={async()=>{if(await act({op:'batch',changes})){setChanges([]);setReview(false);}}}>Apply reviewed assignments</button>
   </Glass>
  </div>}
  {!!changes.length&&<Tray className="wd-tray" eyebrow="Not saved" summary={`${changes.length} ${changes.length===1?'change':'changes'}`}>
   <button type="button" className="ui-button ui-button-quiet" aria-label="Discard staged changes" onClick={()=>{if(window.confirm('Discard all staged assignments?')){setChanges([]);setReview(false);}}}>Discard</button>
   {!review&&<button type="button" className="ui-button" aria-label="Review assignment batch" onClick={()=>setReview(true)}>Review</button>}
  </Tray>}
 </section>;
}
