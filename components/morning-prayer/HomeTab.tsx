'use client';
import styles from './morning-prayer.module.css';
import {clockParts,dayLabel,monthLabel} from './shared';
import type {Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';
export default function HomeTab({data,rows,today,published,cap,joinable,joinGathering,busy,month,myWeek,onWeek,onOpen,onFullSchedule,onAddGathering}:Screen&{
 month:string;myWeek:number;onWeek:(week:number)=>void;onOpen:(o:Occurrence)=>void;onFullSchedule:()=>void;onAddGathering:()=>void;
}){
 const isNextGathering=(o:Occurrence)=>o.date>=today&&o.kind==='gathering';
 const future=rows.filter(isNextGathering),upcoming=(data.upcoming||[]).filter(isNextGathering);
 const next=upcoming[0]||future[0];
 const later=(upcoming.length?upcoming:future).filter(o=>o.id!==next?.id).slice(0,5);
 const pwp=published.find(m=>m.key==='pwp-'+month+'-week-'+myWeek);
 const [time,meridiem]=next?clockParts(next.startsAt):['',''];
 return <div className={styles.split}>
  <div>
   <h2 className={styles.heading}>Your next gathering</h2>
   {next?<section aria-label="Next gathering">
    <div className={styles.next}>
     <p className={styles.bigTime}>{time}<small>{meridiem} Las Vegas</small></p>
     <div className={styles.nextBody}>
      <span className={styles.quiet}>{dayLabel(next.date)}</span>
      <strong>{next.host}</strong>
      <span className={styles.status} data-tone={next.verified?undefined:'warning'}>{next.verified?'Date confirmed':'Date to be confirmed'}</span>
      {!next.hostConfirmed&&next.host!=='Host needed'&&<span className={styles.status}>Host confirmation pending</span>}
     </div>
    </div>
    <div className={styles.actions}>
     {joinable(next.id)&&<button type="button" className="ui-button" disabled={busy} onClick={()=>void joinGathering(next.id)}>Join the gathering</button>}
     <button type="button" className="ui-button ui-button-secondary" onClick={()=>onOpen(next)}>Gathering details</button>
    </div>
   </section>:<div className="ui-empty">
    <strong>No gatherings scheduled yet</strong>
    <p>{cap('manage_schedule')?'Add your first gathering in Manage.':'Your next gathering will appear here.'}</p>
    {cap('manage_schedule')&&<button type="button" className="ui-button" onClick={onAddGathering}>Add a gathering</button>}
   </div>}

   {later.length>0&&<>
    <div className={styles.headingRow}>
     <h2 className={styles.heading}>Upcoming dates</h2>
     <button type="button" className="ui-button ui-button-quiet" onClick={onFullSchedule}>Full schedule</button>
    </div>
    <ul className="ui-list">{later.map(o=>{const [t,m]=clockParts(o.startsAt);return <li key={o.id}>
     <button type="button" className="ui-row" onClick={()=>onOpen(o)}>
      <span className={styles.time}>{t}<small>{m}</small></span>
      <span className={styles.dot} data-state={o.verified?undefined:'quiet'} aria-hidden="true"/>
      <span className="ui-row-body"><strong>{o.host}</strong><small>{dayLabel(o.date)}{o.verified?'':' · to be confirmed'}</small></span>
     </button>
    </li>;})}</ul>
   </>}
  </div>

  {cap('view_materials')&&<aside className={styles.side} aria-labelledby="wm-pwp-title">
   <h2 className={styles.heading} id="wm-pwp-title">PWP for {monthLabel(month)}</h2>
   <div className={styles.choices} role="group" aria-label="PWP week">{[1,2,3,4,5].map(n=>
    <button key={n} type="button" aria-pressed={myWeek===n} aria-label={'Week '+n} onClick={()=>onWeek(n)}>Wk {n}</button>)}
   </div>
   {pwp?<div className={styles.material}>
    <h3>{pwp.body.title}</h3><p>{pwp.body.summary}</p>
    <ul>{pwp.body.items.map((x,i)=><li key={i}>{x}</li>)}</ul>
    <p className={styles.quiet}>Source: {pwp.body.sourceLabel}</p>
   </div>:<p className={styles.quiet}>Week {myWeek} activities will appear here when they are ready.</p>}
   <p><a className="ui-link" href="https://wm.watv.org/login.wmc" target="_blank" rel="noopener noreferrer">Open the PWP card on wm.watv.org</a></p>
  </aside>}
 </div>;
}
