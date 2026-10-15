'use client';
import {useEffect,useRef,useState} from 'react';
import {addDay,bookingResources,clock,purposeLabel,resourceNames} from '../../lib/study-rooms/domain';
import type {Resource} from '../../lib/study-rooms/domain';
import {parseHistoryQuery} from '../../lib/study-rooms/history';
import type {HistoryPage,HistoryQuery} from '../../lib/study-rooms/history';
export function ReservationHistory({today,canManage,resources,read}:{today:string;canManage:boolean;resources:Resource[];read:(query:HistoryQuery)=>Promise<HistoryPage>}){
 const [from,setFrom]=useState(addDay(today,-30)),[to,setTo]=useState(today),[managed,setManaged]=useState(false);
 const [page,setPage]=useState<HistoryPage|null>(null),[offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const sequence=useRef(0),reader=useRef(read);reader.current=read;
 useEffect(()=>{
  const id=++sequence.current;let active=true;setPage(null);setError('');setBusy(true);
  try{const query=parseHistoryQuery(new URLSearchParams({from,to,offset:String(offset),managed:String(managed&&canManage)}));
   void reader.current(query).then(value=>{if(active&&id===sequence.current)setPage(value);}).catch(e=>{if(active&&id===sequence.current)setError(e instanceof Error?e.message:'Unable to load history.');}).finally(()=>{if(active&&id===sequence.current)setBusy(false);});
  }catch(e){setError((e as Error).message);setBusy(false);}
  return ()=>{active=false;sequence.current++;};
 },[from,to,offset,managed,canManage]);
 return <section className="sr-card" aria-labelledby="sr-history-title"><h2 id="sr-history-title">Reservation history</h2><p className="sr-note">Choose any 31-day period. Cancelled and ended reservations are retained. Private details are not shared with other members.</p>
 <div className="sr-two"><label>History from<input aria-label="History from" type="date" value={from} onChange={e=>{setFrom(e.target.value);setOffset(0);}}/></label><label>History through<input aria-label="History through" type="date" value={to} onChange={e=>{setTo(e.target.value);setOffset(0);}}/></label></div>
 {canManage&&<label className="sr-inline-check"><input type="checkbox" checked={managed} onChange={e=>{setManaged(e.target.checked);setOffset(0);}}/>Include reservations I am authorized to manage</label>}
 {busy&&<p role="status">Loading reservation history…</p>}{error&&<p role="alert" className="sr-error">{error}</p>}
 {page&&<><p role="status">{page.total} reservation{page.total===1?'':'s'} in this date range.</p>{page.bookings.map(b=><article key={b.id} className="sr-config-form"><strong>{b.resourceNames?b.resourceNames.join(' + '):resourceNames(resources,bookingResources(b),'Resource')}</strong><p>{b.day} · {clock(b.start)}–{clock(b.end)} · {b.state}</p>{managed&&<p>{b.label}</p>}<details><summary>Booking details</summary><dl><dt>Reservation ID</dt><dd className="sr-booking-id">{b.id}</dd><dt>Revision</dt><dd>{b.version??1}</dd>{b.originalEnd!==undefined&&b.originalEnd!==b.end&&<><dt>Originally reserved until</dt><dd>{clock(b.originalEnd)}</dd></>}{b.purpose&&<><dt>Purpose</dt><dd>{purposeLabel(b.purpose)??'Other'}</dd></>}{b.detail&&<><dt>Private detail</dt><dd>{b.detail}</dd></>}{b.cancelReason&&<><dt>Cancellation reason</dt><dd>{b.cancelReason}</dd></>}</dl></details></article>)}<div className="sr-action-row"><button className="sr-secondary" disabled={offset===0||busy} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous page</button><button className="sr-secondary" disabled={page.nextOffset===null||busy} onClick={()=>setOffset(page.nextOffset!)}>Next page</button></div></>}
 </section>;
}
