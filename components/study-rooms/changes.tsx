'use client';
import {useRef,useState} from 'react';
import {addDay,clock,startOptions,endOptions,purposes,bookingResources,validRange,startMinutes,endMinutes,nextSlot,resourceNames} from '../../lib/study-rooms/domain';
import type {Booking,Schedule,BookingCommand,Purpose} from '../../lib/study-rooms/domain';
import type {AdminCommand,AdminData} from '../../lib/study-rooms/admin';
import {ResourceExtras} from './resource-extras';
import {useReceiptSave} from './use-receipt-save';

const range=(start:number,end:number)=>clock(start)+' to '+clock(end);

export function BookingChanges({booking:b,schedule:s,submit,loadDay,changeDay}:{booking:Booking;schedule:Schedule;submit:(c:BookingCommand)=>Promise<void>;loadDay:(day:string)=>Promise<Schedule>;changeDay:(day:string)=>void}){
 const [extras,setExtras]=useState<string[]>(bookingResources(b).filter(id=>id!==b.resourceId));
 const [mode,setMode]=useState<'reschedule'|'end_early'>('reschedule'),[data,setData]=useState(s),[day,setDay]=useState(b.day),[resource,setResource]=useState(b.resourceId);
 const [start,setStart]=useState(b.start),[end,setEnd]=useState(b.end),[purpose,setPurpose]=useState<Purpose>(b.purpose??'other'),[detail,setDetail]=useState(b.detail??''),[reason,setReason]=useState('');
 const [review,setReview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const selection=[resource,...extras];
 const dialog=useRef<HTMLDialogElement>(null),id=useRef(''),expected=useRef(1),fetchId=useRef(0);
 const future=b.day>s.today||(b.day===s.today&&b.start>s.nowMinute),running=b.day===s.today&&b.start<s.nowMinute&&nextSlot(s.nowMinute)<b.end;
 if(b.state!=='confirmed'||b.hold||(!b.mine&&!s.canManage))return null;

 function open(next:'reschedule'|'end_early'){expected.current=b.version??1;setMode(next);setData(s);setDay(b.day);setResource(b.resourceId);setExtras(bookingResources(b).filter(id=>id!==b.resourceId));setStart(b.start);setEnd(b.end);setPurpose(b.purpose??'other');setDetail(b.detail??'');setReview(false);setReason('');setError('');id.current=crypto.randomUUID();dialog.current?.showModal();}
 function close(){fetchId.current++;dialog.current?.close();}
 async function selectDate(next:string){
  if(!next)return;
  const seq=++fetchId.current;setDay(next);setBusy(true);setStart(-1);setEnd(-1);setError('');
  try{const x=await loadDay(next);if(seq===fetchId.current)setData(x);}
  catch(e){if(seq===fetchId.current)setError((e as Error).message);}
  finally{if(seq===fetchId.current)setBusy(false);}
 }
 async function save(){
  setBusy(true);setError('');
  try{
   await submit({requestId:id.current,action:mode,bookingId:b.id,expectedVersion:expected.current,reason,...(mode==='reschedule'?{day,resourceIds:selection,start,end,purpose,detail}:{})});
   dialog.current?.close();setMessage(mode==='reschedule'?'Reservation updated.':'Remaining time released; history retained.');
   if(mode==='reschedule')changeDay(day);
  }catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }

 return <>
  {future&&s.bookingsOpen!==false&&<button type="button" className="ui-button ui-button-secondary" onClick={()=>open('reschedule')}>Edit / reschedule</button>}
  {running&&<button type="button" className="ui-button ui-button-secondary" onClick={()=>open('end_early')}>End early</button>}
  {message&&<p role="status" className="sr-inline-status">{message}</p>}
  <dialog ref={dialog} className="ui-sheet sr-dialog" aria-label="Change reservation" onCancel={e=>{if(busy)e.preventDefault();}}><div className="ui-sheet-body">
   <h2>{mode==='reschedule'?'Change your reservation':'Release remaining time'}</h2>
   <p className="ui-hint">{mode==='reschedule'?'Your original reservation stays intact unless the change succeeds.':'All selected resources release their remaining full 30-minute slots together. Elapsed time stays in the history.'}</p>
   {error&&<p role="alert" className="ui-notice sr-error" data-tone="danger">{error}</p>}
   {!review?<form onSubmit={e=>{e.preventDefault();setReview(true);}}>
    {mode==='reschedule'&&<>
     <label className="ui-field">New date<input className="ui-input" aria-label="New date" type="date" value={day} min={s.today} max={addDay(s.today,3)} required onChange={e=>{void selectDate(e.target.value);}}/></label>
     <label className="ui-field">New resource<select className="ui-input" aria-label="New resource" value={resource} onChange={e=>{setResource(e.target.value);setExtras(extras.filter(id=>data.resources.find(r=>r.id===id)?.kind!==data.resources.find(r=>r.id===e.target.value)?.kind));setStart(-1);setEnd(-1);}}>{data.resources.filter(r=>r.active!==false).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
     <ResourceExtras resources={data.resources} primary={resource} value={extras} onChange={ids=>{setExtras(ids);setStart(-1);setEnd(-1);}}/>
     <div className="sr-two">
      <label className="ui-field">New start<select className="ui-input" aria-label="New start" required value={start<0?'':start} onChange={e=>{setStart(Number(e.target.value));setEnd(-1);}}><option value="" disabled>Choose start</option>{startOptions(data,selection,b.id).map(n=><option key={n} value={n}>{clock(n)}</option>)}</select></label>
      <label className="ui-field">New end<select className="ui-input" aria-label="New end" required value={end<0?'':end} onChange={e=>setEnd(Number(e.target.value))}><option value="" disabled>Choose end</option>{endOptions(data,selection,start,b.id).map(n=><option key={n} value={n}>{clock(n)}</option>)}</select></label>
     </div>
     <label className="ui-field">Purpose<select className="ui-input" aria-label="Change purpose" value={purpose} onChange={e=>{setPurpose(e.target.value as Purpose);setDetail('');}}>{purposes.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
     <label className="ui-field">Private detail<input className="ui-input" aria-label="Private detail" value={detail} required maxLength={purpose==='other'?240:120} onChange={e=>setDetail(e.target.value)}/></label>
    </>}
    <label className="ui-field">Reason for change<input className="ui-input" aria-label="Reason for change" value={reason} required minLength={5} maxLength={240} onChange={e=>setReason(e.target.value)}/></label>
    <div className="sr-sheet-actions">
     <button className="ui-button ui-button-block" disabled={busy||!!error||(mode==='reschedule'&&(day!==data.day||!validRange(data,selection,start,end,b.id)))}>Review change</button>
     <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={busy} onClick={close}>Keep original reservation</button>
    </div>
   </form>:<>
    <dl className="sr-summary">
     <dt>Original</dt><dd>{b.day} · {range(b.start,b.end)}</dd>
     <dt>{mode==='reschedule'?'New time':'Release from'}</dt><dd>{mode==='reschedule'?day+' · '+range(start,end):clock(nextSlot(s.nowMinute))}</dd>
     {mode==='reschedule'&&<><dt>Resource</dt><dd>{resourceNames(data.resources,selection)}</dd></>}
    </dl>
    <div className="sr-sheet-actions">
     <button type="button" className="ui-button ui-button-block" disabled={busy} onClick={()=>{void save();}}>{busy?'Saving…':mode==='reschedule'?'Confirm change':'Confirm early release'}</button>
     <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={busy} onClick={()=>{setReview(false);id.current=crypto.randomUUID();}}>Back to edit</button>
     <button type="button" className="ui-button ui-button-quiet ui-button-block" disabled={busy} onClick={close}>Keep original reservation</button>
    </div>
   </>}
  </div></dialog>
 </>;
}

export function ResourceManagement({data,today,save}:{data:AdminData;today:string;save:(c:AdminCommand)=>Promise<void>}){
 const {busy,error,message,send}=useReceiptSave<Omit<AdminCommand,'requestId'>>(save,'Management change saved. Existing bookings were not displaced.');
 const closures=data.closures.filter(c=>c.active);
 return <section className="sr-section">
  <h2>Resources & date closures</h2>
  <p className="ui-hint">Closing a resource or time cannot evict an existing reservation. Cancel or reschedule affected bookings explicitly first.</p>
  {error&&<p role="alert" className="ui-notice sr-error" data-tone="danger">{error}</p>}
  {message&&<p role="status" className="ui-notice sr-success" data-tone="success">{message}</p>}
  <details className="sr-disclosure"><summary>Rename or enable resources</summary>
   {data.resources.map(r=><form key={r.id+'-'+r.version} className="sr-config-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({action:'resource.update',resourceId:r.id,name:String(f.get('name')),active:f.get('active')==='on',expectedVersion:r.version,reason:String(f.get('reason'))});}}>
    <label className="ui-field">Resource name<input className="ui-input" name="name" aria-label={'Name '+r.name} defaultValue={r.name} required minLength={2} maxLength={80}/></label>
    <label className="sr-inline-check"><input type="checkbox" name="active" defaultChecked={r.active}/>Available for reservations</label>
    <label className="ui-field">Reason<input className="ui-input" name="reason" aria-label={'Reason '+r.name} required minLength={5} maxLength={240}/></label>
    <button className="ui-button ui-button-secondary" disabled={busy}>Save {r.name}</button>
   </form>)}
  </details>
  <details className="sr-disclosure"><summary>Add a date-specific closure</summary>
   <form className="sr-config-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({action:'closure.add',resourceId:String(f.get('resourceId')),day:String(f.get('day')),start:Number(f.get('start')),end:Number(f.get('end')),reason:String(f.get('reason'))});}}>
    <label className="ui-field">Closure resource<select className="ui-input" name="resourceId" aria-label="Closure resource"><option value="">All resources</option>{data.resources.filter(r=>r.active).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label className="ui-field">Closure date<input className="ui-input" type="date" aria-label="Closure date" name="day" defaultValue={today} min={today} max={addDay(today,365)} required/></label>
    <div className="sr-two">
     <label className="ui-field">Closure starts<select className="ui-input" name="start" aria-label="Closure starts" defaultValue="600">{startMinutes.map(n=><option key={n} value={n}>{clock(n)}</option>)}</select></label>
     <label className="ui-field">Closure ends<select className="ui-input" name="end" aria-label="Closure ends" defaultValue="660">{endMinutes.map(n=><option key={n} value={n}>{clock(n)}</option>)}</select></label>
    </div>
    <label className="ui-field">Private closure reason<input className="ui-input" name="reason" aria-label="Private closure reason" minLength={5} maxLength={240} required/></label>
    <button className="ui-button ui-button-secondary" disabled={busy}>Confirm closure</button>
   </form>
  </details>
  {closures.length>0&&<ul className="ui-list sr-closures">{closures.map(c=><li key={c.id}><form className="sr-item" onSubmit={e=>{e.preventDefault();void send({action:'closure.remove',id:c.id,expectedVersion:c.version,reason:String(new FormData(e.currentTarget).get('reason'))});}}>
   <div className="sr-item-body">
    <strong>{c.day} · {range(c.start,c.end)}</strong>
    <p>{c.resourceId?data.resources.find(r=>r.id===c.resourceId)?.name:'All resources'} · {c.reason}</p>
    <label className="ui-field">Reason for reopening<input className="ui-input" name="reason" required minLength={5} maxLength={240}/></label>
    <button disabled={busy} className="ui-button ui-button-secondary">Reopen this interval</button>
   </div>
  </form></li>)}</ul>}
 </section>;
}
