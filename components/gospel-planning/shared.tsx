'use client';
/**
 * Groups & Gospel Planning pieces in the Liquid Opal material: glass section cards,
 * the week header with round arrows, status tags, the calendar date block and the
 * bottom sheet. Composed from components/ui-kit.tsx; styles in gospel-planning.css.
 */
import {createContext,useContext,useEffect,useRef,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight,X} from '../home-icons';
import {EmptyState,TextAction} from '../ui-kit';
import {addDays,dayLabel,mondayOf,type Action,type Status} from '../../lib/gospel-planning/contract';

/** Sends one command; resolves true when saved. Errors are shown by the page. */
export type Send=(action:Action,payload:Record<string,unknown>)=>Promise<boolean>;

export type Notice={tone:'success'|'warning'|'danger';text:string}|null;
/** The latest save result, so an open sheet can show why a save did not go through. */
export const NoticeContext=createContext<Notice>(null);

/** The week on screen and how to move it; owned by the page so both tabs share it. */
export type WeekControl={week:string;today:string;onWeek:(week:string)=>void};

/** Native dialog sheet: bottom sheet on phones, centered on wide screens, closes with Escape. */
export function Sheet({open,title,onClose,children}:{open:boolean;title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=ref.current;if(open&&!node?.open)node?.showModal();if(!open&&node?.open)node.close();},[open]);
 return <dialog ref={ref} className="ui-sheet gp-sheet" aria-label={title} onClose={onClose}>
  {open&&<div className="ui-sheet-body">
   <span className="gp-sheet-grip" aria-hidden="true"/>
   <header className="gp-sheet-heading"><h2>{title}</h2><button type="button" className="gp-round-button" aria-label={'Close '+title.toLowerCase()} onClick={onClose}><X size={20}/></button></header>
   <SheetNotice/>
   {children}
  </div>}
 </dialog>;
}

function SheetNotice(){
 const notice=useContext(NoticeContext);
 return notice&&notice.tone!=='success'?<p role="alert" className="ui-notice" data-tone={notice.tone}>{notice.text}</p>:null;
}

/** One status as a small rounded tag; tone quiet, info, warning, success or danger. */
export function StatusChip({status}:{status:Status}){
 return <span className="ui-tag gp-chip" data-tone={status.tone}>{status.label}</span>;
}

const slug=(title:string)=>'gp-'+title.toLowerCase().replace(/[^a-z]+/g,'-');
/** A glass card section: numbered or plain title, an optional action on the right and one sentence. */
export function Section({number,title,note,children,action,className}:{number?:number;title:string;note?:string;children:ReactNode;action?:ReactNode;className?:string}){
 return <section className={'ui-glass gp-card'+(className?' '+className:'')} aria-labelledby={slug(title)}>
  <header className="gp-section-heading">
   <h2 id={slug(title)}>{number?<span className="gp-step" aria-hidden="true">{number}</span>:null}{title}</h2>
   {action}
  </header>
  {note&&<p className="gp-section-note">{note}</p>}
  {children}
 </section>;
}

/** Section title outside a card, with an optional action, followed by its own glass content. */
export function Heading({title,action}:{title:string;action?:ReactNode}){
 return <div className="ui-section-head gp-head"><h2 id={slug(title)}>{title}</h2>{action}</div>;
}

export function Empty({icon,title,children,action}:{icon:ReactNode;title:string;children?:ReactNode;action?:ReactNode}){
 return <EmptyState icon={icon} title={title} action={action}>{children}</EmptyState>;
}

/** Small secondary pill for a card's own action (Add update, Start draft, Edit). */
export function CardAction({children,onClick}:{children:ReactNode;onClick:()=>void}){
 return <button type="button" className="ui-button ui-button-secondary gp-card-action" onClick={onClick}>{children}</button>;
}

function weekTitle(week:string,today:string){
 const current=mondayOf(today);
 return week===current?'This week':week===addDays(current,7)?'Next week':week===addDays(current,-7)?'Last week':'Week of '+dayLabel(week).replace(/^\w+, /,'');
}
const short=(day:string)=>dayLabel(day).replace(/^\w+, /,'');

/** "This week" with round previous and next arrows around the dates, as on Home. */
export function WeekHeader({control}:{control:WeekControl}){
 const {week,today,onWeek}=control,current=mondayOf(today);
 return <>
  <div className="ui-section-head gp-week-head">
   <h2 id="gp-week-title">{weekTitle(week,today)}</h2>
   <nav className="gp-week-nav" aria-label="Week">
    <button type="button" className="gp-round-button" aria-label="Previous week" onClick={()=>onWeek(addDays(week,-7))}><ChevronLeft size={20}/></button>
    <span>{short(week)} to {short(addDays(week,6))}</span>
    <button type="button" className="gp-round-button" aria-label="Next week" onClick={()=>onWeek(addDays(week,7))}><ChevronRight size={20}/></button>
   </nav>
  </div>
  {week!==current&&<p className="gp-back"><TextAction onClick={()=>onWeek(current)}>Back to this week</TextAction></p>}
 </>;
}

const utc=(day:string)=>new Date(day+'T12:00:00Z');
/** Month, day number and weekday stacked in a tinted rounded block. */
export function DateBlock({day,small}:{day:string;small?:boolean}){
 const d=utc(day);
 return <span className="gp-date-block" data-small={small?'true':undefined} aria-hidden="true">
  <span>{d.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'})}</span>
  <strong>{d.getUTCDate()}</strong>
  <small>{d.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})}</small>
 </span>;
}

/** A frosted card with an icon, one bold line and one sentence. */
export function Callout({icon,title,children}:{icon:ReactNode;title:ReactNode;children:ReactNode}){
 return <div className="ui-glass gp-callout"><span className="gp-callout-icon" aria-hidden="true">{icon}</span><div><strong>{title}</strong><p>{children}</p></div></div>;
}

export function newRequestId():string{
 return typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^(Math.random()*16>>Number(c)/4)).toString(16));
}
