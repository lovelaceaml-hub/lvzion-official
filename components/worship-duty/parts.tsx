'use client';
/**
 * Small Liquid Opal pieces shared by the Worship Duty screens (Atlas worship-*):
 * the month calendar in a glass card, the tinted service strip, the date box at
 * the start of a service row and a few local icons the shared set lacks.
 */
import type {ReactNode} from 'react';
import {ChevronLeft,ChevronRight} from '../home-icons';
import {serviceLocalTime} from '../../lib/worship-duty/service-time';

export const STATUS={draft:'Draft',published:'Published',cancelled:'Cancelled'} as const;
export const STATUS_TONE={draft:'warning',published:undefined,cancelled:'danger'} as const;
const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const noon=(date:string)=>new Date(date+'T12:00:00Z');
/** "Saturday, October 31" for a YYYY-MM-DD Las Vegas date. */
export const longDate=(date:string)=>noon(date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'});
/** "SATURDAY · OCTOBER 31" style eyebrow text (case comes from CSS). */
export const eyebrowDate=(date:string)=>noon(date).toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'})+' · '+noon(date).toLocaleDateString('en-US',{month:'long',day:'numeric',timeZone:'UTC'});
export function monthTitle(month:string){
 const [year,number]=month.split('-').map(Number);
 return Number.isInteger(year)&&number>=1&&number<=12?new Date(Date.UTC(year,number-1,15)).toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}):'Choose a month';
}
export function shiftMonth(month:string,by:number){
 const [year,number]=month.split('-').map(Number);
 return new Date(Date.UTC(year,number-1+by,1)).toISOString().slice(0,7);
}

/**
 * Month calendar inside a glass card: round arrows around the month title, a
 * Sunday-first grid, a dot on days with services and the filled selected day.
 * Only days with services can be chosen.
 */
export function MonthGrid({month,onMonth,count,mine,selected,onSelect,level=2,legend}:{month:string;onMonth:(month:string)=>void;count:(date:string)=>number;mine?:(date:string)=>boolean;selected:string;onSelect:(date:string)=>void;level?:2|3;legend?:ReactNode}){
 const [year,number]=month.split('-').map(Number),valid=Number.isInteger(year)&&number>=1&&number<=12;
 const lead=valid?new Date(Date.UTC(year,number-1,1)).getUTCDay():0;
 const dates=valid?Array.from({length:new Date(Date.UTC(year,number,0)).getUTCDate()},(_,n)=>`${month}-${String(n+1).padStart(2,'0')}`):[];
 const title=monthTitle(month),Heading=level===2?'h2':'h3';
 return <div className="ui-glass wd-month">
  <div className="wd-month-head">
   <button type="button" className="wd-round" aria-label="Previous month" disabled={!valid} onClick={()=>onMonth(shiftMonth(month,-1))}><ChevronLeft size={20}/></button>
   <Heading>{title}</Heading>
   <button type="button" className="wd-round" aria-label="Next month" disabled={!valid} onClick={()=>onMonth(shiftMonth(month,1))}><ChevronRight size={20}/></button>
  </div>
  <div className="wd-month-grid" role="group" aria-label={`Services in ${title}`} data-no-swipe>
   {WEEKDAYS.map(w=><abbr key={w} title={w}>{w.slice(0,2)}</abbr>)}
   {Array.from({length:lead},(_,n)=><span key={'lead'+n} aria-hidden="true"/>)}
   {dates.map(date=>{const n=count(date),own=!!mine?.(date);return <button type="button" className="wd-day" key={date} data-services={n>0} data-mine={own||undefined} disabled={!n} aria-pressed={date===selected} aria-label={`${longDate(date)}, ${n} ${n===1?'service':'services'}${own?', you serve':''}`} onClick={()=>onSelect(date)}>{Number(date.slice(8))}</button>;})}
  </div>
  {legend}
 </div>;
}

/** Tinted rounded strip at the top of a glass card: a tag or icon, then one line. */
export function Strip({lead,children,end}:{lead:ReactNode;children:ReactNode;end?:ReactNode}){
 return <div className="wd-strip">{lead}<strong>{children}</strong>{end}</div>;
}

/** Month, day number and weekday of a service in a tinted rounded box (Las Vegas date). */
export function DateBox({startsAt}:{startsAt:string}){
 const date=noon(serviceLocalTime(startsAt).slice(0,10));
 return <span className="wd-datebox" aria-hidden="true">
  <small>{date.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'})}</small>
  <strong>{date.getUTCDate()}</strong>
  <small>{date.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})}</small>
 </span>;
}

/** A frosted card with an icon, one bold line and one sentence (Atlas notice card). */
export function Callout({icon,title,children,tone}:{icon:ReactNode;title:ReactNode;children?:ReactNode;tone?:'warning'}){
 return <div className="ui-glass wd-callout" data-tone={tone}><span className="wd-callout-icon" aria-hidden="true">{icon}</span><div><strong>{title}</strong>{children?<p>{children}</p>:null}</div></div>;
}
