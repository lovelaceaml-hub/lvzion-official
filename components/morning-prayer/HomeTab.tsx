'use client';
import styles from './morning-prayer.module.css';
import {clockTime,dayLabel,monthLabel} from './shared';
import type {Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';
export default function HomeTab({data,rows,today,published,cap,joinable,joinGathering,month,myWeek,onWeek,onOpen,onFullSchedule,onAddGathering}:Screen&{
 month:string;myWeek:number;onWeek:(week:number)=>void;onOpen:(o:Occurrence)=>void;onFullSchedule:()=>void;onAddGathering:()=>void;
}){
 const isNextGathering=(o:Occurrence)=>o.date>=today&&o.kind==='gathering';
 const future=rows.filter(isNextGathering),upcoming=(data.upcoming||[]).filter(isNextGathering);
 const next=upcoming[0]||future[0];
 const pwp=published.find(m=>m.key==='pwp-'+month+'-week-'+myWeek);
 return <>
  <div className={styles.sectionHeading}><h2>Your next gathering</h2><span>{dayLabel(today)}</span></div>
  {next?<section className={styles.hero}>
   <div className={styles.heroTop}><span>{dayLabel(next.date).toUpperCase()}</span><span>{next.verified?'Upcoming':'To confirm'}</span></div>
   <div className={styles.heroTime}>{clockTime(next.startsAt)}<small>Las Vegas time</small></div>
   <h2>{next.host}</h2>
   {!next.hostConfirmed&&next.host!=='Host needed'&&<p>Host confirmation pending</p>}
   {joinable(next.id)&&<button onClick={()=>void joinGathering(next.id)}>Join verified gathering ↗</button>}
   <button className={styles.heroDetails} onClick={()=>onOpen(next)}>Gathering details →</button>
  </section>:<section className={styles.empty}>
   <h2>No upcoming gatherings scheduled</h2>
   <p>{cap('manage_schedule')?'Add your first gathering in Manage.':'Your next gathering will appear here.'}</p>
   {cap('manage_schedule')&&<button className={styles.primary} onClick={onAddGathering}>Add a gathering</button>}
  </section>}
  {cap('view_materials')&&<section className={styles.card}>
   <div className={styles.cardTop}><h2>PWP · {monthLabel(month)}</h2></div>
   <div className={styles.weekPicker}>{[1,2,3,4,5].map(n=><button key={n} aria-pressed={myWeek===n} onClick={()=>onWeek(n)}>Wk {n}</button>)}</div>
   {pwp?<>
    <h3>{pwp.body.title}</h3><p>{pwp.body.summary}</p>
    {pwp.body.items.map((x,i)=><p key={i}>{x}</p>)}
    <small>{pwp.body.sourceLabel}</small>
   </>:<p className={styles.muted}>Week {myWeek} activities will appear here when they are ready.</p>}
   <a className={styles.officialLink} href="https://wm.watv.org/login.wmc" target="_blank" rel="noopener noreferrer">Open PWP card</a>
  </section>}
  <div className={styles.sectionHeading}><h2>Upcoming dates</h2><button onClick={onFullSchedule}>Full schedule →</button></div>
  <div className={styles.upcomingList}>{(upcoming.length?upcoming:future).slice(0,5).map(o=>
   <button className={styles.nextOwn} key={o.id} onClick={()=>onOpen(o)}>
    <span><small>{dayLabel(o.date)}</small><strong>{clockTime(o.startsAt)} · {o.host}</strong></span><b>›</b>
   </button>)}
  </div>
 </>;
}
