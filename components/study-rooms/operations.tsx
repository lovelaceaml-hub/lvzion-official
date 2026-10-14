'use client';
import {useEffect,useRef,useState} from 'react';
import {addDay,clock} from '../../lib/study-rooms/domain';
import type {ServiceInterval,WeeklyServiceInterval,StudyOperationsData,StudyOperationCommand,StudyOperationDraft} from '../../lib/study-rooms/operations';

const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const starts=Array.from({length:26},(_,i)=>600+i*30);
const ends=Array.from({length:26},(_,i)=>630+i*30);
function timeSelect(value:number,items:number[],onChange:(n:number)=>void,label:string){
 return <select aria-label={label} value={value} onChange={e=>onChange(Number(e.target.value))}>
  {items.map(minute=><option key={minute} value={minute}>{clock(minute)}</option>)}
 </select>;
}
export function StudyOperationsManager({data,today,save}:{data:StudyOperationsData;today:string;save:(command:StudyOperationCommand)=>Promise<void>}){
 const [weekly,setWeekly]=useState<WeeklyServiceInterval[]>(data.weekly);
 const [day,setDay]=useState(today),[special,setSpecial]=useState<ServiceInterval[]>([]);
 const [name,setName]=useState(''),[kind,setKind]=useState<'room'|'whiteboard'|'tv'>('room');
 const [inventoryReason,setInventoryReason]=useState(''),[weeklyReason,setWeeklyReason]=useState(''),[specialReason,setSpecialReason]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const receipts=useRef(new Map<string,string>());
 const active=data.specialDays.find(item=>item.day===day);
 useEffect(()=>{setWeekly(data.weekly);},[data.version,data.weekly]);
 useEffect(()=>{setSpecial(active?.blocks??[]);},[data.version,day]);
 async function send(draft:StudyOperationDraft){
  setBusy(true);setError('');setMessage('');
  const key=JSON.stringify(draft);let id=receipts.current.get(key);
  if(!id){id=crypto.randomUUID();receipts.current.set(key,id);}
  try{await save({...draft,requestId:id} as StudyOperationCommand);
   receipts.current.delete(key);setMessage('Configuration saved and audited; active bookings were not displaced.');
  }catch(e){setError(e instanceof Error?e.message:'Could not save this change.');}
  finally{setBusy(false);}
 }
 function updateWeek(i:number,value:WeeklyServiceInterval){setWeekly(items=>items.map((b,j)=>j===i?value:b));}
 function updateSpecial(i:number,value:ServiceInterval){setSpecial(items=>items.map((b,j)=>j===i?value:b));}
 return <section className="sr-card sr-ops-grid" aria-labelledby="sr-operations-title">
 <small>AUTHORIZED RESERVATION MANAGER</small>
 <h2 id="sr-operations-title">Inventory & service calendar</h2>
 <p className="sr-ops-note">All times are Las Vegas time. Saving a calendar never cancels or displaces reservations. Changes are audited and must be refreshed before another manager can edit the same version.</p>
 <div className="sr-note" role="status">New-system bookings: {data.newSystemBookings}. Booking status: <strong>{data.bookingsOpen?'Open':'Closed — original scheduler remains authoritative'}</strong>. Calendar and inventory setup cannot open the booking gate.</div>
 {error&&<p role="alert" className="sr-error">{error}</p>}
 {message&&<p role="status" className="sr-success">{message}</p>}
 <details><summary>Add a room, whiteboard or TV</summary>
  <form className="sr-config-form" onSubmit={e=>{e.preventDefault();void send({action:'resource.add',kind,name,reason:inventoryReason,expectedVersion:data.version});}}>
   <label>Resource kind<select aria-label="New resource kind" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>
    <option value="room">Room</option><option value="whiteboard">Whiteboard</option><option value="tv">TV</option>
   </select></label>
   <label>New resource name<input aria-label="New resource name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80}/></label>
   <label>Reason for inventory change<input aria-label="Inventory change reason" value={inventoryReason} onChange={e=>setInventoryReason(e.target.value)} required minLength={5} maxLength={240}/></label>
   <button disabled={busy} className="sr-primary">Add resource</button>
  </form>
 </details>
 <details><summary>Manage weekly service restrictions</summary>
  <p className="sr-ops-note">Restrictions apply to all resources and every corresponding weekday, except dates with an approved special-day replacement. At least one weekly interval is required.</p>
  {weekly.map((item,i)=><div className="sr-ops-row" key={String(i)+'-'+data.version}>
   <label>Day<select aria-label={'Weekly day '+(i+1)} value={item.weekday} onChange={e=>updateWeek(i,{...item,weekday:Number(e.target.value)})}>
    {days.map((x,dayIndex)=><option key={x} value={dayIndex}>{x}</option>)}
   </select></label>
   <label>Starts{timeSelect(item.start,starts,n=>updateWeek(i,{...item,start:n}),'Weekly starts '+(i+1))}</label>
   <label>Ends{timeSelect(item.end,ends,n=>updateWeek(i,{...item,end:n}),'Weekly ends '+(i+1))}</label>
   <label className="sr-ops-name">Restriction name<input aria-label={'Weekly label '+(i+1)} value={item.label} onChange={e=>updateWeek(i,{...item,label:e.target.value})} required maxLength={80}/></label>
   <button type="button" className="sr-secondary" disabled={busy} onClick={()=>setWeekly(rows=>rows.filter((_,j)=>j!==i))} aria-label={'Remove weekly interval '+(i+1)}>Remove</button>
  </div>)}
  <div className="sr-ops-actions"><button type="button" disabled={busy||weekly.length>=70} className="sr-secondary" onClick={()=>setWeekly(rows=>[...rows,{weekday:0,start:600,end:660,label:'Service restriction'}])}>Add weekly interval</button></div>
  <form className="sr-config-form" onSubmit={e=>{e.preventDefault();void send({action:'weekly.replace',blocks:weekly,reason:weeklyReason,expectedVersion:data.version});}}>
   <label>Reason for weekly schedule change<input aria-label="Weekly change reason" value={weeklyReason} onChange={e=>setWeeklyReason(e.target.value)} required minLength={5} maxLength={240}/></label>
   <button className="sr-primary" disabled={busy||weekly.length===0}>Review and save weekly restrictions</button>
  </form>
 </details>
 <details><summary>Special dates & service overrides</summary>
  <p className="sr-ops-note">An override completely replaces the regular service restrictions for its date; a blank override means there are no service restrictions on that date. Resource closures still apply. Future reservations are never displaced.</p>
  <label>Special day<input aria-label="Special day" type="date" value={day} min={today} max={addDay(today,365)} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></label>
  {active&&<p className="sr-note">An override exists for this date. Current reason: {active.reason}</p>}
  {special.map((item,i)=><div className="sr-ops-row" key={String(i)+'-'+day}>
   <label>Starts{timeSelect(item.start,starts,n=>updateSpecial(i,{...item,start:n}),'Special starts '+(i+1))}</label>
   <label>Ends{timeSelect(item.end,ends,n=>updateSpecial(i,{...item,end:n}),'Special ends '+(i+1))}</label>
   <label className="sr-ops-name">Restriction name<input aria-label={'Special label '+(i+1)} value={item.label} onChange={e=>updateSpecial(i,{...item,label:e.target.value})} maxLength={80}/></label>
   <button type="button" className="sr-secondary" disabled={busy} onClick={()=>setSpecial(rows=>rows.filter((_,j)=>j!==i)}>Remove</button>
  </div>)}
  <button type="button" className="sr-secondary" disabled={busy||special.length>=26} onClick={()=>setSpecial(rows=>[...rows,{start:600,end:660,label:'Special service'}])}>Add service interval</button>
  <form className="sr-config-form" onSubmit={e=>{e.preventDefault();void send({action:'day.replace',day,blocks:special,reason:specialReason,expectedVersion:data.version});}}>
   <label>Reason for special-day replacement<input aria-label="Special day reason" value={specialReason} onChange={e=>setSpecialReason(e.target.value)} required minLength={5} maxLength={240}/></label>
   <button className="sr-primary" disabled={busy||!day}>Save special-day override</button>
   {active&&<button type="button" className="sr-secondary" disabled={busy||specialReason.trim().length<5} onClick={()=>{void send({action:'day.reset',day,reason:specialReason,expectedVersion:data.version});}}>Restore normal weekly schedule for this date</button>}
  </form>
  {data.specialDays.length>0&&<details><summary>Upcoming special dates ({data.specialDays.length})</summary>{data.specialDays.map(item=><p key={item.day}><button type="button" className="sr-secondary" onClick={()=>setDay(item.day)}>{item.day} — {item.blocks.length} restriction(s)</button></p>)}</details>}
 </details>
 </section>;
}
