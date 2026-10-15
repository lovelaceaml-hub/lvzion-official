'use client';
import styles from './morning-prayer.module.css';
import MorningPrayerVolunteer from './MorningPrayerVolunteer';
import {clockTime,dayLabel,monthLabel,shiftMonth} from './shared';
import type {Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';
const kindTitle=(o:Occurrence)=>o.kind==='gathering'?o.host:o.kind==='app_day'?'Pray Daily app day':'Cancelled';
export default function ScheduleTab({rows,today,published,busy,cap,post,joinable,joinGathering,month,focus,onFocus,onMonth}:Screen&{
 month:string;focus:string|null;onFocus:(id:string)=>void;onMonth:(month:string)=>void;
}){
 const active=focus?rows.find(o=>o.id===focus):rows.find(o=>o.date>=today&&o.kind==='gathering')||rows[0];
 const canVolunteer=(o:Occurrence)=>cap('volunteer_host')&&o.kind==='gathering'&&o.verified&&o.host==='Host needed'&&o.date>=today;
 return <>
  <div className={styles.monthNav}>
   <button aria-label="Previous month" onClick={()=>onMonth(shiftMonth(month,-1))}>‹</button>
   <h2>{monthLabel(month)}</h2>
   <button aria-label="Next month" onClick={()=>onMonth(shiftMonth(month,1))}>›</button>
  </div>
  <MorningPrayerVolunteer month={month} rows={rows} today={today} selected={focus} onSelect={onFocus} canVolunteer={cap('volunteer_host')} busy={busy}
   onSubmit={ids=>post({type:'volunteer',occurrenceIds:ids})}/>
  {rows.length===0?<section className={styles.empty}>
   <h2>No gatherings entered for this month</h2><p>Scheduled gatherings will appear on this calendar.</p>
  </section>:<details className={styles.dateList}><summary>All dates this month</summary>{rows.map(o=>
   <button key={o.id} className={styles.scheduleRow} onClick={()=>onFocus(o.id)} aria-pressed={focus===o.id}>
    <span className={styles.dateBlock}><small>{dayLabel(o.date).split(',')[0]}</small><strong>{+o.date.slice(-2)}</strong></span>
    <span>
     <b>{kindTitle(o)}</b>
     <small>{o.kind==='gathering'?clockTime(o.startsAt)+' · '+(o.verified?'Schedule verified':'Pending verification'):'No live Zoom gathering'}</small>
    </span><b>›</b>
   </button>)}
  </details>}
  {active&&active.date.slice(0,7)===month&&<section className={styles.card} data-testid="actual-gathering">
   <h2>{dayLabel(active.date)}</h2>
   <p><strong>{kindTitle(active)}</strong></p>
   <p>{clockTime(active.startsAt)} to {clockTime(active.endsAt)} · America/Los_Angeles</p>
   {!active.verified&&<p className={styles.warning}>This date is waiting for confirmation.</p>}
   {active.kind==='gathering'&&(joinable(active.id)
    ?<button className={styles.primary} disabled={busy} onClick={()=>void joinGathering(active.id)}>Join verified gathering ↗</button>
    :<p className={styles.muted}>The meeting link will appear here when joining opens.</p>)}
   {canVolunteer(active)&&<button className={styles.primary} disabled={busy} onClick={()=>void post({type:'volunteer',occurrenceIds:[active.id]})}>Request to host this date →</button>}
   {cap('view_materials')&&published.filter(m=>m.kind==='reading'&&m.key===active.readingKey).map(m=><div key={m.key} className={styles.reading}>
    <h3>{m.body.title}</h3><p>{m.body.summary}</p>
    <ul>{m.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul>
    <p className={styles.muted}>Source: {m.body.sourceLabel}</p>
   </div>)}
  </section>}
 </>;
}
