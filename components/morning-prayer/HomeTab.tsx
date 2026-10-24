'use client';
import {ArrowRight,Sun} from '../home-icons';
import {DateStrip,EmptyState,PageHeading,SectionHeader,Tag,TextAction} from '../ui-kit';
import styles from './morning-prayer.module.css';
import {addDays,clockTime,formatDate,hostLine,longDay,monthLabel,pwpPeriod} from './shared';
import type {Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';

/**
 * Atlas mission-home in Liquid Opal: heading, the weekly focus as the filled hero
 * (only when a published PWP exists for the month), the next gathering, and the
 * coming week as round date chips. Without a focus, the next gathering is the hero.
 */
export default function HomeTab({data,rows,today,published,cap,joinable,joinGathering,busy,month,myWeek,onWeek,onOpen,onDay,onFullSchedule,onAddGathering,onMaterials}:Screen&{
 month:string;myWeek:number;onWeek:(week:number)=>void;onOpen:(o:Occurrence)=>void;onDay:(date:string)=>void;onFullSchedule:()=>void;onAddGathering:()=>void;onMaterials:()=>void;
}){
 const isNextGathering=(o:Occurrence)=>o.date>=today&&o.kind==='gathering';
 const future=rows.filter(isNextGathering),upcoming=(data.upcoming||[]).filter(isNextGathering);
 const next=upcoming[0]||future[0];
 const monthPwp=cap('view_materials')?published.filter(m=>m.kind==='pwp'&&pwpPeriod(m.key)?.month===month):[];
 const pwp=monthPwp.find(m=>m.key==='pwp-'+month+'-week-'+myWeek);
 // The coming seven days. Days come from the upcoming projection and, for the loaded month, the full schedule.
 const byDate=new Map<string,Occurrence>();
 for(const o of [...(data.upcoming||[]),...rows])if(!byDate.has(o.date)||o.kind==='gathering')byDate.set(o.date,o);
 const week=Array.from({length:7},(_,i)=>addDays(today,i));
 const when=(o:Occurrence)=>longDay(o.date)+' · '+clockTime(o.startsAt);

 const nextActions=(o:Occurrence,onHero:boolean)=>{
  const join=joinable(o.id);
  if(onHero)return <div className={styles.heroActions}>
   {join&&<button type="button" className="ui-hero-action" disabled={busy} onClick={()=>void joinGathering(o.id)}>Join the gathering</button>}
   <button type="button" className="ui-hero-action" onClick={()=>onOpen(o)}>View gathering <ArrowRight size={18}/></button>
  </div>;
  return <div className={styles.actions}>
   {join&&<button type="button" className="ui-button" disabled={busy} onClick={()=>void joinGathering(o.id)}>Join the gathering</button>}
   <button type="button" className={'ui-button'+(join?' ui-button-secondary':'')} onClick={()=>onOpen(o)}>View gathering <ArrowRight size={18}/></button>
  </div>;
 };
 // Only what still needs attention; a confirmed date and host need no label here.
 const nextTags=(o:Occurrence)=>!o.verified||(!o.hostConfirmed&&o.host!=='Host needed')?<div className={styles.tags}>
  {!o.verified&&<Tag tone="warning">Date to be confirmed</Tag>}
  {!o.hostConfirmed&&o.host!=='Host needed'&&<Tag tone="warning">Host confirmation pending</Tag>}
 </div>:null;

 return <div className={styles.screen}>
  <PageHeading eyebrow="Las Vegas Work Mission" title="Begin the day together." lede="A place for preparation, encouragement and prayer."/>

  {monthPwp.length>0&&<section className={'ui-hero '+styles.hero} aria-labelledby="wm-pwp-title">
   <div className="ui-hero-copy">
    <h2 className={'ui-tag '+styles.heroTag} id="wm-pwp-title">Weekly focus · {monthLabel(month)}</h2>
    <p className={styles.heroTitle}>{pwp?pwp.body.title:'Week '+myWeek}</p>
    {pwp?<p className={styles.heroSummary}>{pwp.body.summary}</p>:<p>Week {myWeek} activities will appear here when they are ready.</p>}
    {pwp&&<button type="button" className="ui-hero-action" onClick={onMaterials}>Activities and source <ArrowRight size={18}/></button>}
    <div className={styles.heroWeeks} role="group" aria-label="PWP week">{[1,2,3,4,5].map(n=>
     <button key={n} type="button" aria-pressed={myWeek===n} aria-label={'Week '+n} onClick={()=>onWeek(n)}>Wk {n}</button>)}
    </div>
   </div>
  </section>}

  {next&&monthPwp.length>0&&<section className={'ui-glass '+styles.nextCard} aria-labelledby="wm-next-title">
   <h2 className="ui-eyebrow" id="wm-next-title">Your next gathering</h2>
   <p className={styles.cardTitle}>{hostLine(next)}</p>
   <p className={styles.quiet}>{when(next)} Las Vegas</p>
   {nextTags(next)}
   {nextActions(next,false)}
  </section>}

  {next&&monthPwp.length===0&&<section className={'ui-hero '+styles.hero} aria-labelledby="wm-next-title">
   <div className="ui-hero-copy">
    <h2 className={'ui-tag '+styles.heroTag} id="wm-next-title">Your next gathering</h2>
    <p className={styles.heroTitle}>{hostLine(next)}</p>
    <p>{when(next)} Las Vegas</p>
    {nextTags(next)}
    {nextActions(next,true)}
   </div>
  </section>}

  {!next&&<section className={'ui-glass '+styles.state} aria-label="Next gathering">
   <EmptyState icon={<Sun/>} title="No gatherings scheduled yet"
    action={cap('manage_schedule')?<button type="button" className="ui-button" onClick={onAddGathering}>Add a gathering</button>:undefined}>
    {cap('manage_schedule')?'Add your first gathering in Manage.':'Your next gathering will appear here.'}
   </EmptyState>
  </section>}

  <section aria-labelledby="wm-week-title">
   <SectionHeader title="This week" id="wm-week-title" action={<TextAction label="Open the full schedule" onClick={onFullSchedule}>Schedule</TextAction>}/>
   <div className={styles.week} data-no-swipe>
    <DateStrip label="The next seven days" days={week.map(date=>{
     const o=byDate.get(date);
     const what=!o?'no gathering scheduled':o.kind==='gathering'?hostLine(o)+' at '+clockTime(o.startsAt):o.kind==='app_day'?'Pray Daily app day':'cancelled';
     return {key:date,top:formatDate(date,{weekday:'short'}),day:Number(date.slice(-2)),
      bottom:o&&o.kind==='gathering'?<i className={styles.dot} aria-hidden="true"/>:date===today?'Today':formatDate(date,{month:'short'}),
      label:longDay(date)+', '+what,selected:date===today,onClick:()=>o&&o.kind==='gathering'?onOpen(o):onDay(date)};
    })}/>
   </div>
   <p className="ui-legend">Dots mark a scheduled gathering. Times are Las Vegas time.</p>
  </section>
 </div>;
}
