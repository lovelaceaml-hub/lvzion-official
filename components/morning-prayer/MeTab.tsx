'use client';
import {CalendarDays,ClipboardList} from '../home-icons';
import {EmptyState,IconBox,PageHeading,SectionHeader,Tag} from '../ui-kit';
import styles from './morning-prayer.module.css';
import {clockParts,dayLabel} from './shared';
import type {Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';

/** Your hosting dates and your own requests, as glass rows with their one action each. */
export default function MeTab({data,rows,today,busy,post,onOpen}:Screen&{onOpen:(o:Occurrence)=>void}){
 const own=(data.ownHosting||rows.filter(o=>o.isMine)).filter(o=>o.kind==='gathering'&&Date.parse(o.endsAt)>Date.now());
 const mine=(data.requests||[]).filter(r=>r.isMine);
 return <div className={styles.screen}>
  <PageHeading eyebrow="Your part" title="Your hosting" lede="Confirm the dates you host and follow your requests."/>
  <SectionHeader title="Your hosting dates" note={own.length?String(own.length):undefined}/>
  {own.length?<div className="ui-glass ui-glass-tight"><ul className="ui-list">{own.map(o=>{const [t,m]=clockParts(o.startsAt);return <li key={o.id} className={'ui-row '+styles.rowWrap}>
   <IconBox><span className={styles.boxTime}>{t}<small>{m}</small></span></IconBox>
   <button type="button" className={styles.rowLink} onClick={()=>onOpen(o)}><span className="ui-row-body"><strong>{dayLabel(o.date)}</strong><small>{o.hostConfirmed?'Confirmed':'Please confirm you can host'}</small></span></button>
   {o.hostConfirmed
    ?<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void post({type:'request_change',occurrenceId:o.id,note:''})}>Request a change</button>
    :<button type="button" className="ui-button" disabled={busy} onClick={()=>void post({type:'confirm_host',occurrenceId:o.id})}>Confirm hosting</button>}
  </li>;})}</ul></div>
  :<div className="ui-glass"><EmptyState icon={<CalendarDays/>} title="No upcoming hosting dates">Dates you host appear here after a coordinator assigns them.</EmptyState></div>}

  <SectionHeader title="Your requests" note={mine.length?String(mine.length):undefined}/>
  {mine.length?<div className="ui-glass ui-glass-tight"><ul className="ui-list">{mine.map(r=><li key={r.id} className={'ui-row '+styles.rowWrap}>
   <IconBox><ClipboardList size={22}/></IconBox>
   <span className="ui-row-body">
    <strong>{dayLabel(r.date||rows.find(o=>o.id===r.occurrenceId)?.date||today)}</strong>
    <small>{r.kind==='volunteer'?'Request to host':'Request a change'}</small>
   </span>
   <Tag tone={r.status==='approved'?'success':r.status==='declined'?'danger':r.status==='pending'?'warning':undefined}>{r.status.charAt(0).toUpperCase()+r.status.slice(1)}</Tag>
   {r.status==='pending'&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void post({type:'withdraw',requestId:r.id})}>Withdraw</button>}
  </li>)}</ul></div>
  :<div className="ui-glass"><EmptyState icon={<ClipboardList/>} title="No requests">Other members’ requests stay private.</EmptyState></div>}
 </div>;
}
