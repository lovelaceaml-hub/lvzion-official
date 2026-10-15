'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {FormEvent,KeyboardEvent} from 'react';
import type {ContactsWorkspace,ContactDetail,ContactSummary,PreferredMethod} from '../../lib/contacts/server-contract';
import {contactCounts,contactFilters,findLoadedContacts} from '../../lib/contacts/presentation';
import type {ContactFilter} from '../../lib/contacts/presentation';
import {parseModuleFeed} from '../../lib/app-runtime';
import type {AuthorizedModule} from '../../lib/app-runtime';
import AppHeader from '../app-header';
import {useSwipeTabs} from '../../lib/use-swipe-tabs';
import {ChevronLeft,ChevronRight,Grid2X2,X} from '../home-icons';
import './contacts.css';

type View='mine'|'followup'|'overview';
type Form='create'|'edit'|'note'|'schedule'|'reschedule'|null;
type Packet={id:string;version:number;requestId:string;operation:string;data:Record<string,string|boolean>};
type AgendaItem={id:string;title:string;href:string;deliveryEnabled:boolean};
type DuplicateMatch={id:string;name:string};
class RequestFailure extends Error {status:number;constructor(status:number){super(status===401?'Please sign in again.':status===403?'This record or action is no longer available.':status===409?'This record changed. Reload it and review before saving.':status===400?'Review the entered information and try again.':'The save result is uncertain. Retry this unchanged form to reuse its request ID, or reload the record before making another change.');this.status=status;}}
const zone='America/Los_Angeles';
const dayFormat=new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric'});
const timeFormat=new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'});
const labels={new:'New',active:'Active',paused:'Paused',closed:'Closed'};
const statusLabel=(c:ContactSummary)=>c.archived?'Archived':c.doNotContact?'Do not contact':labels[c.lifecycle];
const nextStepLabel=(c:ContactSummary)=>c.archived?'History retained':c.lifecycle==='closed'?'No active outreach':'Open record and next step';
const formTitles={create:'Add contact',edit:'Edit contact',note:'Add a private note',schedule:'Schedule follow-up',reschedule:'Reschedule follow-up'};
const preferredOptions:readonly [PreferredMethod,string][]=[['unknown','Not confirmed'],['text','Text'],['phone','Phone'],['email','Email']];
const methodNames={unknown:'Not confirmed',text:'Text',phone:'Phone',email:'Email'};
const tabs:readonly View[]=['mine','followup','overview'];
const tabNames={mine:'My contacts',followup:'Follow-ups',overview:'Overview'};
const isAbort=(e:unknown)=>e instanceof DOMException&&e.name==='AbortError';

/** Time first, in tabular figures: the Day Sheet rule for anything scheduled. Shown in Las Vegas time. */
function When({at}:{at:string}){
 const date=new Date(at);
 return <time className="ct-when" dateTime={date.toISOString()}><span>{dayFormat.format(date)}</span><small>{timeFormat.format(date)}</small></time>;
}
function Status({contact}:{contact:ContactSummary}){
 return <span className="ct-status" data-tone={contact.doNotContact&&!contact.archived?'danger':undefined}>{statusLabel(contact)}</span>;
}

