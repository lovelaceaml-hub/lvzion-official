'use client';
import {useEffect,useRef,useState} from 'react';
import {addDay,bookingResources,clock,purposeLabel,resourceNames} from '../../lib/study-rooms/domain';
import type {Resource} from '../../lib/study-rooms/domain';
import {parseHistoryQuery} from '../../lib/study-rooms/history';
import type {HistoryPage,HistoryQuery} from '../../lib/study-rooms/history';

const stateLabel={confirmed:'Confirmed',cancelled:'Cancelled',ended:'Ended early'} as const;

export function ReservationHistory({today,canManage,resources,read}:{today:string;canManage:boolean;resources:Resource[];read:(query:HistoryQuery)=>Promise<HistoryPage>}){
 const [from,setFrom]=useState(addDay(today,-30)),[to,setTo]=useState(today),[managed,setManaged]=useState(false);
 const [page,setPage]=useState<HistoryPage|null>(null),[offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const sequence=useRef(0),reader=useRef(read);reader.current=read;
 useEffect(()=>{
  const id=++sequence.current;let active=true;setPage(null);setError('');setBusy(true);
  try{
   const query=parseHistoryQuery(new URLSearchParams({from,to,offset:String(offset),managed:String(managed&&canManage)}));
   void reader.current(query)
    .then(value=>{if(active&&id===sequence.current)setPage(value);})
    .catch(e=>{if(active&&id===sequence.current)setError(e instanceof Error?e.message:'Unable to load history.');})
    .finally(()=>{if(active&&id===sequence.current)setBusy(false);});
  }catch(e){setError((e as Error).message);setBusy(false);}
  return ()=>{active=false;sequence.current++;};
 },[from,to,offset,managed,canManage]);

 return <section aria-labelledby="sr-history-title">
  <div className="sr-panel-head"><div><h2 id="sr-history-title">Reservation history</h2><p className="ui-hint">Choose any 31-day period. Cancelled and ended reservations are kept. Private details are not shared with other members.</p></div></div>
  <div className="sr-two">
   <label className="ui-field">History from<input className="ui-input" aria-label="History from" type="date" value={from} onChange={e=>{setFrom(e.target.value);setOffset(0);}}/></label>
   <label className="ui-field">History through<input className="ui-input" aria-label="History through" type="date" value={to} onChange={e=>{setTo(e.target.value);setOffset(0);}}/></label>
  </div>
  {canManage&&<label className="sr-inline-check"><input type="checkbox" checked={managed} onChange={e=>{setManaged(e.target.checked);setOffset(0);}}/>Include reservations I am authorized to manage</label>}
  {busy&&<p role="status" className="ui-hint">Loading reservation history…</p>}
  {error&&<p role="alert" className="ui-notice sr-error" data-tone="danger">{error}</p>}
  {page&&<>
   <p role="status" className="ui-hint">{page.total} reservation{page.total===1?'':'s'} in this date range.</p>
   {page.bookings.length>0&&<ul className="ui-list">{page.bookings.map(b=><li key={b.id}><article className="sr-item">
    <div className="sr-time"><span>{clock(b.start)}</span><span className="ui-visually-hidden"> to </span><small>{clock(b.end)}</small></div>
    <div className="sr-item-body">
     <strong>{b.resourceNames?b.resourceNames.join(' + '):resourceNames(resources,bookingResources(b),'Resource')}</strong>
     <p>{b.day} · <span className="sr-state" data-state={b.state}>{stateLabel[b.state]??b.state}</span></p>
     {managed&&<p>{b.label}</p>}
     <details className="sr-disclosure sr-disclosure-small"><summary>Booking details</summary><dl className="sr-summary">
      <dt>Reservation ID</dt><dd className="sr-booking-id">{b.id}</dd>
      <dt>Revision</dt><dd>{b.version??1}</dd>
      {b.originalEnd!==undefined&&b.originalEnd!==b.end&&<><dt>Originally reserved until</dt><dd>{clock(b.originalEnd)}</dd></>}
      {b.purpose&&<><dt>Purpose</dt><dd>{purposeLabel(b.purpose)??'Other'}</dd></>}
      {b.detail&&<><dt>Private detail</dt><dd>{b.detail}</dd></>}
      {b.cancelReason&&<><dt>Cancellation reason</dt><dd>{b.cancelReason}</dd></>}
     </dl></details>
    </div>
   </article></li>)}</ul>}
   <div className="sr-action-row sr-pager">
    <button type="button" className="ui-button ui-button-secondary" disabled={offset===0||busy} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous page</button>
    <button type="button" className="ui-button ui-button-secondary" disabled={page.nextOffset===null||busy} onClick={()=>setOffset(page.nextOffset!)}>Next page</button>
   </div>
  </>}
 </section>;
}
