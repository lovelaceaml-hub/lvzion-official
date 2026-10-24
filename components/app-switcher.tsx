'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Grid2X2,Search,X} from './home-icons';
import {parseModuleFeed} from '../lib/app-runtime';
import type {AuthorizedModule} from '../lib/app-runtime';
import ModuleIcon from './module-icon';
import './app-switcher.css';
// Markup uses the ui- kit classes directly (no ui-kit import) so isolated frame
// harnesses that copy only the frame files keep compiling.

/** Uses the same authenticated, permission-filtered module feed as Member Home. */
export default function AppSwitcher({open,onClose}:{open:boolean;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [modules,setModules]=useState<AuthorizedModule[]|null>(null);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 useEffect(()=>{
  const node=dialog.current;
  if(open&&!node?.open)node?.showModal();
  if(!open&&node?.open)node.close();
  if(!open)setQuery('');
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
 const term=query.trim().toLowerCase();
 const shown=(modules??[]).filter(m=>!term||m.name.toLowerCase().includes(term));
 return <dialog ref={dialog} className="ui-sheet lvz-switcher" aria-label="Apps" onClose={onClose}>
  <div className="ui-sheet-body">
   <header className="lvz-switcher-heading"><div><p className="ui-eyebrow">Your community toolkit</p><h2>Apps</h2></div><button type="button" aria-label="Close apps" onClick={()=>onClose()}><X size={21}/></button></header>
   <p className="ui-hint">Only applications assigned to your LV Zion account appear here.</p>
   {error&&<p role="alert" className="ui-notice" data-tone="warning">{error}</p>}
   {!error&&modules===null&&<p role="status" className="ui-hint">Loading your apps…</p>}
   {!error&&modules?.length===0&&<div className="ui-glass"><div className="ui-empty-state"><span className="ui-empty-icon" aria-hidden="true"><Grid2X2/></span><strong>No apps yet</strong><p>No applications have been assigned to your account yet.</p></div></div>}
   {!error&&modules&&modules.length>0&&<>
    <label className="ui-search"><Search size={20}/><span className="ui-visually-hidden">Find an app</span><input type="search" placeholder="Find an app" value={query} onChange={e=>setQuery(e.target.value)} autoComplete="off"/></label>
    {shown.length?<ul className="lvz-app-grid">{shown.map(module=><li className="ui-glass lvz-app-tile" key={module.id}>
     <span className="ui-icon-box lvz-app-symbol" aria-hidden="true"><ModuleIcon route={module.route}/></span>
     <a className="lvz-app-open" href={module.route}><strong>{module.name}</strong>{module.description&&<small>{module.description}</small>}<span className="lvz-app-go" aria-hidden="true">Open app <ArrowRight size={16}/></span></a>
    </li>)}</ul>:<p className="lvz-switcher-empty">No app matches that name.</p>}
   </>}
  </div>
 </dialog>;
}
