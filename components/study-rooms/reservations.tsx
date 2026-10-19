'use client';
import {useRef,useState,useEffect} from 'react';
import type {ReactNode} from 'react';
import {FrameControls} from '../app-frame';
import {ChevronLeft,X} from '../home-icons';
import {useSwipeTabs} from '../../lib/use-swipe-tabs';
import {addDay,clock,startOptions,endOptions,purposes,validRange,bookingResources,kindLabels,purposeLabel,resourceNames} from '../../lib/study-rooms/domain';
import type {Booking,Schedule,Kind,Purpose,BookingCommand} from '../../lib/study-rooms/domain';
import './reservations.css';
import {BookingChanges,ResourceManagement} from './changes';
import {ResourceExtras} from './resource-extras';
import {ReservationHistory} from './history';
import type {HistoryPage,HistoryQuery} from '../../lib/study-rooms/history';
import type {AdminCommand,AdminData} from '../../lib/study-rooms/admin';

type View='schedule'|'mine'|'managed'|'history'|'more';
type Props={schedule:Schedule;changeDay:(day:string)=>void;submit:(command:BookingCommand)=>Promise<void>;refresh:()=>void;loadDay:(day:string)=>Promise<Schedule>;admin?:AdminData;saveAdmin:(c:AdminCommand)=>Promise<void>;loadHistory:(query:HistoryQuery)=>Promise<HistoryPage>;operations?:ReactNode;status?:ReactNode};

