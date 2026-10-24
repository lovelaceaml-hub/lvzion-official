'use client';
import {createContext,useContext,useEffect,useRef,type ReactNode} from 'react';
import {X} from '../home-icons';
import type {Action,Status} from '../../lib/gospel-planning/contract';

/** Sends one command; resolves true when saved. Errors are shown by the page. */
export type Send=(action:Action,payload:Record<string,unknown>)=>Promise<boolean>;

export type Notice={tone:'success'|'warning'|'danger';text:string}|null;
/** The latest save result, so an open sheet can show why a save did not go through. */
export const NoticeContext=createContext<Notice>(null);

/** Native dialog sheet: bottom sheet on phones, centered on wide screens, closes with Escape. */
export function Sheet({open,title,onClose,children}:{open:boolean;title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=ref.current;if(open&&!node?.open)node?.showModal();if(!open&&node?.open)node.close();},[open]);
 return <dialog ref={ref} className="ui-sheet gp-sheet" aria-label={title} onClose={onClose}>
  {open&&<div className="ui-sheet-body">
   <header className="gp-sheet-heading"><h2>{title}</h2><button type="button" className="gp-icon-button" aria-label={'Close '+title.toLowerCase()} onClick={onClose}><X size={21}/></button></header>
   <SheetNotice/>
   {children}
  </div>}
 </dialog>;
}

function SheetNotice(){
 const notice=useContext(NoticeContext);
 return notice&&notice.tone!=='success'?<p role="alert" className="ui-notice" data-tone={notice.tone}>{notice.text}</p>:null;
}

export function StatusChip({status}:{status:Status}){
 return <span className="gp-chip" data-tone={status.tone}>{status.label}</span>;
}

export function Section({number,title,note,children,action}:{number?:number;title:string;note?:string;children:ReactNode;action?:ReactNode}){
 return <section className="gp-section" aria-labelledby={'gp-'+title.toLowerCase().replace(/[^a-z]+/g,'-')}>
  <header className="gp-section-heading">
   <h2 id={'gp-'+title.toLowerCase().replace(/[^a-z]+/g,'-')}>{number?<span className="gp-step" aria-hidden="true">{number}</span>:null}{title}</h2>
   {action}
  </header>
  {note&&<p className="ui-hint gp-section-note">{note}</p>}
  {children}
 </section>;
}

export function Empty({title,children}:{title:string;children?:ReactNode}){
 return <div className="gp-empty"><strong>{title}</strong>{children&&<p>{children}</p>}</div>;
}

export function newRequestId():string{
 return typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^(Math.random()*16>>Number(c)/4)).toString(16));
}