/** Authenticated data only. Not mounted by the fictional preview and has no simulated role controls. */
export default function ContactsLiveWorkspace(){
 const [workspace,setWorkspace]=useState<ContactsWorkspace|null>(null),[detail,setDetail]=useState<ContactDetail|null>(null),[view,setView]=useState<View>('mine'),[form,setForm]=useState<Form>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[filter,setFilter]=useState<ContactFilter>('open'),[search,setSearch]=useState('');
 const [apps,setApps]=useState(false),[authorizedApps,setAuthorizedApps]=useState<AuthorizedModule[]>([]),[appsError,setAppsError]=useState(''),[appsLoading,setAppsLoading]=useState(false);
 const [duplicates,setDuplicates]=useState<DuplicateMatch[]|null>(null),[duplicatesLoading,setDuplicatesLoading]=useState(false);
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[preferred,setPreferred]=useState<PreferredMethod>('unknown'),[note,setNote]=useState(''),[due,setDue]=useState(''),[taskId,setTaskId]=useState('');
 const [agenda,setAgenda]=useState<AgendaItem[]>([]);
 // epoch invalidates every in-flight response once the view changes or private data is cleared.
 const requests=useRef(new Set<AbortController>()),epoch=useRef(0),pending=useRef<Packet|null>(null),submitting=useRef(false);
 const appsSheet=useRef<HTMLDialogElement>(null),paneHeading=useRef<HTMLHeadingElement>(null);

 const abortAll=useCallback(()=>{epoch.current++;for(const request of requests.current)request.abort();requests.current.clear();},[]);
 const resetFields=useCallback(()=>{setName('');setPhone('');setNote('');setDue('');setPreferred('unknown');setTaskId('');},[]);
 const clearPrivate=useCallback(()=>{
  abortAll();setWorkspace(null);setDetail(null);setAgenda([]);setForm(null);resetFields();pending.current=null;
  setBusy(false);setApps(false);setAuthorizedApps([]);setDuplicates(null);
 },[abortAll,resetFields]);
 const send=useCallback(async<T,>(endpoint:string,body:unknown):Promise<T>=>{
  const abort=new AbortController();requests.current.add(abort);
  try{
   const response=await fetch('/api/contacts/'+endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:abort.signal});
   if(!response.ok)throw new RequestFailure(response.status);
   return await response.json() as T;
  }finally{requests.current.delete(abort);}
 },[]);
 const failure=useCallback((e:unknown)=>{
  if(isAbort(e))return;
  if(e instanceof RequestFailure&&(e.status===401||e.status===403))clearPrivate();
  setError(e instanceof RequestFailure?e.message:'Contacts is unavailable. Reload before retrying a submitted change.');
 },[clearPrivate]);
 /** Runs one read; its result and errors are ignored if the epoch moved on meanwhile. */
 const track=useCallback(async<T,>(version:number,request:()=>Promise<T>,apply:(value:T)=>void,setLoading:(value:boolean)=>void=setBusy,onError?:()=>void)=>{
  setLoading(true);
  try{const value=await request();if(epoch.current===version)apply(value);}
  catch(e){if(epoch.current===version){onError?.();failure(e);}}
  finally{if(epoch.current===version)setLoading(false);}
 },[failure]);
 const load=useCallback(async()=>{
  const version=++epoch.current;setError('');setDetail(null);setForm(null);pending.current=null;
  await track(version,()=>send<ContactsWorkspace>('workspace',{}),setWorkspace,setBusy,()=>setWorkspace(null));
 },[send,track]);
 useEffect(()=>{
  void load();
  const visibility=()=>{if(document.hidden)clearPrivate();else void load();};
  const online=()=>{if(!document.hidden)void load();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('online',online);
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',online);abortAll();};
 },[load,clearPrivate,abortAll]);
 // The apps sheet is a native dialog; closing private data also closes it.
 useEffect(()=>{const sheet=appsSheet.current;if(!sheet)return;if(apps&&!sheet.open)sheet.showModal();else if(!apps&&sheet.open)sheet.close();},[apps]);
 // Opening a record or form moves focus to its heading, so keyboard and screen reader users land on it.
 useEffect(()=>{if(detail||form){paneHeading.current?.focus({preventScroll:true});if(window.matchMedia('(max-width: 899px)').matches)window.scrollTo({top:0});}},[detail?.id,form]);

 async function open(id:string,preserveNotice=false){
  const version=++epoch.current;setDetail(null);setDuplicates(null);setError('');if(!preserveNotice)setNotice('');setForm(null);pending.current=null;
  await track(version,()=>send<ContactDetail>('detail',{id}),setDetail);
 }
 async function more(){
  if(!workspace?.nextCursor||busy)return;
  await track(epoch.current,()=>send<ContactsWorkspace>('workspace',{after:workspace.nextCursor}),value=>{
   if(value.memberId!==workspace.memberId){clearPrivate();throw new RequestFailure(401);}
   setWorkspace({...value,contacts:[...workspace.contacts,...value.contacts.filter(c=>!workspace.contacts.some(old=>old.id===c.id))]});
  });
 }
 async function showAgenda(){
  setView('followup');setDetail(null);setForm(null);setAgenda([]);setError('');
  await track(++epoch.current,()=>send<AgendaItem[]>('agenda',{}),setAgenda);
 }
 function selectTab(next:View){if(next==='followup')void showAgenda();else setView(next);}
 async function showDuplicates(){
  if(!detail)return;
  setError('');
  await track(epoch.current,()=>send<DuplicateMatch[]>('duplicates',{id:detail.id}),setDuplicates,setDuplicatesLoading);
 }
 async function openApps(){
  if(apps)return;
  setApps(true);setAppsLoading(true);setAppsError('');
  const controller=new AbortController();requests.current.add(controller);
  try{
   const r=await fetch('/api/members/experience',{credentials:'same-origin',cache:'no-store',signal:controller.signal,referrerPolicy:'no-referrer'});
   if(!r.ok)throw new Error('Unavailable');
   setAuthorizedApps(parseModuleFeed(await r.json()).modules);
  }catch(e){if(!isAbort(e))setAppsError('Your app list is unavailable. Go to Home to see your apps.');}
  finally{requests.current.delete(controller);setAppsLoading(false);}
 }
 function edit(kind:Form,id=''){
  setError('');setNotice('');setForm(kind);resetFields();
  if(kind==='edit'){setName(detail?.name??'');setPreferred(detail?.preferred??'unknown');}
  setTaskId(id);pending.current=null;
 }
 /** An unchanged retry reuses its request ID so the database can deduplicate an uncertain save. */
 async function change(operation:string,data:Record<string,string|boolean>,record:ContactSummary|null=detail){
  if(submitting.current)return;submitting.current=true;const version=epoch.current;setBusy(true);setError('');setNotice('');
  const fingerprint=JSON.stringify({operation,data,id:record?.id??null,version:record?.version??0});
  if(!pending.current||JSON.stringify({operation:pending.current.operation,data:pending.current.data,id:record?.id??null,version:pending.current.version})!==fingerprint)pending.current={id:record?.id??crypto.randomUUID(),version:record?.version??0,requestId:crypto.randomUUID(),operation,data};
  const packet=pending.current;
  try{
   const receipt=await send<{id:string;version:number}>('command',packet);
   if(epoch.current!==version)return;
   pending.current=null;setForm(null);resetFields();setNotice('Saved.');
   if(operation==='create'){setFilter('open');setSearch('');setView('mine');}
   if(operation==='archive'){setView('mine');setFilter('archived');await load();}
   else await open(receipt.id,true);
  }
  catch(e){if(epoch.current===version)failure(e);}
  finally{submitting.current=false;if(epoch.current===version)setBusy(false);}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!workspace||busy)return;
  if(form==='create'){const data:Record<string,string>={name:name.trim(),preferred};if(phone.trim())data.phone=phone.trim();await change('create',data,null);}
  else if(form==='edit')await change('edit',{name:name.trim(),preferred});
  else if(form==='note')await change('interact',{text:note.trim(),visibility:'author'});
  else if(form==='schedule'||form==='reschedule'){
   const date=new Date(due);
   if(!due||!Number.isFinite(date.getTime())||date.getTime()<=Date.now()){setError('Choose a future date and time.');return;}
   await change(form,form==='schedule'?{target:workspace.memberId,due:date.toISOString(),text:note.trim()}:{target:taskId,due:date.toISOString()});
  }
 }
 const confirmThen=(message:string,action:()=>void)=>()=>{if(window.confirm(message))action();};
 const swipe=useSwipeTabs(tabs,view,selectTab);
 /** Left and Right arrows move between tabs, the usual keyboard pattern for a tab list. No wrap, like the swipe. */
 function tabKeys(event:KeyboardEvent<HTMLElement>){
  const step=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;if(!step)return;
  const next=tabs[Math.min(tabs.length-1,Math.max(0,tabs.indexOf(view)+step))];
  event.preventDefault();if(next===view)return;selectTab(next);document.getElementById('ct-tab-'+next)?.focus();
 }

 const owner=Boolean(detail&&workspace&&detail.ownerId===workspace.memberId);
 const cards=workspace?findLoadedContacts(workspace.contacts,workspace.memberId,filter,search):[];
 const counts=workspace?contactCounts(workspace.contacts,workspace.memberId):null;
 const followUpOpen=detail?['new','active'].includes(detail.lifecycle):false;
 const scheduled=detail?.followUps.filter(t=>t.state==='scheduled')??[];
 const pastFollowUps=detail?.followUps.filter(t=>t.state!=='scheduled')??[];
 const metrics:[string,number][]=[['Loaded contacts',counts?.loaded??0],['Open',counts?.open??0],['New',counts?.new??0],['Active',counts?.active??0],['Paused',counts?.paused??0],['Closed',counts?.closed??0],['Archived',counts?.archived??0]];
 const paneOpen=Boolean(workspace&&(detail||form));

 return <div className="ui-page ct-page">
  <AppHeader homeHref="/members">
   <div className="ct-header-actions">
    <button type="button" className="ui-button ui-button-quiet ct-header-button" onClick={()=>void load()} disabled={busy}>Reload</button>
    <button type="button" className="ui-button ui-button-quiet ct-header-button" onClick={()=>void openApps()} aria-haspopup="dialog"><Grid2X2/>Apps</button>
   </div>
  </AppHeader>
  <main className="ui-main ct-main">
   <div className="ct-intro" data-pane={paneOpen?'open':'closed'}>
    <p className="ui-kicker">Private to you</p>
    <h1 className="ui-title">Contacts</h1>
    <p className="ui-lede">One responsible person. A clear next step.</p>
   </div>
   {error&&<div className="ui-notice ct-notice" data-tone="danger" role="alert"><p>{error}</p><div className="ct-notice-actions"><button type="button" className="ui-button ui-button-secondary" onClick={()=>{pending.current=null;void load();}} disabled={busy}>Reload and review</button>{!workspace&&<a className="ui-link" href="/sign-in">Sign in</a>}</div></div>}
   {notice&&<p className="ui-notice" data-tone="success" role="status">{notice}</p>}
   {busy&&<p className="ct-loading" role="status">Loading your contacts…</p>}
   {!workspace&&!busy&&!error&&<p className="ui-empty">Sign in to use Contacts.</p>}

   {workspace&&<div className="ct-layout" data-pane={paneOpen?'open':'closed'}>
    <section className="ct-list-pane" aria-label="Contacts">
     <nav className="ui-tabs" role="tablist" aria-label="Contact views" onKeyDown={tabKeys}>
      {tabs.map(value=><button key={value} type="button" role="tab" id={'ct-tab-'+value} aria-controls="ct-tab-panel" aria-selected={view===value} tabIndex={view===value?0:-1} className="ui-tab" onClick={()=>selectTab(value)}>{tabNames[value]}</button>)}
     </nav>
     <div id="ct-tab-panel" role="tabpanel" aria-labelledby={'ct-tab-'+view} className="ct-tab-panel" {...swipe}>
      {view==='followup'?<>
       <h2 className="ui-section-title">Your assigned follow-ups</h2>
       <p className="ct-lead">{agenda.length?agenda.length+' private '+(agenda.length===1?'follow-up is':'follow-ups are')+' waiting.':'No follow-ups are assigned to you right now.'}</p>
       {agenda.length>0&&<ul className="ui-list">{agenda.map(item=><li key={item.id} className="ui-row"><span className="ui-row-body"><strong>{item.title}</strong><small>Private to Contacts</small></span></li>)}</ul>}
       <p className="ui-notice">To protect privacy this list never shows names, phone numbers or times. Open a contact to see its next step and date.</p>
       <button type="button" className="ui-button ui-button-secondary" onClick={()=>setView('mine')}>Go to my contacts</button>
      </>:view==='overview'?<>
       <h2 className="ui-section-title">Your contacts at a glance</h2>
       <ul className="ui-list">{metrics.map(([label,count])=><li key={label} className="ui-row ct-metric"><span className="ui-row-body">{label}</span><strong>{count}</strong></li>)}</ul>
       <p className="ct-hint">Counts cover the contacts loaded on this screen, never another member's records.{workspace.nextCursor?' More contacts exist: load them in My contacts to include them here.':''}</p>
       <button type="button" className="ui-button ui-button-secondary" onClick={()=>setView('mine')}>Go to my contacts</button>
      </>:<>
       <div className="ct-list-head">
        <h2 className="ui-section-title">Your contacts <span className="ct-count">{cards.length} shown</span></h2>
        {workspace.canCreate&&<button type="button" className="ui-button" disabled={busy} onClick={()=>edit('create')}>Add contact</button>}
       </div>
       <div className="ct-filters">
        <label htmlFor="contacts-search" className="ui-visually-hidden">Search loaded contact names</label>
        <input id="contacts-search" className="ui-input" type="search" maxLength={120} autoComplete="off" value={search} placeholder="Search names" onChange={e=>setSearch(e.target.value)}/>
        <label htmlFor="contacts-status" className="ui-visually-hidden">Show contacts by status</label>
        <select id="contacts-status" className="ui-input" value={filter} onChange={e=>setFilter(e.target.value as ContactFilter)}>
         {contactFilters.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
       </div>
       <p className="ct-hint">Search checks names loaded on this screen only, not phone numbers or notes.</p>
       {cards.length>0&&<ul className="ui-list">{cards.map(c=><li key={c.id}>
        <button type="button" className="ui-row ct-contact" aria-current={detail?.id===c.id?'true':undefined} onClick={()=>void open(c.id)} disabled={busy}>
         <span className="ui-row-body"><strong>{c.name}</strong><small><Status contact={c}/> · {nextStepLabel(c)}</small></span><ChevronRight className="ct-chevron"/>
        </button>
       </li>)}</ul>}
       {!cards.length&&<div className="ui-empty"><strong>No contacts match</strong>Change the search or status, or load more contacts.</div>}
       {workspace.nextCursor&&<button type="button" className="ui-button ui-button-secondary ct-more" disabled={busy} onClick={()=>void more()}>Load next 100 contacts</button>}
      </>}
     </div>
    </section>

    <section className="ct-record-pane" aria-label={form?formTitles[form]:detail?detail.name:'Contact record'}>
     {!detail&&!form&&<div className="ui-empty ct-pane-empty"><strong>Choose a contact</strong>Their next step, notes and history open here.</div>}

     {detail&&!form&&<article>
      <button type="button" className="ui-button ui-button-quiet ct-back" onClick={()=>void load()}><ChevronLeft/>Back to contacts</button>
      <h2 className="ui-title ct-record-title" ref={paneHeading} tabIndex={-1}>{detail.name}</h2>
      <p className="ct-record-meta"><Status contact={detail}/> · {owner?'You are responsible':'Shared access'}</p>

      <h3 className="ui-section-title">Next step</h3>
      {scheduled.map(t=><div key={t.id} className="ct-next">
       <div className="ui-row ct-timed"><When at={t.due}/><span className="ui-row-body"><strong>{t.action}</strong><small>Las Vegas time</small></span></div>
       {(owner||t.assignee===workspace?.memberId)&&!detail.archived&&<div className="ct-actions">
        <button type="button" className="ui-button" disabled={busy||detail.doNotContact||!followUpOpen} onClick={()=>void change('complete',{target:t.id})}>Mark done</button>
        <button type="button" className="ui-button ui-button-secondary" disabled={busy||detail.doNotContact} onClick={()=>edit('reschedule',t.id)}>Reschedule</button>
        <button type="button" className="ui-button ui-button-quiet" disabled={busy} onClick={confirmThen('Cancel this follow-up? Its history is kept.',()=>void change('cancel-followup',{target:t.id}))}>Cancel follow-up</button>
       </div>}
      </div>)}
      {!scheduled.length&&<p className="ct-quiet">No next step is scheduled.</p>}
      {!scheduled.length&&!detail.archived&&<button type="button" className="ui-button" disabled={busy||detail.doNotContact||!followUpOpen} onClick={()=>edit('schedule')}>Schedule follow-up</button>}

      <h3 className="ui-section-title">Contact information</h3>
      <ul className="ui-list">
       <li className="ui-row"><span className="ui-row-body"><small>Preferred method</small>{methodNames[detail.preferred]}</span></li>
       {detail.methods.map((m,i)=><li key={i} className="ui-row"><span className="ui-row-body"><small>{m.kind==='phone'?'Phone':'Email'}</small>{m.value}</span></li>)}
       {!detail.methods.length&&<li className="ui-row ct-quiet">No phone or email is available to you.</li>}
      </ul>
      {owner&&!detail.archived&&<button type="button" className="ui-button ui-button-quiet ct-inline" onClick={()=>edit('edit')}>Edit name or preferred method</button>}
      <p className="ct-hint">Contacts never calls or messages anyone.</p>

      <h3 className="ui-section-title">Private notes</h3>
      {detail.interactions.length>0&&<ul className="ui-list">{detail.interactions.map(i=><li key={i.id} className="ui-row ct-timed"><When at={i.at}/><span className="ui-row-body"><span className="ct-note">{i.text}</span><small>{i.visibility==='author'?'Only you can see this':'Shared log'}</small></span></li>)}</ul>}
      {!detail.interactions.length&&<p className="ct-quiet">No notes yet.</p>}
      {!detail.archived&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>edit('note')}>Add note</button>}

      {pastFollowUps.length>0&&<>
       <h3 className="ui-section-title">Earlier follow-ups</h3>
       <ul className="ui-list">{pastFollowUps.map(t=><li key={t.id} className="ui-row ct-timed"><When at={t.due}/><span className="ui-row-body"><strong>{t.action}</strong><small>{t.state==='completed'?'Done':'Cancelled'}{t.reason?' · '+t.reason.replaceAll('_',' '):''}</small></span></li>)}</ul>
      </>}

      {owner&&<section aria-label="Private duplicate review">
       <h3 className="ui-section-title">Possible duplicates</h3>
       <p className="ct-hint">Checks for similar names or phone numbers among contacts you can see. A match does not mean they are the same person. Records are never merged or shared automatically.</p>
       <button type="button" className="ui-button ui-button-secondary" disabled={busy||duplicatesLoading} onClick={()=>void showDuplicates()}>{duplicatesLoading?'Checking…':'Find possible matches'}</button>
       {duplicates&&<div role="status">{duplicates.length===0?<p className="ct-quiet">No similar contacts found.</p>:<ul className="ui-list">{duplicates.map(match=><li key={match.id} className="ui-row"><span className="ui-row-body"><strong>{match.name}</strong></span><button type="button" className="ui-button ui-button-quiet" onClick={()=>void open(match.id)}>Open</button></li>)}</ul>}</div>}
      </section>}

      {(owner||(!detail.archived&&!detail.doNotContact))&&<h3 className="ui-section-title">Record status</h3>}
      <div className="ct-actions">
       {owner&&(detail.archived?<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void change('restore',{})}>Restore as closed</button>:<>
        {!detail.doNotContact&&detail.lifecycle!=='active'&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void change('status',{lifecycle:'active'})}>Set active</button>}
        {followUpOpen&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void change('status',{lifecycle:'paused'})}>Pause</button>}
        {detail.lifecycle!=='closed'
         ?<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={confirmThen('Close this record and cancel pending follow-ups?',()=>void change('status',{lifecycle:'closed'}))}>Close record</button>
         :<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={confirmThen('Archive this closed record? Its history is kept.',()=>void change('archive',{}))}>Archive record</button>}
       </>)}
       {!detail.archived&&!detail.doNotContact&&<button type="button" className="ui-button ui-button-secondary ct-danger" disabled={busy} onClick={confirmThen('Record a do-not-contact request? This closes the record and cancels pending follow-ups.',()=>void change('dnc',{}))}>Do not contact</button>}
      </div>
     </article>}

     {form&&<form className="ui-surface ct-form" onSubmit={event=>void submit(event)}>
      <h2 className="ct-form-title" ref={paneHeading} tabIndex={-1}>{formTitles[form]}</h2>
      {(form==='create'||form==='edit')&&<>
       <label className="ui-field" htmlFor="live-name">Name<input id="live-name" className="ui-input" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="off"/></label>
       {form==='create'&&<label className="ui-field" htmlFor="live-phone">Phone (optional)<input id="live-phone" className="ui-input" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} autoComplete="off"/></label>}
       <label className="ui-field" htmlFor="live-method">Preferred way to reach them<select id="live-method" className="ui-input" value={preferred} onChange={e=>setPreferred(e.target.value as PreferredMethod)}>{preferredOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
       <p className="ui-hint">Record only details the person agreed to share. A preferred method is not permission to message them.</p>
      </>}
      {(form==='note'||form==='schedule')&&<label className="ui-field" htmlFor="live-note">{form==='note'?'Note (only you can see it)':'What is the next step?'}<textarea id="live-note" className="ui-input ct-textarea" value={note} onChange={e=>setNote(e.target.value)} required maxLength={form==='note'?500:160} autoComplete="off" rows={4}/></label>}
      {(form==='schedule'||form==='reschedule')&&<>
       <label className="ui-field" htmlFor="live-due">Date and time<input id="live-due" className="ui-input" type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} required/></label>
       <p className="ui-hint">Enter it in your own time zone. It is shown in Las Vegas time. New follow-ups are assigned to you.</p>
      </>}
      <div className="ct-actions">
       <button className="ui-button" type="submit" disabled={busy}>{busy?'Saving…':'Save'}</button>
       <button className="ui-button ui-button-secondary" type="button" disabled={busy} onClick={()=>{setForm(null);resetFields();pending.current=null;}}>Cancel</button>
      </div>
     </form>}
    </section>
   </div>}
  </main>

  <dialog ref={appsSheet} className="ui-sheet" aria-labelledby="ct-apps-title" onClose={()=>setApps(false)}>
   <div className="ui-sheet-body">
    <div className="ct-sheet-head"><h2 id="ct-apps-title">Your apps</h2><button type="button" className="ui-button ui-button-quiet ct-close" onClick={()=>setApps(false)} aria-label="Close your apps"><X/></button></div>
    {appsLoading&&<p className="ct-loading" role="status">Loading your apps…</p>}
    {appsError&&<p className="ui-notice" data-tone="danger" role="alert">{appsError}</p>}
    <ul className="ui-list">
     {authorizedApps.map(module=><li key={module.id}><a className="ui-row" href={module.route}><span className="ui-row-body"><strong>{module.name}</strong></span><ChevronRight className="ct-chevron"/></a></li>)}
     <li><a className="ui-row" href="/members"><span className="ui-row-body"><strong>LV Zion Home</strong></span><ChevronRight className="ct-chevron"/></a></li>
    </ul>
    {!appsLoading&&!appsError&&!authorizedApps.length&&<p className="ct-quiet">No other apps are assigned to you.</p>}
   </div>
  </dialog>
 </div>;
}
