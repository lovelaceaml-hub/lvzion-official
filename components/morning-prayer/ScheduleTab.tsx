'use client';
import styles from './morning-prayer.module.css';
import MorningPrayerVolunteer from './MorningPrayerVolunteer';
import {clockParts,clockTime,dayLabel,monthLabel,shiftMonth} from './shared';
import type {Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';
const kindTitle=(o:Occurrence)=>o.kind==='gathering'?o.host:o.kind==='app_day'?'Pray Daily app day':'Cancelled';
export default function ScheduleTab({rows,today,published,busy,cap,post,joinable,joinGathering,month,focus,onFocus,onMonth}:Screen&{
 month:string;focus:string|null;onFocus:(id:string)=>void;onMonth:(month:string)=>void;
}){
 const active=focus?rows.find(o=>o.id===focus):rows.find(o=>o.date>=today&&o.kind==='gathering')||rows[0];
 const canVolunteer=(o:Occurrence)=>cap('volunteer_host')&&o.kind==='gathering'&&o.verified&&o.host==='Host needed'&&o.date>=today;
 return <div className={styles.split}>
  <div>
   <div className={styles.monthNav}>
    <button type="button" className="ui-button ui-button-quiet" aria-label="Previous month" onClick={()=>onMonth(shiftMonth(month,-1))}>‹</button>
    <h2>{monthLabel(month)}</h2>
    <button type="button" className="ui-button ui-button-quiet" aria-label="Next month" onClick={()=>onMonth(shiftMonth(month,1))}>›</button>
   </div>
   <MorningPrayerVolunteer month={month} rows={rows} today={today} selected={focus} onSelect={onFocus} canVolunteer={cap('volunteer_host')} busy={busy}
    onSubmit={ids=>post({type:'volunteer',occurrenceIds:ids})}/>
   {rows.length===0?<p className="ui-empty"><strong>No gatherings this month</strong>Scheduled gatherings will appear on this calendar.</p>
   :<details className={styles.disclosure}><summary>All dates this month<small>{rows.length}</small></summary>
    <ul className="ui-list">{rows.map(o=>{const [t,m]=clockParts(o.startsAt);return <li key={o.id}>
     <button type="button" className="ui-row" onClick={()=>onFocus(o.id)} aria-pressed={focus===o.id}>
      <span className={styles.time}>{o.kind==='gathering'?<>{t}<small>{m}</small></>:<small>No Zoom</small>}</span>
      <span className="ui-row-body"><strong>{kindTitle(o)}</strong>
       <small>{dayLabel(o.date)}{o.kind==='gathering'?' · '+(o.verified?'Date confirmed':'To be confirmed'):''}</small></span>
     </button>
    </li>;})}</ul>
   </details>}
  </div>
  {active&&active.date.slice(0,7)===month&&<section className={styles.side} data-testid="actual-gathering" aria-labelledby="wm-day-title">
   <h2 className={styles.heading} id="wm-day-title">{dayLabel(active.date)}</h2>
   <p><strong>{kindTitle(active)}</strong></p>
   <p className={styles.quiet}>{clockTime(active.startsAt)} to {clockTime(active.endsAt)}, Las Vegas time</p>
   {!active.verified&&<p className="ui-notice" data-tone="warning">This date is waiting for confirmation.</p>}
   <div className={styles.actions}>
    {active.kind==='gathering'&&joinable(active.id)&&<button type="button" className="ui-button" disabled={busy} onClick={()=>void joinGathering(active.id)}>Join the gathering</button>}
    {canVolunteer(active)&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void post({type:'volunteer',occurrenceIds:[active.id]})}>Request to host this date</button>}
   </div>
   {active.kind==='gathering'&&!joinable(active.id)&&<p className={styles.quiet}>The meeting link appears here when joining opens.</p>}
   {cap('view_materials')&&published.filter(m=>m.kind==='reading'&&m.key===active.readingKey).map(m=><div key={m.key} className={styles.material}>
    <h3 className={styles.heading}>Reading: {m.body.title}</h3><p>{m.body.summary}</p>
    <ul>{m.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul>
    <p className={styles.quiet}>Source: {m.body.sourceLabel}</p>
   </div>)}
  </section>}
 </div>;
}
