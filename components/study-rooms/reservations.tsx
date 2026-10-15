'use client';
import {useRef,useState,useEffect} from 'react';
import type {ReactNode} from 'react';
import AppHeader from '../app-header';
import AppSwitcher from '../app-switcher';
import {CalendarDays,ChevronLeft,Clock3,Grid2X2,House,UsersRound,X} from '../home-icons';
import {useSwipeTabs} from '../../lib/use-swipe-tabs';
import {addDay,clock,startOptions,endOptions,purposes,validRange,bookingResources,kindLabels,purposeLabel,resourceNames} from '../../lib/study-rooms/domain';
import type {Booking,Schedule,Kind,Purpose,BookingCommand} from '../../lib/study-rooms/domain';
import './reservations.css';
import {BookingChanges,ResourceManagement} from './changes';
import {ResourceExtras} from './resource-extras';
import {ReservationHistory} from './history';
import type {HistoryPage,HistoryQuery} from '../../lib/study-rooms/history';
import type {AdminCommand,AdminData} from '../../lib/study-rooms/admin';

type View='schedule'|'mine'|'managed'|'history';
type Props={schedule:Schedule;changeDay:(day:string)=>void;submit:(command:BookingCommand)=>Promise<void>;refresh:()=>void;loadDay:(day:string)=>Promise<Schedule>;admin?:AdminData;saveAdmin:(c:AdminCommand)=>Promise<void>;loadHistory:(query:HistoryQuery)=>Promise<HistoryPage>;operations?:ReactNode;status?:ReactNode};

const stateLabel=(b:Booking)=>b.state==='cancelled'?'Cancelled':b.state==='ended'?'Ended early':b.hold?'Hold':'Confirmed';
const weekday=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'});
const longDay=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'});

/** Time first: start over end on the left, in tabular figures, like the Home day line. */
export function TimeColumn({start,end}:{start:number;end:number}){
 return <div className="sr-time"><span>{clock(start)}</span><span className="ui-visually-hidden"> to </span><small>{clock(end)}</small></div>;
}

