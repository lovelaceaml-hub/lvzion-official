'use client';
import styles from './morning-prayer.module.css';
import {clockTime,dayLabel} from './shared';
import type {Screen} from './MorningPrayerLive';
export default function MeTab({data,rows,today,busy,post}:Screen){
 const own=(data.ownHosting||rows.filter(o=>o.isMine)).filter(o=>o.kind==='gathering'&&Date.parse(o.endsAt)>Date.now());
 const mine=(data.requests||[]).filter(r=>r.isMine);
 return <>
  <section className={styles.card}><h2>Your hosting dates</h2>{own.length?own.map(o=><div className={styles.hostingRow} key={o.id}>
   <strong>{dayLabel(o.date)} · {clockTime(o.startsAt)}</strong>
   <p>{o.hostConfirmed?'Confirmed':'Confirmation needed'}</p>
   {o.hostConfirmed
    ?<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'request_change',occurrenceId:o.id,note:''})}>Request a change</button>
    :<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'confirm_host',occurrenceId:o.id})}>Confirm hosting</button>}
  </div>):<p className={styles.muted}>You do not have an upcoming hosting assignment.</p>}</section>
  <section className={styles.card}><h2>Your requests</h2>{mine.length?mine.map(r=><div className={styles.requestRow} key={r.id}>
   <strong>{r.kind==='volunteer'?'Volunteer':'Change'} · {r.status}</strong>
   <p>{dayLabel(r.date||rows.find(o=>o.id===r.occurrenceId)?.date||today)}</p>
   {r.status==='pending'&&<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'withdraw',requestId:r.id})}>Withdraw request</button>}
  </div>):<p className={styles.muted}>No requests. Other members’ private requests are not shown.</p>}</section>
 </>;
}