const stateLabel=(b:Booking)=>b.state==='cancelled'?'Cancelled':b.state==='ended'?'Ended early':b.hold?'Hold':'Confirmed';
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
 const scheduleScroll=useRef<HTMLDivElement>(null),scheduleCanvas=useRef<HTMLDivElement>(null);
 const positionedSchedule=useRef('');
 const [nowTop,setNowTop]=useState<number|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),requestId=useRef('');
 const cancelDialog=useRef<HTMLDialogElement>(null),[cancelId,setCancelId]=useState(''),[cancelVersion,setCancelVersion]=useState(1),[reason,setReason]=useState('');
 useEffect(()=>{if(cancelId)cancelDialog.current?.showModal();},[cancelId]);
 useEffect(()=>{if(view==='managed'&&!s.canManage)setView('mine');},[s.canManage,view]);
 useEffect(()=>{setSelectedSlot(null);},[s.day,kind]);

 const closed=s.bookingsOpen===false;
 const tabs:View[]=s.canManage?['schedule','mine','more','managed','history']:['schedule','mine','more','history'];
 const swipe=useSwipeTabs(tabs,view,setView);
 const resources=s.resources.filter(r=>r.kind===kind&&r.active!==false),times=Array.from({length:(s.close-s.open)/s.step},(_,i)=>s.open+i*s.step);
 const visible=s.bookings.filter(b=>b.day===s.day&&(b.state==='confirmed'||b.state==='ended'));
 const listed=s.bookings.filter(b=>b.day===s.day&&(b.mine||(view==='managed'&&s.canManage)));
 const selection=[resource,...extras];
 const selectedAvailable=selectedSlot?.day===s.day&&resources.some(r=>r.id===selectedSlot.id)&&validRange(s,selectedSlot.id,selectedSlot.time,selectedSlot.time+s.step);
 const lastDay=addDay(s.today,Math.max(0,s.horizon-1));
 const selectedDayIndex=Math.max(0,Math.round((Date.parse(s.day+'T12:00:00Z')-Date.parse(s.today+'T12:00:00Z'))/86400000));
 const dateWindow=Math.floor(selectedDayIndex/4)*4;
 const shownDays=Array.from({length:Math.min(4,Math.max(0,s.horizon-dateWindow))},(_,i)=>addDay(s.today,dateWindow+i));
 const ends=start===null?[]:endOptions(s,selection,start);

 // Use the server's Las Vegas clock. Refresh moves the indicator, never the reader's scroll.
 useEffect(()=>{
  if(view!=='schedule'){positionedSchedule.current='';setNowTop(null);return;}
  const scroller=scheduleScroll.current,canvas=scheduleCanvas.current;
  if(!scroller||!canvas)return;
  const key=s.day+':'+kind;
  function position(){
   if(!scroller||!canvas)return;
   const rows=Array.from(canvas.querySelectorAll<HTMLTableRowElement>('tbody tr[data-minute]'));
   const today=s.day===s.today;
   const inHours=today&&s.nowMinute>=s.open&&s.nowMinute<s.close;
   const index=Math.max(0,Math.min(rows.length-1,Math.floor((s.nowMinute-s.open)/s.step)));
   const row=rows[index];
   let top:number|null=null;
   if(inHours&&row){
    const rect=row.getBoundingClientRect(),origin=canvas.getBoundingClientRect();
    const next=rows[index+1]?.getBoundingClientRect();
    const height=next?next.top-rect.top:rect.height;
    top=rect.top-origin.top+((s.nowMinute-Number(row.dataset.minute))/s.step)*height;
   }
   setNowTop(top);
   if(positionedSchedule.current!==key){
    positionedSchedule.current=key;
    const header=canvas.querySelector('thead')?.getBoundingClientRect().height??44;
    scroller.scrollTop=today?(top===null?(s.nowMinute>=s.close?scroller.scrollHeight:0):Math.max(0,top-header-scroller.clientHeight*.2)):0;
   }
  }
  position();
  const observer=new ResizeObserver(position);observer.observe(canvas);observer.observe(scroller);
  return ()=>observer.disconnect();
 },[view,kind,s.day,s.today,s.nowMinute,s.open,s.close,s.step,resources.length]);

 function open(id?:string,time?:number,makeHold=false){if(closed)return;setExtras([]);setResource(id??resources[0]?.id??'');setStart(time??null);setEnd(time===undefined?null:time+s.step);setDetail('');setPurpose('contact');setStep(0);setHold(makeHold);setError('');requestId.current=crypto.randomUUID();dialog.current?.showModal();}
 function revise(){setStep(0);requestId.current=crypto.randomUUID();setError('');}
 async function confirm(){
  if(start===null||end===null)return;
  setBusy(true);setError('');
  try{
   await submit({requestId:requestId.current,action:hold?'hold':'reserve',resourceIds:selection,day:s.day,start,end,...(hold?{reason:detail}:{purpose,detail})});
   dialog.current?.close();setSelectedSlot(null);setMessage(hold?'Resource hold confirmed.':'Reservation confirmed. Your My Week activity is updated.');setView('mine');
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
 const resourceTabs=<div className="sr-segment sr-header-tabs" role="group" aria-label="Resource type">{(Object.keys(kindLabels) as Kind[]).map(id=><button type="button" key={id} aria-label={id==='room'?'Study rooms':undefined} aria-pressed={kind===id} onClick={()=>setKind(id)}>{id==='room'?'Rooms':id==='whiteboard'?'Whiteboards':'TVs'}</button>)}</div>;

 const schedule=<>
  <div ref={scheduleScroll} className="sr-scroll" tabIndex={0} data-no-swipe aria-label="Full-day resource schedule; scroll horizontally for more resources"><div ref={scheduleCanvas} className="sr-grid-canvas" style={{minWidth:Math.max(280,56+resources.length*56)}}><table>
   <thead><tr><th scope="col">Time</th>{resources.map(r=><th key={r.id} scope="col">{r.name}</th>)}</tr></thead>
   <tbody>{times.map(time=><tr key={time} data-minute={time}><th scope="row" aria-label={clock(time)} className={time%60===0||time===s.open?'sr-hour':'sr-half-hour'}><span aria-hidden="true">{clock(time).replace(/ [AP]M$/,'')}</span></th>{resources.map(r=>{
    const block=s.blocks.find(b=>(!b.resourceId||b.resourceId===r.id)&&time>=b.start&&time<b.end);
    const booking=visible.find(b=>bookingResources(b).includes(r.id)&&time>=b.start&&time<b.end);
    const openSlot=validRange(s,r.id,time,time+s.step);
    const chosen=selectedSlot?.day===s.day&&selectedSlot.id===r.id&&selectedSlot.time===time;
    if(block)return <td key={r.id} className="sr-block"><span>{block.label}</span></td>;
    if(booking)return <td key={r.id} className="sr-reserved"><span><b>{booking.hold?'Unavailable':booking.mine?'Yours':'Booked'}</b></span></td>;
    return <td key={r.id} className={chosen?'sr-slot-selected':undefined}><button type="button" aria-pressed={chosen} data-available={openSlot&&!closed} disabled={!openSlot||closed} aria-label={`${r.name}, ${clock(time)}, ${closed?'booking closed':openSlot?'available':'past'}`} onClick={()=>setSelectedSlot({id:r.id,time,day:s.day})}><span aria-hidden="true">{closed||!openSlot?'—':chosen?'✓':'+'}</span></button></td>;
   })}</tr>)}</tbody>
  </table>
  {s.day===s.today&&nowTop!==null&&<div className="sr-now-marker" role="img" style={{top:nowTop}} aria-label={`Current time ${clock(s.nowMinute)}, Las Vegas`}><span>{clock(s.nowMinute).replace(/ [AP]M$/,'')}</span></div>}
  </div></div>

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

 return <div className="ui-page sr-app" data-view={view} data-selection={Boolean(selectedSlot&&selectedAvailable&&view==='schedule'&&!closed)}>
  <FrameControls left={{label:'Schedule',icon:'calendar',onClick:()=>setView('schedule'),active:view==='schedule'}} right={{label:'Bookings',icon:'clock',onClick:()=>setView('mine'),active:view==='mine'}} onMore={()=>setView('more')} moreActive={['more','managed','history'].includes(view)} headerContent={view==='schedule'?resourceTabs:undefined} viewport={view==='schedule'}/>
  <main className="ui-main sr-main">
   <h1 className="ui-visually-hidden">Study Rooms</h1>
   {closed&&<p role="status" className="ui-notice sr-gate" data-tone="warning"><strong>Bookings are paused.</strong> Availability and reservations are managed within LV Zion Official.</p>}
   {message&&<p role="status" className="ui-notice sr-success" data-tone="success">{message}</p>}
   {view==='schedule'&&status}

   <div className="sr-layout">
    <section className="sr-primary-column" aria-label="Reservations">
     {view!=='more'&&<div className="sr-date-window" role="group" aria-label="Booking days">
      <button type="button" className="sr-date-arrow" aria-label="Previous day" disabled={s.day<=s.today} onClick={()=>changeDay(addDay(s.day,-1))}><ChevronLeft size={20}/></button>
      <div className="sr-date-days">{shownDays.map(date=>{
       const value=new Date(date+'T12:00:00Z'),special=[2,6].includes(value.getUTCDay());
       return <button type="button" key={date} className="sr-day" data-date={date} data-today={date===s.today} data-special={special} aria-label={longDay(date)+(date===s.today?', today':'')} aria-pressed={date===s.day} onClick={()=>changeDay(date)}>
        <span>{value.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})}</span><strong>{value.getUTCDate()}</strong>{date===s.today&&<small>Today</small>}{special&&<i aria-hidden="true">✦</i>}
       </button>;
      })}</div>
      <button type="button" className="sr-date-arrow" aria-label="Next day" disabled={s.day>=lastDay} onClick={()=>changeDay(addDay(s.day,1))}><ChevronLeft className="sr-next" size={20}/></button>
     </div>}
     {(view==='managed'||view==='history')&&<nav className="ui-tabs" aria-label="Reservation screens">{s.canManage&&tab('managed','Manage bookings')}{tab('history','History')}</nav>}
     <div className="sr-panel" {...swipe}>
      {view==='more'?<section className="sr-more"><h2>More</h2><button type="button" className="ui-row" onClick={()=>setView('history')}>Reservation history</button>{s.canManage&&<button type="button" className="ui-row" onClick={()=>setView('managed')}>Manage bookings & resources</button>}<button type="button" className="ui-row" onClick={refresh}>Refresh availability</button></section>:view==='history'?<ReservationHistory today={s.today} canManage={s.canManage} resources={s.resources} read={loadHistory}/>:<>
       {view!=='schedule'&&<div className="sr-panel-head">
        <div><h2>{heading}</h2><p className="ui-hint">{longDay(s.day)}</p></div>
        <button type="button" onClick={refresh} className="ui-button ui-button-quiet">Refresh</button>
       </div>}
       {view==='schedule'?(resources.length?schedule:<p className="ui-empty">No {kindLabels[kind].toLowerCase()} available. Choose another resource type.</p>):list}
      </>}
     </div>
    </section>

    {s.canManage&&view==='managed'&&<aside className="sr-side" aria-label="Manager tools">
     <section className="sr-section">
      <h2>Manage resources</h2>
      <p className="ui-hint">Place a resource hold or cancel an authorized booking. Neither action deletes its history.</p>
      <button type="button" className="ui-button ui-button-secondary" disabled={closed} onClick={()=>open(undefined,undefined,true)}>Place a hold</button>
     </section>
     {admin&&<ResourceManagement data={admin} today={s.today} save={saveAdmin}/>}
     {operations}
    </aside>}
   </div>
   {view!=='schedule'&&status}
  </main>

  {view==='schedule'&&resources.length>0&&<aside className="sr-reserve-dock" aria-label="Reservation action">
   {selectedSlot&&selectedAvailable&&!closed&&<div className="sr-selection-summary" role="status"><strong>{s.resources.find(r=>r.id===selectedSlot.id)?.name??'Resource'}</strong><span>{clock(selectedSlot.time)} – {clock(selectedSlot.time+s.step)}</span></div>}
   {!selectedSlot&&!closed&&<p className="sr-reserve-prompt">Choose an open time</p>}
   {closed&&<p className="sr-reserve-prompt">Reservations are paused</p>}
   {selectedSlot&&!selectedAvailable&&!closed&&<p role="status" className="ui-hint">That time is no longer available. Choose another open time.</p>}
   <button type="button" className="ui-button" aria-label={closed?'Bookings paused':undefined} disabled={busy||closed||Boolean(selectedSlot&&!selectedAvailable)} onClick={()=>open(selectedSlot?.id,selectedSlot?.time)}>{closed?'Paused':'Reserve'}</button>
  </aside>}



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

