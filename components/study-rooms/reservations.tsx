'use client';
import {useRef,useState,useEffect} from 'react';
import type {ReactNode} from 'react';
import {FrameControls} from '../app-frame';
import {ArrowRight,CalendarDays,Check,ChevronLeft,Clock3,Contrast,FileText,Plus,Settings,ShieldCheck,X} from '../home-icons';
import {EmptyState,IconBox,PageHeading,Row,SectionHeader} from '../ui-kit';
import {useSwipeTabs} from '../../lib/use-swipe-tabs';
import {addDay,clock,startOptions,endOptions,purposes,validRange,bookingResources,kindLabels,purposeLabel,resourceNames} from '../../lib/study-rooms/domain';
import type {Booking,Schedule,Kind,Purpose,BookingCommand} from '../../lib/study-rooms/domain';
import './reservations.css';
import {BookingChanges,ResourceManagement} from './changes';
import {ResourceExtras} from './resource-extras';
import {ReservationHistory} from './history';
import {ResourceInventory} from './inventory';
import {Callout,DateBlock,KindIcon,duration,longDay,shortRange,timeRange} from './parts';
import type {HistoryPage,HistoryQuery} from '../../lib/study-rooms/history';
import type {AdminCommand,AdminData} from '../../lib/study-rooms/admin';

type View='schedule'|'mine'|'managed'|'history'|'more';
type Props={schedule:Schedule;changeDay:(day:string)=>void;submit:(command:BookingCommand)=>Promise<void>;refresh:()=>void;loadDay:(day:string)=>Promise<Schedule>;admin?:AdminData;saveAdmin:(c:AdminCommand)=>Promise<void>;loadHistory:(query:HistoryQuery)=>Promise<HistoryPage>;operations?:ReactNode;status?:ReactNode};

