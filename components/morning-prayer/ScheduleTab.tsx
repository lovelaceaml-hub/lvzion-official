'use client';
import {CalendarDays,ChevronLeft,ChevronRight,Sun} from '../home-icons';
import {DateStrip,EmptyState,IconBox,PageHeading,Row,Segmented,Tag} from '../ui-kit';
import styles from './morning-prayer.module.css';
import {MonthCalendar,VolunteerCard} from './MorningPrayerVolunteer';
import {addDays,clockTime,formatDate,hostLine,longDay,mondayOf,monthLabel,shiftMonth,statusTag} from './shared';
import type {Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';
export type ScheduleView='week'|'month';

/**
 * Atlas mission-schedule in Liquid Opal: Week or Month pill control, the week as
 * round date chips over a glass list of gatherings, or the month calendar. Weeks
 * are shown within the loaded month, so every chip reflects data that was read.
 */
export default function ScheduleTab({rows,today,busy,cap,post,month,day,view,onView,onDay,onOpen,onMonth,onMine}:Screen&{
 month:string;day:string;view:ScheduleView;onView:(view:ScheduleView)=>void;onDay:(date:string)=>void;onOpen:(o:Occurrence)=>void;onMonth:(month:string)=>void;onMine:()=>void;
}){
 const inMonth=(date:string)=>date.slice(0,7)===month;
 // The selected day always lies in the loaded month.
 const selected=inMonth(day)?day:inMonth(today)?today:month+'-01';
 const segment=Array.from({length:7},(_,i)=>addDays(mondayOf(selected),i)).filter(inMonth);
 const weekRows=rows.filter(o=>segment.includes(o.date));
 const byDate=new Map<string,Occurrence>();
 for(const o of rows)if(!byDate.has(o.date)||o.kind==='gathering')byDate.set(o.date,o);
 /** Moves to the neighbouring week segment, crossing into the next or previous month when needed. */
 function moveWeek(direction:-1|1){
  const target=direction<0?addDays(segment[0],-1):addDays(segment[segment.length-1],1);
  const start=direction<0?(()=>{const monday=mondayOf(target);return monday.slice(0,7)===target.slice(0,7)?monday:target.slice(0,7)+'-01';})():target;
  if(!inMonth(start))onMonth(start.slice(0,7));
  onDay(start);
 }
 function moveMonth(delta:number){const next=shiftMonth(month,delta);onMonth(next);onDay(today.slice(0,7)===next?today:next+'-01');}
 const range=segment.length?formatDate(segment[0],{month:'short',day:'numeric'})+(segment.length>1?' – '+formatDate(segment[segment.length-1],{day:'numeric'}):''):'';
 return <div className={styles.screen}>
  <PageHeading eyebrow={monthLabel(month)} title="Host schedule" lede="Gathering dates and hosts, in Las Vegas time."/>
  <Segmented label="Schedule view" value={view} onChange={onView} options={[['week','Week'],['month','Month']]}/>

  {view==='week'&&<>
   <div className={styles.periodNav}>
    <button type="button" className={styles.round} aria-label="Previous week" onClick={()=>moveWeek(-1)}><ChevronLeft size={20}/></button>
    <strong>{range}</strong>
    <button type="button" className={styles.round} aria-label="Next week" onClick={()=>moveWeek(1)}><ChevronRight size={20}/></button>
   </div>
   <div className={styles.week} data-no-swipe>
    <DateStrip label="Days this week" days={segment.map(date=>{
     const o=byDate.get(date);
     return {key:date,top:formatDate(date,{weekday:'short'}),day:Number(date.slice(-2)),
      bottom:o&&o.kind==='gathering'?<i className={styles.dot} aria-hidden="true"/>:date===today?'Today':formatDate(date,{month:'short'}),
      label:'Select '+longDay(date)+(o?', '+(o.kind==='gathering'?hostLine(o):o.kind==='app_day'?'Pray Daily app day':'cancelled'):', no gathering'),
      selected:date===selected,onClick:()=>onDay(date)};
    })}/>
   </div>
   {weekRows.length?<div className="ui-glass ui-glass-tight"><ul className="ui-list" aria-label="Gatherings this week">{weekRows.map(o=>{
    const tag=statusTag(o);
    return <li key={o.id} className={o.date===selected?styles.current:undefined}>
     <Row onClick={()=>onOpen(o)} lead={<IconBox><Sun size={22}/></IconBox>}
      title={formatDate(o.date,{weekday:'short'})+' '+Number(o.date.slice(-2))+' · '+(o.kind==='gathering'?(o.host==='Host needed'?'Open host':o.host):o.kind==='app_day'?'Pray Daily app day':'No gathering')}
      detail={o.kind==='gathering'?clockTime(o.startsAt)+' · '+(o.verified?'Date confirmed':'To be confirmed'):o.kind==='app_day'?'No Zoom gathering':'Cancelled'}
      end={<Tag tone={tag.tone}>{tag.label}</Tag>} chevron={false}/>
    </li>;})}</ul></div>
   :<div className="ui-glass"><EmptyState icon={<CalendarDays/>} title="Nothing scheduled this week">Scheduled gatherings will appear here.</EmptyState></div>}
  </>}

  {view==='month'&&<>
   <div className={styles.periodNav}>
    <button type="button" className={styles.round} aria-label="Previous month" onClick={()=>moveMonth(-1)}><ChevronLeft size={20}/></button>
    <h2>{monthLabel(month)}</h2>
    <button type="button" className={styles.round} aria-label="Next month" onClick={()=>moveMonth(1)}><ChevronRight size={20}/></button>
   </div>
   <MonthCalendar month={month} rows={rows} today={today} selected={selected} onSelect={onOpen}/>
   {rows.length===0&&<div className="ui-glass"><EmptyState icon={<CalendarDays/>} title="No gatherings this month">Scheduled gatherings will appear on this calendar.</EmptyState></div>}
  </>}

  {cap('volunteer_host')&&<VolunteerCard month={month} rows={rows} today={today} busy={busy} onSubmit={ids=>post({type:'volunteer',occurrenceIds:ids})}/>}

  <button type="button" className={'ui-button ui-button-secondary ui-button-block '+styles.mineButton} onClick={onMine}>My upcoming gatherings <CalendarDays size={20}/></button>
 </div>;
}