export default function Reservations({schedule:s,changeDay,submit,refresh,loadDay,admin,saveAdmin,loadHistory,operations,status}:Props){
 const [kind,setKind]=useState<Kind>('room'),[view,setView]=useState<View>('schedule');
 const [extras,setExtras]=useState<string[]>([]);
 const [resource,setResource]=useState(''),[purpose,setPurpose]=useState<Purpose>('contact'),[detail,setDetail]=useState('');
 const [start,setStart]=useState<number|null>(null),[end,setEnd]=useState<number|null>(null),[step,setStep]=useState(0),[hold,setHold]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [selectedSlot,setSelectedSlot]=useState<{id:string;time:number;day:string}|null>(null);
 const [appsOpen,setAppsOpen]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),requestId=useRef('');
 const cancelDialog=useRef<HTMLDialogElement>(null),[cancelId,setCancelId]=useState(''),[cancelVersion,setCancelVersion]=useState(1),[reason,setReason]=useState('');
 useEffect(()=>{if(cancelId)cancelDialog.current?.showModal();},[cancelId]);
 useEffect(()=>{if(view==='managed'&&!s.canManage)setView('mine');},[s.canManage,view]);
 useEffect(()=>{setSelectedSlot(null);},[s.day,kind]);

 const closed=s.bookingsOpen===false;
 const tabs:View[]=s.canManage?['schedule','mine','managed','history']:['schedule','mine','history'];
 const swipe=useSwipeTabs(tabs,view,setView);
 const resources=s.resources.filter(r=>r.kind===kind&&r.active!==false),times=Array.from({length:(s.close-s.open)/s.step},(_,i)=>s.open+i*s.step);
 const visible=s.bookings.filter(b=>b.day===s.day&&(b.state==='confirmed'||b.state==='ended'));
 const listed=s.bookings.filter(b=>b.day===s.day&&(b.mine||(view==='managed'&&s.canManage)));
 const selection=[resource,...extras];
 const ends=start===null?[]:endOptions(s,selection,start);

 function open(id?:string,time?:number,makeHold=false){if(closed)return;setExtras([]);setResource(id??resources[0]?.id??'');setStart(time??null);setEnd(time===undefined?null:time+s.step);setDetail('');setPurpose('contact');setStep(0);setHold(makeHold);setError('');requestId.current=crypto.randomUUID();dialog.current?.showModal();}
 function revise(){setStep(0);requestId.current=crypto.randomUUID();setError('');}
 async function confirm(){
  if(start===null||end===null)return;
  setBusy(true);setError('');
  try{
   await submit({requestId:requestId.current,action:hold?'hold':'reserve',resourceIds:selection,day:s.day,start,end,...(hold?{reason:detail}:{purpose,detail})});
   dialog.current?.close();setMessage(hold?'Resource hold confirmed.':'Reservation confirmed. Your My Week activity is updated.');setView('mine');
  }catch(e){setError(e instanceof Error?e.message:'Reservation failed. Please refresh and try again.');}
  finally{setBusy(false);}
 }
 async function cancel(){
  setBusy(true);setError('');
  try{await submit({requestId:requestId.current,action:'cancel',bookingId:cancelId,reason,expectedVersion:cancelVersion});cancelDialog.current?.close();setCancelId('');setMessage('Reservation cancelled; history retained.');}
  catch(e){setError(e instanceof Error?e.message:'Cancellation failed.');}
  finally{setBusy(false);}
 }

 const tab=(id:View,label:string)=><button type="button" className="ui-tab" onClick={()=>setView(id)} aria-current={view===id?'page':undefined}>{label}</button>;
 const heading=view==='mine'?'My reservations':view==='managed'?'Authorized reservations':s.day===s.today?'Today’s availability':'Availability';

 const schedule=<>
  <div className="sr-scroll" tabIndex={0} data-no-swipe aria-label="Full-day resource schedule; scroll horizontally for more resources"><table style={{minWidth:Math.max(302,64+resources.length*64)}}>
   <thead><tr><th scope="col">Time</th>{resources.map(r=><th key={r.id} scope="col">{r.name}</th>)}</tr></thead>
   <tbody>{times.map(time=><tr key={time}><th scope="row">{clock(time)}</th>{resources.map(r=>{
    const block=s.blocks.find(b=>(!b.resourceId||b.resourceId===r.id)&&time>=b.start&&time<b.end);
    const booking=visible.find(b=>bookingResources(b).includes(r.id)&&time>=b.start&&time<b.end);
    const openSlot=validRange(s,r.id,time,time+s.step);
    const chosen=selectedSlot?.day===s.day&&selectedSlot.id===r.id&&selectedSlot.time===time;
    if(block)return <td key={r.id} className="sr-block"><span>{block.label}</span></td>;
    if(booking)return <td key={r.id} className="sr-reserved"><span><b>{booking.hold?'Unavailable':booking.label}</b>{booking.mine&&booking.purpose&&<small>{purposeLabel(booking.purpose)}</small>}</span></td>;
    return <td key={r.id} className={chosen?'sr-slot-selected':undefined}><button type="button" aria-pressed={chosen} disabled={!openSlot||closed} aria-label={`${r.name}, ${clock(time)}, ${closed?'booking closed':openSlot?'available':'past'}`} onClick={()=>setSelectedSlot({id:r.id,time,day:s.day})}>{closed?'Not open':!openSlot?'Past':chosen?'Selected':'+ Open'}</button></td>;
   })}</tr>)}</tbody>
  </table></div>
  <p className="ui-hint sr-note">Other members’ bookings show as occupied, without names. Private purpose details never appear on this shared schedule.</p>
 </>;

 const list=<ul className="ui-list sr-my-list">
  {listed.map(b=><li key={b.id}><article className="sr-item">
   <TimeColumn start={b.start} end={b.end}/>
   <div className="sr-item-body">
    <h3>{resourceNames(s.resources,bookingResources(b),'Resource')}</h3>
    <p className="sr-meta"><span className="sr-state" data-state={b.state}>{stateLabel(b)}</span>{b.version&&<span className="sr-revision"> · Revision {b.version}</span>}</p>
    {view==='managed'&&<p>{b.label}</p>}
    {b.purpose&&<p>{purposeLabel(b.purpose)}{b.detail?' · '+b.detail:''}</p>}
    {b.originalEnd&&b.originalEnd!==b.end&&<p>Originally until {clock(b.originalEnd)}. Remaining slots released.</p>}
    <div className="sr-action-row">
     <BookingChanges booking={b} schedule={s} submit={submit} loadDay={loadDay} changeDay={changeDay}/>
     {b.state==='confirmed'&&(!b.hold||s.canManage)&&(s.day>s.today||b.end>s.nowMinute)&&<button type="button" className="ui-button ui-button-secondary" onClick={()=>{requestId.current=crypto.randomUUID();setError('');setReason('');setCancelVersion(b.version??1);setCancelId(b.id);}}>Cancel {b.hold?'hold':'reservation'}</button>}
    </div>
   </div>
  </article></li>)}
  {!listed.length&&<li className="ui-empty">No reservations for this date.</li>}
 </ul>;

 return <div className="ui-page sr-app">
  <header className="sr-topbar">
   <a href="/members" className="sr-topbar-home" aria-label="LV Zion home"><ChevronLeft size={21}/></a>
   <h1>Study Rooms</h1>
   <button type="button" className="sr-topbar-bookings" aria-label="View bookings" onClick={()=>setView('mine')}><CalendarDays size={21}/></button>
  </header>
  <main className="ui-main sr-main">
   {closed&&<p role="status" className="ui-notice sr-gate" data-tone="warning"><strong>Bookings not open yet.</strong> The original Study Room Scheduler still accepts reservations; this screen is for authorized setup review until the cutover is approved.</p>}
   {message&&<p role="status" className="ui-notice sr-success" data-tone="success">{message}</p>}

   <div className="sr-layout">
    <section className="sr-primary-column" aria-label="Reservations">
     {view==='schedule'&&<div className="sr-segment" role="group" aria-label="Resource type">{(Object.keys(kindLabels) as Kind[]).map(id=><button type="button" key={id} aria-pressed={kind===id} onClick={()=>setKind(id)}>{kindLabels[id]}</button>)}</div>}
     <div className="sr-days" aria-label="Booking days">{Array.from({length:s.horizon},(_,i)=>addDay(s.today,i)).map((date,i)=><button type="button" key={date} aria-pressed={s.day===date} onClick={()=>changeDay(date)}><span>{i===0?'Today':weekday(date)}</span><strong>{new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})}</strong></button>)}</div>
     <div className="sr-quick-actions">
      <span>Las Vegas time · 30-minute slots</span>
      <div className="sr-sticky"><button type="button" className="ui-button" onClick={()=>open()} disabled={busy||!resources.length||closed}>{closed?'Bookings Not Open':'Reserve Now'}</button></div>
     </div>
     <nav className="ui-tabs" aria-label="Reservation screens">
      {tab('schedule','Availability')}{tab('mine','My Reservations')}{s.canManage&&tab('managed','Manage bookings')}{tab('history','History')}
     </nav>
     <div className="sr-panel" {...swipe}>
      {view==='history'?<ReservationHistory today={s.today} canManage={s.canManage} resources={s.resources} read={loadHistory}/>:<>
       <div className="sr-panel-head">
        <div><h2>{view==='schedule'?longDay(s.day):heading}</h2><p className="ui-hint">{view==='schedule'?'Choose an open time to reserve.':longDay(s.day)}</p></div>
        <button type="button" onClick={refresh} className="ui-button ui-button-quiet">Refresh</button>
       </div>
       {view==='schedule'?schedule:list}
      </>}
     </div>
    </section>

    {s.canManage&&<aside className="sr-side" aria-label="Manager tools">
     <section className="sr-section">
      <h2>Manage resources</h2>
      <p className="ui-hint">Place a resource hold or cancel an authorized booking. Neither action deletes its history.</p>
      <button type="button" className="ui-button ui-button-secondary" disabled={closed} onClick={()=>open(undefined,undefined,true)}>Place a hold</button>
     </section>
     {admin&&<ResourceManagement data={admin} today={s.today} save={saveAdmin}/>}
     {operations}
    </aside>}
   </div>
   {status}
  </main>

  <nav className="sr-bottom-nav" aria-label="Study Room bottom navigation">
   <a href="/members" aria-label="Home"><House size={21}/><span>Home</span></a>
   <button type="button" onClick={()=>setView('schedule')} aria-current={view==='schedule'?'page':undefined}><CalendarDays size={21}/><span>Schedule</span></button>
   <button type="button" className="sr-bottom-apps" aria-label="Open apps" onClick={()=>setAppsOpen(true)}><span className="sr-bottom-apps-icon"><Grid2X2 size={24}/></span><span>Apps</span></button>
   <button type="button" onClick={()=>setView('mine')} aria-current={view==='mine'?'page':undefined}><Clock3 size={21}/><span>Bookings</span></button>
   <button type="button" onClick={()=>setView(s.canManage?'managed':'history')} aria-current={view===(s.canManage?'managed':'history')?'page':undefined}><UsersRound size={21}/><span>{s.canManage?'Manage':'History'}</span></button>
  </nav>
  {selectedSlot&&view==='schedule'&&!closed&&<aside className="sr-selection-bar" aria-label="Selected reservation">
   <div><strong>{s.resources.find(r=>r.id===selectedSlot.id)?.name??'Resource'}</strong><small>{weekday(s.day)}, {new Date(s.day+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})} · {clock(selectedSlot.time)} to {clock(selectedSlot.time+s.step)}</small></div>
   <button type="button" className="ui-button" onClick={()=>{open(selectedSlot.id,selectedSlot.time);setSelectedSlot(null);}}>Reserve</button>
  </aside>}

  <AppSwitcher open={appsOpen} onClose={()=>setAppsOpen(false)}/>

  <dialog ref={dialog} className="ui-sheet sr-dialog" aria-label="Reserve a resource" onCancel={e=>{if(busy)e.preventDefault();}}><div className="ui-sheet-body">
   <div className="sr-sheet-head">
    <p className="ui-kicker">{hold?'Resource hold':'New reservation'}, step {step===0?1:2} of 2</p>
    <button type="button" disabled={busy} className="ui-button ui-button-quiet sr-close" aria-label="Close reservation" onClick={()=>dialog.current?.close()}><X/></button>
   </div>
   <h2>{step===0?(hold?'Keep this resource free':'Reserve a space'):'Review your reservation'}</h2>
   {error&&<p role="alert" className="ui-notice sr-error" data-tone="danger">{error}</p>}
   {step===0?<form onSubmit={e=>{e.preventDefault();setStep(1);}}>
    <label className="ui-field">Resource<select className="ui-input" aria-label="Resource" value={resource} required onChange={e=>{setResource(e.target.value);setExtras(extras.filter(id=>s.resources.find(r=>r.id===id)?.kind!==s.resources.find(r=>r.id===e.target.value)?.kind));setStart(null);setEnd(null);}}>{s.resources.filter(r=>r.active!==false).map(r=><option key={r.id} value={r.id}>{r.name} · {kindLabels[r.kind]}</option>)}</select></label>
    <ResourceExtras resources={s.resources} primary={resource} value={extras} onChange={ids=>{setExtras(ids);setStart(null);setEnd(null);}}/>
    {!hold&&<label className="ui-field">Purpose<select className="ui-input" aria-label="Purpose" value={purpose} onChange={e=>{setPurpose(e.target.value as Purpose);setDetail('');}}>{purposes.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>}
    <label className="ui-field">{hold?'Hold reason':purposes.find(p=>p.id===purpose)?.detail}<input className="ui-input" value={detail} onChange={e=>setDetail(e.target.value)} required minLength={hold?5:1} maxLength={hold||purpose==='other'?240:120}/></label>
    <p className="ui-hint sr-field-note">Private to you and explicitly authorized reservation managers.</p>
    <div className="sr-two">
     <label className="ui-field">Start<select className="ui-input" aria-label="Start" value={start??''} required onChange={e=>{setStart(Number(e.target.value));setEnd(null);}}><option value="" disabled>Select start</option>{startOptions(s,selection).map(n=><option key={n} value={n}>{clock(n)}</option>)}</select></label>
     <label className="ui-field">End<select className="ui-input" aria-label="End" value={end??''} required disabled={start===null} onChange={e=>setEnd(Number(e.target.value))}><option value="" disabled>Select end</option>{ends.map(n=><option key={n} value={n}>{clock(n)}</option>)}</select></label>
    </div>
    {!startOptions(s,selection).length&&<p role="status" className="ui-hint">No available times. Choose a different resource or date.</p>}
    <button className="ui-button ui-button-block" disabled={end===null||start===null||!validRange(s,selection,start,end)||!detail.trim()}>Review reservation</button>
   </form>:<>
    <dl className="sr-summary"><dt>Resource</dt><dd>{resourceNames(s.resources,selection)}</dd><dt>Date</dt><dd>{longDay(s.day)}, Las Vegas</dd><dt>Time</dt><dd>{clock(start!)} to {clock(end!)}</dd><dt>{hold?'Hold reason':'Purpose'}</dt><dd>{hold?detail:purposeLabel(purpose)}</dd></dl>
    <p className="ui-hint">The server rechecks availability when you confirm.</p>
    <div className="sr-sheet-actions">
     <button type="button" className="ui-button ui-button-block" disabled={busy} onClick={()=>{void confirm();}}>{busy?'Saving…':'Confirm reservation'}</button>
     <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={busy} onClick={revise}>Back to edit</button>
    </div>
   </>}
  </div></dialog>

  <dialog ref={cancelDialog} className="ui-sheet sr-dialog" aria-label="Cancel reservation" onClose={()=>setCancelId('')} onCancel={e=>{if(busy)e.preventDefault();}}><div className="ui-sheet-body">
   <h2>Cancel this reservation?</h2>
   <p className="ui-hint">All resources in this reservation become available together; the record stays in your history.</p>
   {error&&<p role="alert" className="ui-notice sr-error" data-tone="danger">{error}</p>}
   <label className="ui-field">Reason<input className="ui-input" required minLength={5} maxLength={240} value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <div className="sr-sheet-actions">
    <button type="button" className="ui-button ui-button-danger ui-button-block" disabled={busy||reason.trim().length<5} onClick={()=>{void cancel();}}>Confirm cancellation</button>
    <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={busy} onClick={()=>cancelDialog.current?.close()}>Keep reservation</button>
   </div>
  </div></dialog>
 </div>;
}