const stateLabel=(b:Booking)=>b.state==='cancelled'?'Cancelled':b.state==='ended'?'Ended early':b.hold?'Hold':'Confirmed';
const stateTone=(b:Booking)=>b.state==='confirmed'?(b.hold?'warning':undefined):'muted';
const kinds=[['room','Rooms'],['whiteboard','Whiteboards'],['tv','TVs']] as const;

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
 const positionedSchedule=useRef(''),autoScroll=useRef<number|null>(null);
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
 const selectedResource=selectedSlot?s.resources.find(r=>r.id===selectedSlot.id):undefined;
 const lastDay=addDay(s.today,Math.max(0,s.horizon-1));
 const selectedDayIndex=Math.max(0,Math.round((Date.parse(s.day+'T12:00:00Z')-Date.parse(s.today+'T12:00:00Z'))/86400000));
 const dateWindow=Math.floor(selectedDayIndex/4)*4;
 const shownDays=Array.from({length:Math.min(4,Math.max(0,s.horizon-dateWindow))},(_,i)=>addDay(s.today,dateWindow+i));
 const ends=start===null?[]:endOptions(s,selection,start);
 const showSelection=Boolean(selectedSlot&&selectedAvailable&&!closed);
 // The time marker carries the exact time, so its row's own label steps aside.
 const nowRow=s.day===s.today&&s.nowMinute>=s.open&&s.nowMinute<s.close?s.open+Math.floor((s.nowMinute-s.open)/s.step)*s.step:null;

 // Use the server's Las Vegas clock. Refresh moves the indicator, never the reader's scroll.
 useEffect(()=>{
  if(view!=='schedule'){positionedSchedule.current='';autoScroll.current=null;setNowTop(null);return;}
  const scroller=scheduleScroll.current,canvas=scheduleCanvas.current;
  if(!scroller||!canvas)return;
  const key=s.day+':'+kind;
  /** Places the first view near the current time; while the reader has not scrolled, layout settling keeps that place. */
  function position(resized=false){
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
   const header=canvas.querySelector('thead')?.getBoundingClientRect().height??44;
   const target=today?(top===null?(s.nowMinute>=s.close?scroller.scrollHeight:0):Math.max(0,top-header-scroller.clientHeight*.2)):0;
   if(positionedSchedule.current!==key){positionedSchedule.current=key;scroller.scrollTop=target;autoScroll.current=scroller.scrollTop;}
   else if(resized&&autoScroll.current!==null&&Math.abs(scroller.scrollTop-autoScroll.current)<1){scroller.scrollTop=target;autoScroll.current=scroller.scrollTop;}
  }
  position();
  const observer=new ResizeObserver(()=>position(true));observer.observe(canvas);observer.observe(scroller);
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
 function viewAvailability(next:Kind){setKind(next);setView('schedule');}

 const tab=(id:View,label:string)=><button type="button" className="ui-tab" onClick={()=>setView(id)} aria-current={view===id?'page':undefined}>{label}</button>;
 const viewTabs=s.canManage?<nav className="ui-tabs sr-view-tabs" aria-label="Reservation screens">{tab('managed','Manage bookings')}{tab('history','History')}</nav>:null;
 const resourceTabs=<div className="ui-segmented sr-resource-tabs" role="group" aria-label="Resource type">{kinds.map(([id,label])=><button type="button" key={id} aria-label={id==='room'?'Study rooms':undefined} aria-pressed={kind===id} onClick={()=>setKind(id)}>{label}</button>)}</div>;

 const dates=<div className="sr-date-window" role="group" aria-label="Booking days">
  <button type="button" className="sr-date-arrow" aria-label="Previous day" disabled={s.day<=s.today} onClick={()=>changeDay(addDay(s.day,-1))}><ChevronLeft size={20}/></button>
  <div className="sr-date-days">{shownDays.map(date=>{
   const value=new Date(date+'T12:00:00Z'),special=[2,6].includes(value.getUTCDay()),chosen=date===s.day,today=date===s.today;
   return <button type="button" key={date} className="sr-day" data-date={date} data-today={today} data-special={special} aria-label={longDay(date)+(today?', today':'')} aria-pressed={chosen} onClick={()=>changeDay(date)}>
    <span>{value.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})}</span><strong>{value.getUTCDate()}</strong><small>{today?'Today':chosen?'Selected':value.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'})}</small>{special&&<i aria-hidden="true"/>}
   </button>;
  })}</div>
  <button type="button" className="sr-date-arrow" aria-label="Next day" disabled={s.day>=lastDay} onClick={()=>changeDay(addDay(s.day,1))}><ChevronLeft className="sr-next" size={20}/></button>
 </div>;

 const planner=<>
  <div ref={scheduleScroll} className="sr-scroll" tabIndex={0} data-no-swipe aria-label="Full-day resource schedule; scroll horizontally for more resources"><div ref={scheduleCanvas} className="sr-grid-canvas" style={{minWidth:Math.max(260,52+resources.length*58)}}><table>
   <thead><tr><th scope="col">Time</th>{resources.map(r=><th key={r.id} scope="col">{r.name}</th>)}</tr></thead>
   <tbody>{times.map(time=><tr key={time} data-minute={time}><th scope="row" aria-label={clock(time)} className={time%60===0||time===s.open?'sr-hour':'sr-half-hour'} data-now={nowTop!==null&&time===nowRow?'true':undefined}><span aria-hidden="true">{clock(time).replace(/ [AP]M$/,'')}</span></th>{resources.map(r=>{
    const block=s.blocks.find(b=>(!b.resourceId||b.resourceId===r.id)&&time>=b.start&&time<b.end);
    const booking=visible.find(b=>bookingResources(b).includes(r.id)&&time>=b.start&&time<b.end);
    const openSlot=validRange(s,r.id,time,time+s.step);
    const chosen=selectedSlot?.day===s.day&&selectedSlot.id===r.id&&selectedSlot.time===time;
    if(block)return <td key={r.id} className="sr-block"><span>{block.label}</span></td>;
    if(booking)return <td key={r.id} className="sr-reserved" data-mine={booking.mine&&!booking.hold}><span><b>{booking.hold?'Unavailable':booking.mine?'Yours':'Booked'}</b></span></td>;
    return <td key={r.id} className={chosen?'sr-slot-selected':undefined}><button type="button" aria-pressed={chosen} data-available={openSlot&&!closed} disabled={!openSlot||closed} aria-label={`${r.name}, ${clock(time)}, ${closed?'booking closed':openSlot?'available':'past'}`} onClick={()=>setSelectedSlot({id:r.id,time,day:s.day})}>{openSlot&&!closed?(chosen?<Check size={20}/>:<Plus size={20}/>):null}</button></td>;
   })}</tr>)}</tbody>
  </table>
  {s.day===s.today&&nowTop!==null&&<div className="sr-now-marker" role="img" style={{top:nowTop}} aria-label={`Current time ${clock(s.nowMinute)}, Las Vegas`}><span>{clock(s.nowMinute).replace(/ [AP]M$/,'')}</span></div>}
  </div></div>
  <ul className="ui-legend sr-legend" aria-label="Legend">
   <li><Plus size={14}/>Available</li><li><Check size={14}/>Selected</li><li><i className="sr-legend-booked" aria-hidden="true"/>Booked</li>
  </ul>
 </>;

 const tray=<aside className="sr-reserve-dock" aria-label="Reservation action">
  {showSelection&&<div className="sr-selection-summary" role="status"><small>Selected</small><strong>{selectedResource?.name??'Resource'} · {shortRange(selectedSlot!.time,selectedSlot!.time+s.step)}</strong></div>}
  {!selectedSlot&&!closed&&<p className="sr-reserve-prompt"><small>Selected</small><strong>Choose an open time</strong></p>}
  {closed&&<p className="sr-reserve-prompt"><small>Bookings paused</small><strong>Reservations are paused</strong></p>}
  {selectedSlot&&!selectedAvailable&&!closed&&<p role="status" className="ui-hint">That time is no longer available. Choose another open time.</p>}
  <button type="button" className="ui-button" aria-label={closed?'Bookings paused':undefined} disabled={busy||closed||Boolean(selectedSlot&&!selectedAvailable)} onClick={()=>open(selectedSlot?.id,selectedSlot?.time)}>{closed?'Paused':'Reserve'}<ArrowRight size={18}/></button>
 </aside>;

 const rail=<aside className="ui-glass sr-rail" aria-label="Selected resource">
  <span className="ui-eyebrow">{showSelection?'Selected resource':kinds.find(([id])=>id===kind)?.[1]}</span>
  <span className="sr-rail-art" aria-hidden="true"><KindIcon kind={showSelection?selectedResource?.kind:kind} size={64}/></span>
  <h2>{showSelection?selectedResource?.name:'Choose an open time'}</h2>
  <p>{showSelection?`${kindLabels[selectedResource?.kind??kind]} · reserved in 30-minute steps.`:`${resources.length} ${resources.length===1?'resource':'resources'} on this date. Select a tile to start a reservation.`}</p>
  <div className="sr-rail-divider"/>
  <Row lead={<IconBox><Clock3 size={18}/></IconBox>} title={showSelection?shortRange(selectedSlot!.time,selectedSlot!.time+s.step):'Las Vegas time'} detail={longDay(s.day)}/>
 </aside>;

 function card(b:Booking){
  const upcoming=b.day>s.today||b.start>s.nowMinute,running=b.day===s.today&&b.start<=s.nowMinute&&b.end>s.nowMinute;
  const when=view==='managed'?b.label:running?'In progress':upcoming?'Upcoming':'Earlier';
  const names=resourceNames(s.resources,bookingResources(b),'Resource');
  return <li key={b.id}><article className="ui-glass sr-item sr-booking" data-state={b.state}>
   <DateBlock date={b.day}/>
   <div className="sr-item-body">
    <span className="ui-eyebrow">{when}</span>
    <h3>{names}</h3>
    <p className="sr-booking-time">{timeRange(b.start,b.end)} · {duration(b.end-b.start)}</p>
    <p className="sr-meta"><span className="ui-tag sr-state" data-state={b.state} data-tone={stateTone(b)}>{stateLabel(b)}</span>{b.version&&<span className="sr-revision">Revision {b.version}</span>}</p>
    {b.purpose&&<p>{purposeLabel(b.purpose)}{b.detail?' · '+b.detail:''}</p>}
    {b.originalEnd&&b.originalEnd!==b.end&&<p>Originally until {clock(b.originalEnd)}. Remaining slots released.</p>}
   </div>
   <div className="sr-action-row">
    <BookingChanges booking={b} schedule={s} submit={submit} loadDay={loadDay} changeDay={changeDay}/>
    {b.state==='confirmed'&&(!b.hold||s.canManage)&&(s.day>s.today||b.end>s.nowMinute)&&<button type="button" className="ui-button ui-button-quiet sr-cancel" onClick={()=>{requestId.current=crypto.randomUUID();setError('');setReason('');setCancelVersion(b.version??1);setCancelId(b.id);}}>Cancel {b.hold?'hold':'reservation'}</button>}
   </div>
  </article></li>;
 }

 const list=<>
  <ul className="ui-list sr-my-list">{listed.map(card)}</ul>
  {!listed.length&&<div className="ui-glass sr-empty-card"><EmptyState icon={<CalendarDays/>} title="No reservations for this date." action={view==='mine'?<button type="button" className="ui-button" onClick={()=>setView('schedule')}>Find an open time<ArrowRight size={18}/></button>:undefined}>{view==='mine'?'Choose another date above, or reserve an open time.':'No member has reserved a resource on this date.'}</EmptyState></div>}
 </>;

 const heading=view==='schedule'?<PageHeading eyebrow="A place to focus" title="Study Rooms" lede="Choose a resource, day and available time."/>
  :view==='mine'?<PageHeading eyebrow="Your reserved spaces" title="My reservations" lede={longDay(s.day)+', Las Vegas time'}/>
  :view==='managed'?<PageHeading eyebrow="Authorized management" title="Manage bookings" lede="Oversee reservations, resources and the service calendar."/>
  :view==='more'?<PageHeading eyebrow="Study Rooms" title="More" lede="History, management and settings."/>:null;

 return <div className="ui-page sr-app" data-view={view} data-selection={Boolean(showSelection&&view==='schedule')}>
  <FrameControls left={{label:'Schedule',icon:'calendar',onClick:()=>setView('schedule'),active:view==='schedule'}} right={{label:'Bookings',icon:'clock',onClick:()=>setView('mine'),active:view==='mine'}} onMore={()=>setView('more')} moreActive={['more','managed','history'].includes(view)} viewport={view==='schedule'}/>
  <main className="ui-main sr-main">
   <div className="sr-layout">
    <section className="sr-primary-column" aria-label="Reservations">
     {heading}
     {closed&&<p role="status" className="ui-notice sr-gate" data-tone="warning"><strong>Bookings are paused.</strong> Availability and reservations are managed within LV Zion Official.</p>}
     {message&&<p role="status" className="ui-notice sr-success" data-tone="success">{message}</p>}
     {view==='schedule'&&status}
     {view==='managed'&&viewTabs}
     {view==='schedule'&&resourceTabs}
     {view!=='more'&&view!=='history'&&dates}
     <div className={view==='schedule'?'ui-glass sr-panel sr-planner':'sr-panel'} {...swipe}>
      {view==='more'?<section className="sr-more" aria-label="More">
       <div className="ui-glass ui-glass-tight"><ul className="ui-list">
        <li><Row lead={<IconBox><Clock3/></IconBox>} title="Reservation history" detail="Past, ended and cancelled reservations" label="Reservation history" onClick={()=>setView('history')}/></li>
        {s.canManage&&<li><Row lead={<IconBox><Settings/></IconBox>} title="Manage bookings & resources" detail="Holds, inventory and the service calendar" label="Manage bookings & resources" onClick={()=>setView('managed')}/></li>}
        <li><Row lead={<IconBox><Contrast/></IconBox>} title="Appearance" detail="Light, Dark or System" label="Appearance" href="/appearance"/></li>
        <li><Row lead={<IconBox><CalendarDays/></IconBox>} title="Refresh availability" detail="Reload this date from the server" label="Refresh availability" onClick={refresh}/></li>
       </ul></div>
      </section>
      :view==='history'?<ReservationHistory today={s.today} canManage={s.canManage} resources={s.resources} read={loadHistory} tabs={viewTabs}/>
      :view==='schedule'?(resources.length?planner:<EmptyState icon={<KindIcon kind={kind} size={30}/>} title={`No ${kindLabels[kind].toLowerCase()} available.`}>Choose another resource type.</EmptyState>)
      :<>
       {view==='managed'&&<SectionHeader title="Authorized reservations" note={`${listed.length} on this date`} action={<button type="button" onClick={refresh} className="ui-button ui-button-quiet">Refresh</button>}/>}
       {list}
       {view==='mine'&&<>
        <SectionHeader title="Plan ahead"/>
        <div className="ui-glass ui-glass-tight"><ul className="ui-list"><li><Row lead={<IconBox><KindIcon kind="room"/></IconBox>} title="Find another space" detail="See the availability planner" onClick={()=>setView('schedule')}/></li></ul></div>
        <Callout icon={<ShieldCheck size={22}/>} title="Private by design">Purpose details are visible only to you and explicitly authorized reservation managers.</Callout>
       </>}
      </>}
     </div>
    </section>
    {view==='schedule'&&resources.length>0&&tray}

    {view==='schedule'&&resources.length>0&&rail}
    {s.canManage&&view==='managed'&&<aside className="sr-side" aria-label="Manager tools">
     <section className="ui-glass sr-section">
      <h2>Manage resources</h2>
      <p className="ui-hint">Place a resource hold or cancel an authorized booking. Neither action deletes its history.</p>
      <button type="button" className="ui-button" disabled={closed} onClick={()=>open(undefined,undefined,true)}>Place a hold</button>
     </section>
     {admin&&<ResourceInventory resources={admin.resources} onView={viewAvailability}/>}
     {admin&&<ResourceManagement data={admin} today={s.today} save={saveAdmin}/>}
     {operations}
    </aside>}
   </div>
   {view!=='schedule'&&status}
  </main>

  <dialog ref={dialog} className="ui-sheet sr-dialog" aria-label="Reserve a resource" onCancel={e=>{if(busy)e.preventDefault();}}><div className="ui-sheet-body">
   <div className="sr-sheet-head">
    <p className="ui-eyebrow">{step===0?(hold?'Resource hold':'New reservation'):'One more step'} · step {step===0?1:2} of 2</p>
    <button type="button" disabled={busy} className="ui-button ui-button-quiet sr-close" aria-label="Close reservation" onClick={()=>dialog.current?.close()}><X/></button>
   </div>
   <h2>{step===0?(hold?'Keep this resource free':'Reserve a space'):'Review your reservation'}</h2>
   {step===1&&<p className="ui-hint sr-dialog-lede">Check the details before you reserve.</p>}
   {error&&<p role="alert" className="ui-notice sr-error" data-tone="danger">{error}</p>}
   {step===0?<form onSubmit={e=>{e.preventDefault();setStep(1);}}>
    <div className="ui-glass sr-form-card">
     <label className="ui-field">Resource<select className="ui-input" aria-label="Resource" value={resource} required onChange={e=>{setResource(e.target.value);setExtras(extras.filter(id=>s.resources.find(r=>r.id===id)?.kind!==s.resources.find(r=>r.id===e.target.value)?.kind));setStart(null);setEnd(null);}}>{s.resources.filter(r=>r.active!==false).map(r=><option key={r.id} value={r.id}>{r.name} · {kindLabels[r.kind]}</option>)}</select></label>
     <ResourceExtras resources={s.resources} primary={resource} value={extras} onChange={ids=>{setExtras(ids);setStart(null);setEnd(null);}}/>
    </div>
    <div className="ui-glass sr-form-card">
     {!hold&&<label className="ui-field">Purpose<select className="ui-input" aria-label="Purpose" value={purpose} onChange={e=>{setPurpose(e.target.value as Purpose);setDetail('');}}>{purposes.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>}
     <label className="ui-field">{hold?'Hold reason':purposes.find(p=>p.id===purpose)?.detail}<input className="ui-input" value={detail} onChange={e=>setDetail(e.target.value)} required minLength={hold?5:1} maxLength={hold||purpose==='other'?240:120}/></label>
     <p className="ui-hint sr-field-note">Private to you and explicitly authorized reservation managers.</p>
    </div>
    <div className="ui-glass sr-form-card">
     <div className="sr-two">
      <label className="ui-field">Start<select className="ui-input" aria-label="Start" value={start??''} required onChange={e=>{setStart(Number(e.target.value));setEnd(null);}}><option value="" disabled>Select start</option>{startOptions(s,selection).map(n=><option key={n} value={n}>{clock(n)}</option>)}</select></label>
      <label className="ui-field">End<select className="ui-input" aria-label="End" value={end??''} required disabled={start===null} onChange={e=>setEnd(Number(e.target.value))}><option value="" disabled>Select end</option>{ends.map(n=><option key={n} value={n}>{clock(n)}</option>)}</select></label>
     </div>
     {!startOptions(s,selection).length&&<p role="status" className="ui-hint">No available times. Choose a different resource or date.</p>}
    </div>
    <button className="ui-button ui-button-block" disabled={end===null||start===null||!validRange(s,selection,start,end)||!detail.trim()}>Review reservation<ArrowRight size={18}/></button>
   </form>:<>
    <div className="ui-glass sr-review">
     <span className="sr-review-icon" aria-hidden="true"><KindIcon kind={s.resources.find(r=>r.id===resource)?.kind} size={40}/></span>
     <h3>{resourceNames(s.resources,selection)}</h3>
     <p>{longDay(s.day)}, Las Vegas</p>
     <dl className="ui-pairs sr-summary"><dt>Time</dt><dd>{clock(start!)} to {clock(end!)}</dd><dt>Duration</dt><dd>{duration(end!-start!)}</dd><dt>{hold?'Hold reason':'Purpose'}</dt><dd>{hold?detail:purposeLabel(purpose)}</dd></dl>
    </div>
    <Callout icon={<FileText size={22}/>} title="Ready when you are">The server rechecks availability when you confirm.</Callout>
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
