'use client';
import {BookOpen,CalendarDays,ChevronLeft,Sun} from '../home-icons';
import {EmptyState,IconBox,PageHeading,Tag} from '../ui-kit';
import styles from './morning-prayer.module.css';
import {Lock} from './parts';
import {clockTime,hostLine,longDay} from './shared';
import type {Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';

/**
 * Atlas mission-session in Liquid Opal: date eyebrow, a glass card with a large
 * icon box and detail pairs, a row for the linked reading, and one primary action.
 * Joining stays behind the server's meeting state; the link is never shown here.
 */
export default function GatheringDetail({data,today,published,busy,cap,post,joinable,joinGathering,occurrence:o,backLabel,onBack}:Screen&{
 occurrence:Occurrence|undefined;backLabel:string;onBack:()=>void;
}){
 const back=<button type="button" className={styles.back} onClick={onBack}><ChevronLeft size={18}/>{backLabel}</button>;
 if(!o)return <div className={styles.screen}>
  {back}
  <div className={'ui-glass '+styles.state}><EmptyState icon={<CalendarDays/>} title="This date is no longer on the schedule">Choose another date from the schedule.</EmptyState></div>
 </div>;
 const gathering=o.kind==='gathering';
 const reading=cap('view_materials')&&o.readingKey?published.find(m=>m.kind==='reading'&&m.key===o.readingKey):undefined;
 const state=data.meetingStates?.find(s=>s.occurrenceId===o.id);
 const join=gathering&&joinable(o.id);
 const canVolunteer=cap('volunteer_host')&&gathering&&o.verified&&o.host==='Host needed'&&o.date>=today;
 const joinWindow=data.joinWindowMinutes;
 const ended=Date.parse(o.endsAt)<Date.now();
 const meeting=join?'Open now':ended?'Ended':state?.configured===false&&cap('manage_schedule')?'Link not set up yet'
  :joinWindow!==null&&joinWindow!==undefined?'Opens '+(joinWindow===0?'at the start':joinWindow+' min before'):'Opens before the start';
 const title=gathering?'Morning gathering':o.kind==='app_day'?'Pray Daily app day':'No gathering';
 return <div className={styles.screen}>
  {back}
  <PageHeading eyebrow={longDay(o.date)} title={title} lede={clockTime(o.startsAt)+' to '+clockTime(o.endsAt)+', Las Vegas time'}/>
  <section className={'ui-glass '+styles.session} data-testid="actual-gathering" aria-labelledby="wm-day-title">
   <span className={styles.sessionIcon} aria-hidden="true"><Sun size={44}/></span>
   <h2 id="wm-day-title" className={styles.cardTitle}>{hostLine(o)}</h2>
   <div className={styles.tags}>
    {gathering&&<Tag tone={o.verified?'success':'warning'}>{o.verified?'Date confirmed':'Date to be confirmed'}</Tag>}
    {gathering&&o.host!=='Host needed'&&<Tag tone={o.hostConfirmed?undefined:'warning'}>{o.hostConfirmed?'Host confirmed':'Host confirmation pending'}</Tag>}
    {!gathering&&<Tag tone={o.kind==='cancelled'?'danger':undefined}>{o.kind==='cancelled'?'Cancelled':'No Zoom gathering'}</Tag>}
   </div>
   <dl className="ui-pairs">
    <dt>Begins</dt><dd>{clockTime(o.startsAt)}</dd>
    <dt>Ends</dt><dd>{clockTime(o.endsAt)}</dd>
    {gathering&&<><dt>Host</dt><dd>{o.host}</dd></>}
    {gathering&&cap('join_gathering')&&<><dt>Meeting</dt><dd>{meeting}</dd></>}
   </dl>
   {!o.verified&&<p className="ui-notice" data-tone="warning">This date is waiting for confirmation.</p>}
  </section>

  {cap('view_materials')&&gathering&&<div className="ui-glass ui-glass-tight">
   {reading?<details className={styles.expand}>
    <summary className="ui-row"><IconBox><BookOpen size={22}/></IconBox><span className="ui-row-body"><strong>Reading for this gathering</strong><small>{reading.body.title}</small></span></summary>
    <div className={styles.material}>
     <h3>Reading: {reading.body.title}</h3><p>{reading.body.summary}</p>
     <ul>{reading.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul>
     <p className={styles.quiet}>Source: {reading.body.sourceLabel}</p>
    </div>
   </details>:<div className="ui-row"><IconBox><BookOpen size={22}/></IconBox><span className="ui-row-body"><strong>Reading for this gathering</strong><small>No reading is linked to this date yet.</small></span></div>}
  </div>}

  {join&&<button type="button" className={'ui-button ui-button-block '+styles.primary} disabled={busy} onClick={()=>void joinGathering(o.id)}>Join the gathering</button>}
  {!join&&canVolunteer&&<button type="button" className={'ui-button ui-button-block '+styles.primary} disabled={busy} onClick={()=>void post({type:'volunteer',occurrenceIds:[o.id]})}>Request to host this date</button>}
  {gathering&&!join&&!canVolunteer&&cap('join_gathering')&&!ended&&<button type="button" className={'ui-button ui-button-block '+styles.primary} disabled>Join the gathering <Lock/></button>}
  {gathering&&!join&&cap('join_gathering')&&!ended&&<p className={styles.hint}>The meeting link appears here when joining opens.</p>}
 </div>;
}
