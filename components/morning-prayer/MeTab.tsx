'use client';
import styles from './morning-prayer.module.css';
import {clockParts,dayLabel} from './shared';
import type {Screen} from './MorningPrayerLive';
export default function MeTab({data,rows,today,busy,post}:Screen){
 const own=(data.ownHosting||rows.filter(o=>o.isMine)).filter(o=>o.kind==='gathering'&&Date.parse(o.endsAt)>Date.now());
 const mine=(data.requests||[]).filter(r=>r.isMine);
 return <div className={styles.reading}>
  <h2 className={styles.heading}>Your hosting dates</h2>
  {own.length?<ul className="ui-list">{own.map(o=>{const [t,m]=clockParts(o.startsAt);return <li key={o.id} className={"ui-row "+styles.rowWrap}>
   <span className={styles.time}>{t}<small>{m}</small></span>
   <span className="ui-row-body"><strong>{dayLabel(o.date)}</strong><small>{o.hostConfirmed?'Confirmed':'Please confirm you can host'}</small></span>
   {o.hostConfirmed
    ?<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void post({type:'request_change',occurrenceId:o.id,note:''})}>Request a change</button>
    :<button type="button" className="ui-button" disabled={busy} onClick={()=>void post({type:'confirm_host',occurrenceId:o.id})}>Confirm hosting</button>}
  </li>;})}</ul>:<p className={styles.quiet}>You have no upcoming hosting dates.</p>}

  <h2 className={styles.heading}>Your requests</h2>
  {mine.length?<ul className="ui-list">{mine.map(r=><li key={r.id} className={"ui-row "+styles.rowWrap}>
   <span className="ui-row-body">
    <strong>{dayLabel(r.date||rows.find(o=>o.id===r.occurrenceId)?.date||today)}</strong>
    <small>{r.kind==='volunteer'?'Request to host':'Request a change'} · {r.status}</small>
   </span>
   {r.status==='pending'&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void post({type:'withdraw',requestId:r.id})}>Withdraw</button>}
  </li>)}</ul>:<p className={styles.quiet}>You have no requests. Other members’ requests stay private.</p>}
 </div>;
}
