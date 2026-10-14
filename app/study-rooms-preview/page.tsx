'use client';
import {useEffect,useMemo,useState} from 'react';
import {churchClock} from '../../lib/mobile-time';
import {
 BOOKING_RULES,PURPOSES,RESOURCES,RESOURCE_ORDER,bookingWindow,checkBooking,
 formattedTime,freeUnits,minutes,overlaps,sampleReservations,serviceBlocks,timeOptions
} from '../../lib/study-room-policy';
import type {ResourceKind,BookingPurpose,Reservation,BookingRequest} from '../../lib/study-room-policy';
import './study-rooms-preview.css';

const labels:Record<ResourceKind,{short:string;plural:string;symbol:string}>={
 room:{short:'Study Room',plural:'Rooms',symbol:'⌂'},
 whiteboard:{short:'Whiteboard',plural:'Boards',symbol:'▤'},
 tv:{short:'TV',plural:'TVs',symbol:'▣'}
};
const defaultClock={day:'2026-10-14',time:'00:00'};
const allTimes=timeOptions();
function readableDay(date:string){
 return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'})
  .format(new Date(date+'T12:00:00Z'));
}
function monthShort(date:string){
 return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short'}).format(new Date(date+'T12:00:00Z')).toUpperCase();
}
function weekday(date:string){
 return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short'}).format(new Date(date+'T12:00:00Z'));
}
function preferredStart(day:string,clock:{day:string;time:string}){
 const time=day===clock.day ? minutes(clock.time):minutes(BOOKING_RULES.open)-1;
 const candidate=allTimes.slice(0,-1).find(t=>minutes(t)>time);
 return candidate||'22:30';
}
function currentPeriod(date:string,day:string){return date===day?'Today':'Upcoming';}
function purposeLabel(purpose:BookingPurpose|'blocked'){return purpose==='blocked'?'Admin hold':PURPOSES[purpose].name;}
export default function StudyRoomsPreview(){
 const[clock,setClock]=useState(defaultClock);
 const[day,setDay]=useState(defaultClock.day);
 const[tab,setTab]=useState<ResourceKind>('room');
 const[panel,setPanel]=useState<'schedule'|'mine'>('schedule');
 const[at,setAt]=useState('12:00');
 const[showForm,setShowForm]=useState(false);
 const[resources,setResources]=useState<ResourceKind[]>(['room']);
 const[purpose,setPurpose]=useState<BookingPurpose>('contact');
 const[detail,setDetail]=useState('');
 const[start,setStart]=useState('10:00');
 const[end,setEnd]=useState('10:30');
 const[myBookings,setMyBookings]=useState<Reservation[]>([]);
 const[message,setMessage]=useState('');
 const[error,setError]=useState('');

 useEffect(()=>{
  const now=churchClock();
  setClock(now);setDay(now.day);
  const selected=preferredStart(now.day,now);
  setAt(selected);
  setStart(selected);setEnd(allTimes.find(t=>minutes(t)>minutes(selected))||'23:00');
 },[]);
 useEffect(()=>{
  if(!showForm)return;
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setShowForm(false);setError('');}};
  window.addEventListener('keydown',key);
  return ()=>window.removeEventListener('keydown',key);
 },[showForm]);

 const seed=useMemo(()=>sampleReservations(clock.day),[clock.day]);
 const bookings=useMemo(()=>[...seed,...myBookings],[seed,myBookings]);
 const days=useMemo(()=>bookingWindow(clock.day),[clock.day]);
 const daily=useMemo(()=>bookings.filter(b=>b.date===day&&b.status==='active'),[bookings,day]);
 const units=RESOURCES[tab].units;
 const windowEnd=allTimes.find(t=>minutes(t)>minutes(at))??'23:00';
 const serviceAtTime=serviceBlocks(day).some(s=>overlaps(at,windowEnd,s.start,s.end));
 const freeCount=serviceAtTime?0:freeUnits(tab,day,at,windowEnd,daily).length;
 const occupied=units.length-freeCount;
 const mine=myBookings.slice().sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
 const selections:BookingRequest={date:day,start,end,purpose,detail,resources};
 const checked=useMemo(()=>checkBooking(selections,bookings,{today:clock.day,localTime:clock.time}),
  [day,start,end,purpose,detail,resources,bookings,clock.day,clock.time]);

 function startReserve(){
  const fresh=churchClock();
  if(fresh.day!==clock.day){setClock(fresh);setDay(fresh.day);setMessage('A new day has started. Please select a time again.');return;}
  setClock(fresh);
  const first=preferredStart(day,fresh);
  const after=allTimes.find(t=>minutes(t)>minutes(first))||'23:00';
  setStart(first);setEnd(after);setPurpose('contact');setDetail('');setResources([tab]);setError('');setShowForm(true);
 }
 function toggleResource(kind:ResourceKind){
  setResources(previous=>previous.includes(kind)?previous.filter(k=>k!==kind):RESOURCE_ORDER.filter(k=>[...previous,kind].includes(k)));
 }
 function updateStart(value:string){
  setStart(value);
  if(minutes(end)<=minutes(value))setEnd(allTimes.find(t=>minutes(t)>minutes(value))||'23:00');
 }
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  const fresh=churchClock();
  if(fresh.day!==clock.day){setClock(fresh);setDay(fresh.day);setShowForm(false);setMessage('The local day changed. Choose a new date and try again.');return;}
  setClock(fresh);
  const result=checkBooking(selections,bookings,{today:fresh.day,localTime:fresh.time});
  if(!result.ok){setError(result.message);return;}
  const newReservation:Reservation={
   id:'preview-owned-'+(myBookings.length+1),date:day,start,end,purpose,
   detail:detail.trim(),memberLabel:'You · preview only',status:'active',owner:'demo-self',assignments:result.assignments
  };
  setMyBookings(previous=>[...previous,newReservation]);
  setShowForm(false);setError('');setPanel('mine');
  setMessage('Sample reservation added to this preview only. No room was booked.');
 }
 function cancelMine(id:string){
  setMyBookings(previous=>previous.map(b=>b.id===id?{...b,status:'cancelled'}:b));
  setMessage('Sample reservation cancelled in this preview. No live booking was changed.');
 }
 function unitSchedule(unitId:string){
  return daily.filter(b=>Object.values(b.assignments).includes(unitId)).sort((a,b)=>a.start.localeCompare(b.start));
 }
 return <main className="sr-stage"><div className="sr-shell">
  <header className="sr-header">
   <a href="/experience-preview" className="sr-back"><span aria-hidden="true">‹</span> LV Zion</a>
   <div className="sr-heading-right"><small>OFFICIAL APP · DESIGN PREVIEW</small><strong>Study Rooms</strong></div>
  </header>
  <div className="sr-demo-banner" role="note">
   <span aria-hidden="true">◉</span> Fictional reservations only. The current Study Room Scheduler is unchanged.
  </div>
  <div className="sr-scroll">
   <section className="sr-intro">
    <span className="sr-eyebrow">YOUR STUDY SPACE</span>
    <h1>Make room<br/><em>for learning.</em></h1>
    <p>Find an open study room, board, or TV, and see the day's schedule in one place.</p>
    <div className="sr-stats">
     <div><strong>4</strong><small>Study rooms</small></div>
     <div><strong>5</strong><small>Whiteboards</small></div>
     <div><strong>3</strong><small>TVs</small></div>
    </div>
   </section>
   <div className="sr-workflow-nav" aria-label="Reservations sections">
    <button type="button" className={panel==='schedule'?'is-current':''} aria-current={panel==='schedule'?'page':undefined} onClick={()=>setPanel('schedule')}>Browse schedule</button>
    <button type="button" className={panel==='mine'?'is-current':''} aria-current={panel==='mine'?'page':undefined} onClick={()=>setPanel('mine')}>My reservations <span>{mine.filter(b=>b.status==='active').length}</span></button>
   </div>
   {message&&<div className="sr-notice" role="status">{message}<button aria-label="Dismiss message" onClick={()=>setMessage('')}>×</button></div>}
   {panel==='schedule'&&<>
    <section className="sr-section">
     <div className="sr-section-title"><h2>Choose a day</h2><small>4-day booking window</small></div>
     <div className="sr-days">
      {days.map((date,i)=><button className={day===date?'is-selected':''} aria-pressed={day===date}
        type="button" key={date} onClick={()=>{setDay(date);setAt(preferredStart(date,clock));}}>
       <span>{i===0?'Today':weekday(date)}</span><strong>{Number(date.slice(-2))}</strong>
       <small>{monthShort(date)}</small>
      </button>)}
     </div>
    </section>
    <section className="sr-section">
     <div className="sr-section-title"><h2>Choose a resource</h2><small>Multiple can be reserved together</small></div>
     <div className="sr-resource-tabs" aria-label="Resource types">
      {RESOURCE_ORDER.map(kind=><button key={kind} type="button" aria-pressed={tab===kind}
       className={tab===kind?'is-selected':''} onClick={()=>setTab(kind)}>
        <span className="sr-resource-symbol" aria-hidden="true">{labels[kind].symbol}</span>
        <span>{labels[kind].plural}</span>
       </button>)}
     </div>
    </section>
    <section className="sr-section sr-schedule">
     <div className="sr-section-title"><h2>{labels[tab].plural} schedule</h2><small>{readableDay(day)}</small></div>
     <div className="sr-time-check">
      <label htmlFor="sr-check-time">Availability at</label>
      <select id="sr-check-time" value={at} onChange={e=>setAt(e.target.value)}>
       {allTimes.slice(0,-1).map(t=><option key={t} value={t}>{formattedTime(t)}</option>)}
      </select>
      <span><strong>{units.length-occupied}</strong> of {units.length} free</span>
     </div>
     {serviceBlocks(day).length>0&&<div className="sr-service-note">
       <span aria-hidden="true">ⓘ</span>
       Service-time exclusions: {serviceBlocks(day).map(s=>`${formattedTime(s.start)}–${formattedTime(s.end)}`).join(' · ')}
      </div>}
     <div className="sr-unit-list">{units.map((u)=>{
      const events=unitSchedule(u.id);
      const hasConflict=events.some(b=>overlaps(at,windowEnd,b.start,b.end));
      const service=serviceAtTime;
      return <article className="sr-unit-card" key={u.id}>
       <div className="sr-unit-heading"><div className="sr-mini-icon">{labels[tab].symbol}</div><div><h3>{u.label}</h3><small>{u.note??labels[tab].short}</small></div>
        <span className={service||hasConflict?'sr-busy':'sr-free'}>{service?'Service':hasConflict?'Occupied':'Available'}</span>
       </div>
       {events.length?<div className="sr-events">{events.map(b=><div className="sr-event" key={b.id}>
         <span>{formattedTime(b.start)} – {formattedTime(b.end)}</span>
         <strong>{b.purpose==='blocked'?'Reserved':purposeLabel(b.purpose)}</strong>
         <small>{b.owner==='demo-self'?'Your preview booking':'Example only'}</small>
        </div>)}</div>:<p className="sr-empty-row">No sample reservations on this date.</p>}
      </article>;
     })}</div>
    </section>
   </>}
   {panel==='mine'&&<section className="sr-section">
    <div className="sr-section-title"><h2>My reservations</h2><small>Only this browser preview</small></div>
    {mine.length===0?<div className="sr-empty-mine"><span aria-hidden="true">▤</span><h3>No sample reservations yet.</h3><p>Use Reserve now to practice selecting a time, purpose, and resources. Nothing will be submitted.</p>
      <button type="button" onClick={()=>setPanel('schedule')}>Explore availability</button></div>:
      <div className="sr-unit-list">{mine.map(b=><article className="sr-unit-card" key={b.id}>
       <div className="sr-my-heading"><div><span className="sr-eyebrow">{b.status==='cancelled'?'CANCELLED SAMPLE':'SAMPLE RESERVATION'}</span><h3>{readableDay(b.date)}</h3></div><span className={b.status==='cancelled'?'sr-busy':'sr-free'}>{b.status}</span></div>
       <p><strong>{formattedTime(b.start)} – {formattedTime(b.end)}</strong> · {purposeLabel(b.purpose)}</p>
       <p className="sr-assignment">{Object.values(b.assignments).map(id=>RESOURCE_ORDER.flatMap(kind=>RESOURCES[kind].units).find(u=>u.id===id)?.label??'').join(' · ')}</p>
       <small className="sr-muted">{b.detail}</small>
       {b.status==='active'&&<button type="button" className="sr-cancel" onClick={()=>cancelMine(b.id)}>Cancel sample reservation</button>}
      </article>)}</div>}
   </section>}
   <p className="sr-footer-note">Design preview · {BOOKING_RULES.timeZone} · No Firebase or Supabase reservation writes</p>
  </div>
  <div className="sr-bottom"><button type="button" className="sr-reserve" onClick={startReserve}>
    <span aria-hidden="true">＋</span> Reserve now <span aria-hidden="true">→</span>
   </button></div>
  {showForm&&<div className="sr-overlay" onMouseDown={e=>{if(e.target===e.currentTarget){setShowForm(false);setError('');}}}>
   <div role="dialog" aria-modal="true" aria-labelledby="sr-form-title" className="sr-sheet">
    <div className="sr-grabber" aria-hidden="true"/>
    <div className="sr-sheet-heading"><div><span className="sr-eyebrow">PREVIEW ONLY</span><h2 id="sr-form-title">Reserve a study space</h2></div>
     <button type="button" onClick={()=>{setShowForm(false);setError('');}} aria-label="Close reservation form">×</button></div>
    <form onSubmit={submit}>
     <p className="sr-sheet-day">{readableDay(day)} · {currentPeriod(day,clock.day)} · All times in Las Vegas</p>
     <fieldset className="sr-resource-choices"><legend>What do you need?</legend>
      <div>{RESOURCE_ORDER.map(kind=><label key={kind} className={resources.includes(kind)?'is-checked':''}>
       <input type="checkbox" checked={resources.includes(kind)} onChange={()=>toggleResource(kind)}/>
       <span>{labels[kind].short}</span>
      </label>)}</div>
     </fieldset>
     <div className="sr-form-grid">
      <label>Start<select value={start} onChange={e=>updateStart(e.target.value)}>
       {allTimes.slice(0,-1).map(t=><option value={t} key={t}>{formattedTime(t)}</option>)}
      </select></label>
      <label>End<select value={end} onChange={e=>setEnd(e.target.value)}>
       {allTimes.slice(1).filter(t=>minutes(t)>minutes(start)).map(t=><option value={t} key={t}>{formattedTime(t)}</option>)}
      </select></label>
     </div>
     <fieldset className="sr-purpose-field"><legend>Reservation purpose</legend>
      <div>{(Object.keys(PURPOSES) as BookingPurpose[]).map(p=><label key={p} className={purpose===p?'is-checked':''}>
       <input type="radio" name="purpose" checked={purpose===p} onChange={()=>setPurpose(p)}/>
       <span>{PURPOSES[p].name}</span></label>)}</div>
     </fieldset>
     <label className="sr-detail-label">{PURPOSES[purpose].detailLabel}
      <input type="text" maxLength={PURPOSES[purpose].maxLength} value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Fictional details only" autoComplete="off"/>
     </label>
     <div className="sr-form-status" role="status">{checked.ok?
      <span>{Object.values(checked.assignments).map(id=>RESOURCE_ORDER.flatMap(kind=>RESOURCES[kind].units).find(u=>u.id===id)?.label??'').join(' + ')} available for this preview.</span>:
      <span>{checked.message}</span>}</div>
     {error&&<p className="sr-error" role="alert">{error}</p>}
     <p className="sr-risk-note">The existing scheduler includes priority takeovers and Force override. Those actions are deliberately disabled here until their new identity and permission rules are reviewed.</p>
     <button className="sr-confirm" type="submit">Add fictional reservation <span aria-hidden="true">→</span></button>
    </form>
   </div>
  </div>}
 </div></main>;
}
