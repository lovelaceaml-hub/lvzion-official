'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronRight,X} from './home-icons';
import {parseModuleFeed} from '../lib/app-runtime';
import type {AuthorizedModule} from '../lib/app-runtime';
import './app-switcher.css';

/** Uses the same authenticated, permission-filtered module feed as Member Home. */
export default function AppSwitcher({open,onClose}:{open:boolean;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [modules,setModules]=useState<AuthorizedModule[]|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  const node=dialog.current;
  if(open&&!node?.open)node?.showModal();
  if(!open&&node?.open)node.close();
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();
  setModules(null);setError('');
  void (async()=>{
   try{
    const response=await fetch('/api/members/experience',{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw Error(response.status===401||response.status===403?'Sign in to view your authorized apps.':'Apps are unavailable. Try again.');
    const parsed=parseModuleFeed(await response.json());
    if(!controller.signal.aborted)setModules(parsed.modules);
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load apps.');}
  })();
  return ()=>controller.abort();
 },[open]);
 return <dialog ref={dialog} className="ui-sheet lvz-switcher" aria-label="Apps" onClose={onClose}>
  <div className="ui-sheet-body">
   <header className="lvz-switcher-heading"><h2>Apps</h2><button type="button" aria-label="Close apps" onClick={()=>onClose()}><X size={21}/></button></header>
   <p className="ui-hint">Only applications assigned to your LV Zion account appear here.</p>
   {error&&<p role="alert" className="ui-notice" data-tone="warning">{error}</p>}
   {!error&&modules===null&&<p role="status" className="ui-hint">Loading your apps…</p>}
   {!error&&modules?.length===0&&<p className="ui-empty">No applications have been assigned to your account yet.</p>}
   {!error&&modules&&modules.length>0&&<ul className="lvz-switcher-list">{modules.map(module=><li key={module.id}>
    <a href={module.route}><span className="lvz-switcher-symbol" aria-hidden="true">{module.shortName}</span><span className="lvz-switcher-name">{module.name}</span><ChevronRight size={18}/></a>
   </li>)}</ul>}
  </div>
 </dialog>;
}
