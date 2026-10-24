'use client';
import {useEffect,useState} from 'react';
import {addDay,clock,endMinutes,kindLabels,startMinutes} from '../../lib/study-rooms/domain';
import type {Kind} from '../../lib/study-rooms/domain';
import {useReceiptSave} from './use-receipt-save';
import {CalendarDays,Plus} from '../home-icons';
import {EmptyState} from '../ui-kit';
import type {ServiceInterval,WeeklyServiceInterval,StudyOperationsData,StudyOperationCommand,StudyOperationDraft} from '../../lib/study-rooms/operations';

const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function timeSelect(value:number,items:number[],onChange:(n:number)=>void,label:string){
 return <select className="ui-input" aria-label={label} value={value} onChange={e=>onChange(Number(e.target.value))}>
  {items.map(minute=><option key={minute} value={minute}>{clock(minute)}</option>)}
 </select>;
}
export function StudyOperationsManager({data,today,save}:{data:StudyOperationsData;today:string;save:(command:StudyOperationCommand)=>Promise<void>}){
 const [weekly,setWeekly]=useState<WeeklyServiceInterval[]>(data.weekly);
 const [day,setDay]=useState(today),[special,setSpecial]=useState<ServiceInterval[]>([]);
 const [name,setName]=useState(''),[kind,setKind]=useState<Kind>('room');
 const [inventoryReason,setInventoryReason]=useState(''),[weeklyReason,setWeeklyReason]=useState(''),[specialReason,setSpecialReason]=useState('');
 const {busy,error,message,send}=useReceiptSave<StudyOperationDraft>(save as (command:StudyOperationDraft&{requestId:string})=>Promise<void>,'Configuration saved and audited; active bookings were not displaced.');
 const active=data.specialDays.find(item=>item.day===day);
 useEffect(()=>{setWeekly(data.weekly);},[data.version]);
 useEffect(()=>{setSpecial(active?.blocks??[]);},[data.version,day]);
 function updateWeek(i:number,value:WeeklyServiceInterval){setWeekly(items=>items.map((b,j)=>j===i?value:b));}
 function updateSpecial(i:number,value:ServiceInterval){setSpecial(items=>items.map((b,j)=>j===i?value:b));}
 return <section className="sr-section sr-operations" aria-labelledby="sr-operations-title">
 <header className="ui-heading sr-sub-heading"><p className="ui-eyebrow">Authorized management</p><h2 id="sr-operations-title">Inventory & service calendar</h2><p>All times are Las Vegas time. Saving a calendar never cancels or displaces reservations. Changes are audited and must be refreshed before another manager can edit the same version.</p></header>
 <div className="ui-glass sr-ops-head">
 <p className="sr-status-row" role="status" data-open={data.bookingsOpen}><span className="sr-status-dot" aria-hidden="true"/>Reservations: {data.newSystemBookings}. Booking status: <strong>{data.bookingsOpen?'Open':'Paused'}</strong>.</p>
 {error&&<p role="alert" className="ui-notice sr-error" data-tone="danger">{error}</p>}
 {message&&<p role="status" className="ui-notice sr-success" data-tone="success">{message}</p>}
 </div>
 <details className="ui-glass sr-disclosure sr-disclosure-card"><summary>Add a room, whiteboard or TV</summary>
  <form className="sr-config-form" onSubmit={e=>{e.preventDefault();void send({action:'resource.add',kind,name,reason:inventoryReason,expectedVersion:data.version});}}>
   <label className="ui-field">Resource kind<select className="ui-input" aria-label="New resource kind" value={kind} onChange={e=>setKind(e.target.value as Kind)}>
    {(Object.keys(kindLabels) as Kind[]).map(k=><option key={k} value={k}>{kindLabels[k]}</option>)}
   </select></label>
   <label className="ui-field">New resource name<input className="ui-input" aria-label="New resource name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80}/></label>
   <label className="ui-field">Reason for inventory change<input className="ui-input" aria-label="Inventory change reason" value={inventoryReason} onChange={e=>setInventoryReason(e.target.value)} required minLength={5} maxLength={240}/></label>
   <button disabled={busy} className="ui-button ui-button-secondary">Add resource</button>
  </form>
 </details>
 <details className="ui-glass sr-disclosure sr-disclosure-card"><summary>Manage weekly service restrictions</summary>
  <p className="ui-hint">Restrictions apply to all resources and every corresponding weekday, except dates with an approved special-day replacement. Add only the times you want to restrict. An empty weekly calendar is valid.</p>
  {weekly.length===0&&<EmptyState icon={<CalendarDays/>} title="No weekly restrictions configured.">Restrictions are added deliberately by an authorized manager.</EmptyState>}
  {weekly.map((item,i)=><div className="sr-ops-row" key={String(i)+'-'+data.version}>
   <label className="ui-field">Day<select className="ui-input" aria-label={'Weekly day '+(i+1)} value={item.weekday} onChange={e=>updateWeek(i,{...item,weekday:Number(e.target.value)})}>
    {days.map((x,dayIndex)=><option key={x} value={dayIndex}>{x}</option>)}
   </select></label>
   <label className="ui-field">Starts{timeSelect(item.start,startMinutes,n=>updateWeek(i,{...item,start:n}),'Weekly starts '+(i+1))}</label>
   <label className="ui-field">Ends{timeSelect(item.end,endMinutes,n=>updateWeek(i,{...item,end:n}),'Weekly ends '+(i+1))}</label>
   <label className="ui-field sr-ops-name">Restriction name<input className="ui-input" aria-label={'Weekly label '+(i+1)} value={item.label} onChange={e=>updateWeek(i,{...item,label:e.target.value})} required maxLength={80}/></label>
   <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>setWeekly(rows=>rows.filter((_,j)=>j!==i))} aria-label={'Remove weekly interval '+(i+1)}>Remove</button>
  </div>)}
  <div className="sr-ops-actions"><button type="button" disabled={busy||weekly.length>=70} className="ui-button ui-button-secondary" onClick={()=>setWeekly(rows=>[...rows,{weekday:0,start:600,end:660,label:'Service restriction'}])}><Plus size={18}/>Add weekly interval</button></div>
  <form className="sr-config-form" onSubmit={e=>{e.preventDefault();void send({action:'weekly.replace',blocks:weekly,reason:weeklyReason,expectedVersion:data.version});}}>
   <label className="ui-field">Reason for weekly schedule change<input className="ui-input" aria-label="Weekly change reason" value={weeklyReason} onChange={e=>setWeeklyReason(e.target.value)} required minLength={5} maxLength={240}/></label>
   <button className="ui-button ui-button-secondary" disabled={busy}>Review and save weekly restrictions</button>
  </form>
 </details>
 <details className="ui-glass sr-disclosure sr-disclosure-card"><summary>Special dates & service overrides</summary>
  <p className="ui-hint">An override completely replaces the regular service restrictions for its date; a blank override means there are no service restrictions on that date. Resource closures still apply. Future reservations are never displaced.</p>
  <label className="ui-field">Special day<input className="ui-input" aria-label="Special day" type="date" value={day} min={today} max={addDay(today,365)} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></label>
  {active&&<p className="sr-note">An override exists for this date. Current reason: {active.reason}</p>}
  {special.map((item,i)=><div className="sr-ops-row" key={String(i)+'-'+day}>
   <label className="ui-field">Starts{timeSelect(item.start,startMinutes,n=>updateSpecial(i,{...item,start:n}),'Special starts '+(i+1))}</label>
   <label className="ui-field">Ends{timeSelect(item.end,endMinutes,n=>updateSpecial(i,{...item,end:n}),'Special ends '+(i+1))}</label>
   <label className="ui-field sr-ops-name">Restriction name<input className="ui-input" aria-label={'Special label '+(i+1)} value={item.label} onChange={e=>updateSpecial(i,{...item,label:e.target.value})} maxLength={80}/></label>
   <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>setSpecial(rows=>rows.filter((_,j)=>j!==i))}>Remove</button>
  </div>)}
  <button type="button" className="ui-button ui-button-secondary" disabled={busy||special.length>=26} onClick={()=>setSpecial(rows=>[...rows,{start:600,end:660,label:'Special service'}])}><Plus size={18}/>Add service interval</button>
  <form className="sr-config-form" onSubmit={e=>{e.preventDefault();void send({action:'day.replace',day,blocks:special,reason:specialReason,expectedVersion:data.version});}}>
   <label className="ui-field">Reason for special-day replacement<input className="ui-input" aria-label="Special day reason" value={specialReason} onChange={e=>setSpecialReason(e.target.value)} required minLength={5} maxLength={240}/></label>
   <button className="ui-button ui-button-secondary" disabled={busy||!day}>Save special-day override</button>
   {active&&<button type="button" className="ui-button ui-button-secondary" disabled={busy||specialReason.trim().length<5} onClick={()=>{void send({action:'day.reset',day,reason:specialReason,expectedVersion:data.version});}}>Restore normal weekly schedule for this date</button>}
  </form>
  {data.specialDays.length>0&&<details className="sr-disclosure"><summary>Upcoming special dates ({data.specialDays.length})</summary>{data.specialDays.map(item=><p key={item.day}><button type="button" className="ui-button ui-button-secondary" onClick={()=>setDay(item.day)}>{item.day}, {item.blocks.length} restriction{item.blocks.length===1?'':'s'}</button></p>)}</details>}
 </details>
 </section>;
}
