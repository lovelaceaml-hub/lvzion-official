'use client';
import {Fragment,useCallback,useEffect,useRef,useState} from 'react';
import type {FormEvent,ReactNode,Ref} from 'react';
import type {ContactsWorkspace,ContactDetail,ContactSummary,PreferredMethod} from '../../lib/contacts/server-contract';
import {contactCounts,contactFilters,dueTag,findLoadedContacts} from '../../lib/contacts/presentation';
import type {ContactFilter} from '../../lib/contacts/presentation';
import {FrameControls} from '../app-frame';
import {useSwipeTabs} from '../../lib/use-swipe-tabs';
import {CalendarDays,Check,ChevronLeft,ChevronRight,Clock3,FileText,Plus,Search,ShieldCheck,UsersRound} from '../home-icons';
import './contacts.css';

// Liquid Opal layout from the Theme Atlas (contacts-list, contacts-detail, contacts-followups, contacts-notes).
// Markup uses the ui- kit classes directly (no ui-kit import) so the isolated frame harness
// (scripts/test-app-frame-browser.mjs), which copies only this folder and a few shared files, still compiles.

type View='mine'|'followup'|'overview';
type Form='create'|'edit'|'schedule'|'reschedule'|null;
type Section='record'|'notes';
type Packet={id:string;version:number;requestId:string;operation:string;data:Record<string,string|boolean>};
type AgendaItem={id:string;title:string;href:string;deliveryEnabled:boolean};
type DuplicateMatch={id:string;name:string};
class RequestFailure extends Error {status:number;constructor(status:number){super(status===401?'Please sign in again.':status===403?'This record or action is no longer available.':status===409?'This record changed. Reload it and review before saving.':status===400?'Review the entered information and try again.':'The save result is uncertain. Retry this unchanged form to reuse its request ID, or reload the record before making another change.');this.status=status;}}
const zone='America/Los_Angeles';
const dayFormat=new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric'});
const timeFormat=new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'});
const labels={new:'New',active:'Active',paused:'Paused',closed:'Closed'};
const statusLabel=(c:ContactSummary)=>c.archived?'Archived':c.doNotContact?'Do not contact':labels[c.lifecycle];
const statusTone=(c:ContactSummary)=>c.doNotContact&&!c.archived?'danger':c.lifecycle==='paused'&&!c.archived?'warning':c.archived||c.lifecycle==='closed'?'muted':undefined;
/** The list row line: status and what to expect in the record. The summary carries no dates, so no due tag. */
const rowDetail=(c:ContactSummary)=>c.archived?'Archived · history retained':c.doNotContact?'No outreach':c.lifecycle==='closed'?'Closed · no active outreach':c.lifecycle==='paused'?'Paused · outreach on hold':c.lifecycle==='new'?'Next step in record':'Active · next step in record';
/** Only states that need attention get a tag in the list, like the Atlas "Today" tag. */
const rowTag=(c:ContactSummary)=>!c.archived&&(c.doNotContact||c.lifecycle==='new');
const formTitles={create:'Add contact',edit:'Edit contact',schedule:'Schedule follow-up',reschedule:'Reschedule follow-up'};
const preferredOptions:readonly [PreferredMethod,string][]=[['unknown','Not confirmed'],['text','Text'],['phone','Phone'],['email','Email']];
const methodNames={unknown:'Not confirmed',text:'Text',phone:'Phone',email:'Email'};
/** The status segments on My contacts. New, Active and Paused are reached from Overview. */
const segments:readonly [ContactFilter,string][]=[['open','Open'],['closed','Closed'],['archived','Archived'],['all','All']];
const filterNames=Object.fromEntries(contactFilters.map(f=>[f.value,f.label])) as Record<ContactFilter,string>;
const tabs:readonly View[]=['mine','followup','overview'];
const isAbort=(e:unknown)=>e instanceof DOMException&&e.name==='AbortError';
const initialsOf=(name:string)=>name.trim().split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();
const plural=(n:number,one:string,many=one+'s')=>n+' '+(n===1?one:many);

/** Date and time in Las Vegas time, in tabular figures. */
function When({at}:{at:string}){
 const date=new Date(at);
 return <time className="ct-when" dateTime={date.toISOString()}>{dayFormat.format(date)} · {timeFormat.format(date)}</time>;
}
function StatusTag({contact}:{contact:ContactSummary}){
 return <span className="ui-tag ct-status" data-tone={statusTone(contact)}>{statusLabel(contact)}</span>;
}
/** Eyebrow, large title and one sentence (the Atlas page heading). */
function Heading({eyebrow,title,lede,level=1,headingRef}:{eyebrow:ReactNode;title:ReactNode;lede?:ReactNode;level?:1|2;headingRef?:Ref<HTMLHeadingElement>}){
 const Tag=level===1?'h1':'h2';
 return <header className="ui-heading ct-heading"><p className="ui-eyebrow">{eyebrow}</p><Tag className="ui-title" ref={headingRef} tabIndex={headingRef?-1:undefined}>{title}</Tag>{lede?<p>{lede}</p>:null}</header>;
}
function Stat({label,value,note,onClick}:{label:string;value:ReactNode;note:string;onClick?:()=>void}){
 const inner=<><span>{label}</span><strong>{value}</strong><small>{note}</small></>;
 return onClick?<button type="button" className="ui-stat" onClick={onClick}>{inner}</button>:<div className="ui-stat">{inner}</div>;
}
function Empty({icon,title,children}:{icon:ReactNode;title:string;children?:ReactNode}){
 return <div className="ui-empty-state"><span className="ui-empty-icon" aria-hidden="true">{icon}</span><strong>{title}</strong>{children?<p>{children}</p>:null}</div>;
}
function Callout({title,children}:{title:string;children:ReactNode}){
 return <div className="ui-glass ct-callout"><ShieldCheck size={24}/><div><strong>{title}</strong><p>{children}</p></div></div>;
}
function Section({title,note,children}:{title:string;note?:ReactNode;children:ReactNode}){
 return <section className="ct-section" aria-label={title}><div className="ui-section-head"><h3>{title}</h3>{note?<span>{note}</span>:null}</div>{children}</section>;
}

/** Authenticated data only. Not mounted by the fictional preview and has no simulated role controls. */
export default function ContactsLiveWorkspace(){
 const [workspace,setWorkspace]=useState<ContactsWorkspace|null>(null),[detail,setDetail]=useState<ContactDetail|null>(null),[view,setView]=useState<View>('mine'),[form,setForm]=useState<Form>(null),[section,setSection]=useState<Section>('record');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[failureStatus,setFailureStatus]=useState(0),[notice,setNotice]=useState(''),[filter,setFilter]=useState<ContactFilter>('open'),[search,setSearch]=useState('');
 const [duplicates,setDuplicates]=useState<DuplicateMatch[]|null>(null),[duplicatesLoading,setDuplicatesLoading]=useState(false);
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[preferred,setPreferred]=useState<PreferredMethod>('unknown'),[note,setNote]=useState(''),[due,setDue]=useState(''),[taskId,setTaskId]=useState('');
 // null: not loaded (or unavailable). The agenda never carries names, phone numbers or times.
 const [agenda,setAgenda]=useState<AgendaItem[]|null>(null);
 // epoch invalidates every in-flight response once the view changes or private data is cleared.
 const requests=useRef(new Set<AbortController>()),epoch=useRef(0),pending=useRef<Packet|null>(null),submitting=useRef(false);
 const paneHeading=useRef<HTMLHeadingElement>(null);

 const abortAll=useCallback(()=>{epoch.current++;for(const request of requests.current)request.abort();requests.current.clear();},[]);
 const resetFields=useCallback(()=>{setName('');setPhone('');setNote('');setDue('');setPreferred('unknown');setTaskId('');},[]);
 const clearPrivate=useCallback(()=>{
  abortAll();setWorkspace(null);setDetail(null);setAgenda(null);setForm(null);resetFields();pending.current=null;
  setBusy(false);setDuplicates(null);
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
  setFailureStatus(e instanceof RequestFailure?e.status:0);
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
  const version=++epoch.current;setError('');setDetail(null);setForm(null);setSection('record');pending.current=null;
  let loaded=false;
  await track(version,()=>send<ContactsWorkspace>('workspace',{}),value=>{loaded=true;setWorkspace(value);},setBusy,()=>setWorkspace(null));
  if(!loaded||epoch.current!==version)return;
  // The follow-up count on the summary tiles. A failure here leaves the count unknown;
  // the Follow-ups view reports its own errors when opened.
  try{const items=await send<AgendaItem[]>('agenda',{});if(epoch.current===version)setAgenda(items);}
  catch{if(epoch.current===version)setAgenda(null);}
 },[send,track]);
 useEffect(()=>{
  void load();
  const visibility=()=>{if(document.hidden)clearPrivate();else void load();};
  const online=()=>{if(!document.hidden)void load();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('online',online);
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',online);abortAll();};
 },[load,clearPrivate,abortAll]);
 // Opening a record, its notes or a form moves focus to its heading, so keyboard and screen reader users land on it.
 useEffect(()=>{if(detail||form){paneHeading.current?.focus({preventScroll:true});if(window.matchMedia('(max-width: 899px)').matches)window.scrollTo({top:0});}},[detail?.id,form,section]);

 async function open(id:string,preserveNotice=false){
  const version=++epoch.current;setDetail(null);setDuplicates(null);setError('');if(!preserveNotice)setNotice('');setForm(null);pending.current=null;
  await track(version,()=>send<ContactDetail>('detail',{id}),setDetail);
 }
 function openRecord(id:string){setSection('record');void open(id);}
 async function more(){
  if(!workspace?.nextCursor||busy)return;
  await track(epoch.current,()=>send<ContactsWorkspace>('workspace',{after:workspace.nextCursor}),value=>{
   if(value.memberId!==workspace.memberId){clearPrivate();throw new RequestFailure(401);}
   setWorkspace({...value,contacts:[...workspace.contacts,...value.contacts.filter(c=>!workspace.contacts.some(old=>old.id===c.id))]});
  });
 }
 async function showAgenda(){
  setView('followup');setDetail(null);setForm(null);setAgenda(null);setError('');
  await track(++epoch.current,()=>send<AgendaItem[]>('agenda',{}),setAgenda);
 }
 /** An open record or form closes the way "Back to contacts" does: a fresh workspace read. */
 function selectTab(next:View){if(next==='followup')void showAgenda();else{setView(next);if(detail||form)void load();}}
 function showFilter(next:ContactFilter){setFilter(next);setView('mine');}
 async function showDuplicates(){
  if(!detail)return;
  setError('');
  await track(epoch.current,()=>send<DuplicateMatch[]>('duplicates',{id:detail.id}),setDuplicates,setDuplicatesLoading);
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
  else if(form==='schedule'||form==='reschedule'){
   const date=new Date(due);
   if(!due||!Number.isFinite(date.getTime())||date.getTime()<=Date.now()){setError('Choose a future date and time.');return;}
   await change(form,form==='schedule'?{target:workspace.memberId,due:date.toISOString(),text:note.trim()}:{target:taskId,due:date.toISOString()});
  }
 }
 /** The private note composer on the notes screen. Notes are author-only. */
 async function submitNote(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!workspace||!detail||busy)return;
  await change('interact',{text:note.trim(),visibility:'author'});
 }
 const confirmThen=(message:string,action:()=>void)=>()=>{if(window.confirm(message))action();};
 const swipe=useSwipeTabs(tabs,view,selectTab);

 const owner=Boolean(detail&&workspace&&detail.ownerId===workspace.memberId);
 const cards=workspace?findLoadedContacts(workspace.contacts,workspace.memberId,filter,search):[];
 const counts=workspace?contactCounts(workspace.contacts,workspace.memberId):null;
 const followUpOpen=detail?['new','active'].includes(detail.lifecycle):false;
 const scheduled=detail?.followUps.filter(t=>t.state==='scheduled')??[];
 const pastFollowUps=detail?.followUps.filter(t=>t.state!=='scheduled')??[];
 const metrics:[string,number,ContactFilter][]=[['Loaded contacts',counts?.loaded??0,'all'],['Open',counts?.open??0,'open'],['New',counts?.new??0,'new'],['Active',counts?.active??0,'active'],['Paused',counts?.paused??0,'paused'],['Closed',counts?.closed??0,'closed'],['Archived',counts?.archived??0,'archived']];
 const paneOpen=Boolean(workspace&&(detail||form));
 const scheduledCount=agenda?agenda.length:'–';
 const stageFilter=!segments.some(([value])=>value===filter);

 return <div className="ui-page ct-page">
  <FrameControls left={{label:'Contacts',icon:'people',onClick:()=>selectTab('mine'),active:view==='mine'&&!paneOpen,disabled:!workspace}} right={{label:'Follow-ups',icon:'clock',onClick:()=>selectTab('followup'),active:view==='followup'&&!paneOpen,disabled:!workspace}} more={[{label:'Overview',icon:'info',onClick:()=>selectTab('overview'),disabled:!workspace},{label:'Reload',icon:'clock',onClick:()=>void load(),disabled:busy}]}/>
  <main className="ui-main ct-main">
   {error&&<div className="ui-notice ct-notice" data-tone="danger" role="alert"><p>{!workspace&&failureStatus===403?'Contacts has not been assigned to your account.':error}</p><div className="ct-notice-actions"><button type="button" className="ui-button ui-button-secondary" onClick={()=>{pending.current=null;void load();}} disabled={busy}>Reload and review</button>{!workspace&&failureStatus===401&&<a className="ui-link" href="/sign-in">Sign in</a>}</div></div>}
   {notice&&<p className="ui-notice" data-tone="success" role="status">{notice}</p>}
   {busy&&<p className="ct-loading" role="status">Loading your contacts…</p>}
   {!workspace&&!busy&&!error&&<><Heading eyebrow="Your private workspace" title="Contacts"/><Empty icon={<UsersRound/>} title="Sign in to use Contacts.">Your contacts are private to you.</Empty></>}

   {workspace&&<div className="ct-layout" data-pane={paneOpen?'open':'closed'}>
    <section className="ct-list-pane" aria-label="Contacts" {...swipe}>
     {view==='followup'?<>
      <Heading eyebrow="One clear next step" title="Follow-ups" lede="Your private next-step overview."/>
      <div className="ui-stats ct-stats" role="group" aria-label="Follow-up counts">
       <Stat label="Scheduled" value={scheduledCount} note="Assigned to you"/>
       <Stat label="Open contacts" value={counts?.open??0} note="Loaded on this screen" onClick={()=>showFilter('open')}/>
      </div>
      <div className="ui-section-head"><h2>Your assigned follow-ups</h2>{agenda?<span>{agenda.length?plural(agenda.length,'waiting','waiting'):'None waiting'}</span>:null}</div>
      {agenda&&agenda.length>0&&<div className="ui-glass ct-card"><ul className="ui-list">{agenda.map((item,index)=><li key={item.id} className="ui-row">
       <span className="ui-icon-box" aria-hidden="true"><Clock3 size={22}/></span>
       <span className="ui-row-body"><strong>{item.title}</strong><small>Private to Contacts</small></span>
       {index===0&&<span className="ui-tag">Next</span>}
      </li>)}</ul></div>}
      {agenda&&!agenda.length&&<div className="ui-glass ct-card"><Empty icon={<Clock3/>} title="No follow-ups right now">No follow-ups are assigned to you right now.</Empty></div>}
      <Callout title="Private by design">To protect privacy this list never shows names, phone numbers or times. Open a contact to see its next step and date.</Callout>
      <button type="button" className="ui-button ui-button-secondary ct-block" onClick={()=>selectTab('mine')}>Go to my contacts</button>
     </>:view==='overview'?<>
      <Heading eyebrow="Your private workspace" title="Overview" lede="Your contacts by status. Choose one to see those contacts."/>
      <div className="ui-stats ct-stats" role="group" aria-label="Contact counts">
       <Stat label="Open" value={counts?.open??0} note="New, active or paused" onClick={()=>showFilter('open')}/>
       <Stat label="Follow-ups" value={scheduledCount} note="Scheduled for you" onClick={()=>void showAgenda()}/>
      </div>
      <div className="ui-section-head"><h2>Your contacts at a glance</h2></div>
      <div className="ui-glass ct-card"><ul className="ui-list">{metrics.map(([label,count,value])=><li key={label}>
       <button type="button" className="ui-row ct-metric" onClick={()=>showFilter(value)}><span className="ui-icon-box ct-metric-count">{count}</span><span className="ui-row-body"><strong>{label}</strong></span><ChevronRight size={18}/></button>
      </li>)}</ul></div>
      <p className="ct-legend">Counts cover the contacts loaded on this screen, never another member's records.{workspace.nextCursor?' More contacts exist: load them in My contacts to include them here.':''}</p>
      <button type="button" className="ui-button ui-button-secondary ct-block" onClick={()=>selectTab('mine')}>Go to my contacts</button>
     </>:<>
      <Heading eyebrow="Your private workspace" title="My contacts" lede="One responsible person. A clear next step."/>
      <label className="ui-search ct-search"><Search size={20}/><span className="ui-visually-hidden">Search loaded contact names</span><input id="contacts-search" type="search" maxLength={120} autoComplete="off" value={search} placeholder="Search names" onChange={e=>setSearch(e.target.value)}/></label>
      <div className="ui-stats ct-stats" role="group" aria-label="Contact counts">
       <Stat label="Open" value={counts?.open??0} note="Loaded records" onClick={()=>selectTab('overview')}/>
       <Stat label="Follow-ups" value={scheduledCount} note="Scheduled next steps" onClick={()=>void showAgenda()}/>
      </div>
      <div className="ui-segmented ct-segments" role="group" aria-label="Show contacts by status">
       {segments.map(([value,label])=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}
      </div>
      {stageFilter&&<p className="ct-filter-note">Showing {filterNames[filter]} contacts only. <button type="button" className="ui-text-action" onClick={()=>setFilter('open')}>Show all open</button></p>}
      <h2 className="ui-visually-hidden">Your contacts</h2>
      {cards.length>0&&<div className="ui-glass ct-card"><ul className="ui-list">{cards.map(c=><li key={c.id}>
       <button type="button" className="ui-row ct-contact" aria-current={detail?.id===c.id?'true':undefined} onClick={()=>openRecord(c.id)} disabled={busy}>
        <span className="ui-icon-box" aria-hidden="true">{initialsOf(c.name)}</span>
        <span className="ui-row-body"><strong>{c.name}</strong><small>{rowDetail(c)}</small></span>
        {rowTag(c)&&<StatusTag contact={c}/>}<ChevronRight size={18}/>
       </button>
      </li>)}</ul></div>}
      {!cards.length&&<div className="ui-glass ct-card">{workspace.contacts.length||workspace.nextCursor
       ?<Empty icon={<Search/>} title="No contacts match">Change the search or status, or load more contacts.</Empty>
       :<Empty icon={<UsersRound/>} title="No contacts yet">People you add appear here with their next step.</Empty>}</div>}
      {workspace.canCreate&&<button type="button" className="ui-button ct-block ct-add" disabled={busy} onClick={()=>edit('create')}>Add contact<Plus size={22}/></button>}
      {workspace.nextCursor&&<button type="button" className="ui-button ui-button-secondary ct-block" disabled={busy} onClick={()=>void more()}>Load next 100 contacts</button>}
      <p className="ct-legend">{plural(cards.length,'contact')} shown. Search checks names loaded on this screen only, not phone numbers or notes.</p>
     </>}
    </section>

    <section className="ct-record-pane" aria-label={form?formTitles[form]:detail?(section==='notes'?'Private notes':detail.name):'Contact record'}>
     {!detail&&!form&&<div className="ct-pane-empty"><Empty icon={<UsersRound/>} title="Choose a contact">Their next step, notes and history open here.</Empty></div>}

     {detail&&!form&&section==='record'&&<article>
      <button type="button" className="ui-button ui-button-quiet ct-back" onClick={()=>void load()}><ChevronLeft/>Back to contacts</button>
      <Heading level={2} headingRef={paneHeading} eyebrow="Private contact" title={detail.name} lede={owner?'You are responsible for this contact.':'Shared access to this contact.'}/>

      <div className="ui-glass ct-profile">
       <div className="ct-profile-top">
        <span className="ct-avatar" aria-hidden="true">{initialsOf(detail.name)}</span>
        <strong className="ct-profile-name">{detail.name}</strong>
        <StatusTag contact={detail}/>
       </div>
       <h3 className="ui-visually-hidden">Contact information</h3>
       <dl className="ui-pairs">
        <dt>Preferred</dt><dd>{methodNames[detail.preferred]}</dd>
        {detail.methods.map((m,i)=><Fragment key={i}><dt>{m.kind==='phone'?'Phone':'Email'}</dt><dd>{m.value}</dd></Fragment>)}
        {!detail.methods.length&&<><dt>Phone or email</dt><dd>Not available to you</dd></>}
        <dt>Responsible</dt><dd>{owner?'You':'Shared access'}</dd>
       </dl>
       {owner&&!detail.archived&&<button type="button" className="ui-button ui-button-quiet ct-inline" onClick={()=>edit('edit')}>Edit name or preferred method</button>}
      </div>
      <p className="ct-legend">Contacts never calls or messages anyone.</p>

      <Section title="Next step">
       <div className="ui-glass ct-card">
        {scheduled.map(t=>{const tag=dueTag(t.due);return <div key={t.id} className="ct-next">
         <div className="ui-row"><span className="ui-icon-box" aria-hidden="true"><CalendarDays size={22}/></span><span className="ui-row-body"><strong>{t.action}</strong><small><When at={t.due}/> · Las Vegas time</small></span>{tag&&<span className="ui-tag" data-tone={tag==='Overdue'?'warning':undefined}>{tag}</span>}</div>
         {(owner||t.assignee===workspace?.memberId)&&!detail.archived&&<div className="ct-actions">
          <button type="button" className="ui-button ui-button-secondary" disabled={busy||detail.doNotContact||!followUpOpen} onClick={()=>void change('complete',{target:t.id})}>Mark done<Check size={20}/></button>
          <button type="button" className="ui-button ui-button-secondary" disabled={busy||detail.doNotContact} onClick={()=>edit('reschedule',t.id)}>Reschedule</button>
          <button type="button" className="ui-button ui-button-quiet" disabled={busy} onClick={confirmThen('Cancel this follow-up? Its history is kept.',()=>void change('cancel-followup',{target:t.id}))}>Cancel follow-up</button>
         </div>}
        </div>;})}
        {!scheduled.length&&<div className="ui-row ct-next-empty"><span className="ui-icon-box" aria-hidden="true"><CalendarDays size={22}/></span><span className="ui-row-body"><strong>No next step is scheduled.</strong><small>{detail.archived?'Archived records keep their history.':followUpOpen&&!detail.doNotContact?'Schedule one so it stays in view.':'Follow-ups are for new or active contacts.'}</small></span></div>}
        {!scheduled.length&&!detail.archived&&<div className="ct-actions"><button type="button" className="ui-button" disabled={busy||detail.doNotContact||!followUpOpen} onClick={()=>edit('schedule')}>Schedule follow-up<Plus size={20}/></button></div>}
       </div>
      </Section>

      <div className="ui-glass ct-card ct-links"><ul className="ui-list">
       <li><button type="button" className="ui-row" onClick={()=>setSection('notes')}><span className="ui-icon-box" aria-hidden="true"><FileText size={22}/></span><span className="ui-row-body"><strong>Private notes</strong><small>{detail.interactions.length?plural(detail.interactions.length,'note'):'No notes yet'}</small></span><ChevronRight size={18}/></button></li>
      </ul></div>

      {pastFollowUps.length>0&&<Section title="Earlier follow-ups">
       <div className="ui-glass ct-card"><ul className="ui-list">{pastFollowUps.map(t=><li key={t.id} className="ui-row"><span className="ui-icon-box" aria-hidden="true">{t.state==='completed'?<Check size={22}/>:<Clock3 size={22}/>}</span><span className="ui-row-body"><strong>{t.action}</strong><small><When at={t.due}/> · {t.state==='completed'?'Done':'Cancelled'}{t.reason?' · '+t.reason.replaceAll('_',' '):''}</small></span></li>)}</ul></div>
      </Section>}

      {owner&&<section className="ct-section" aria-label="Private duplicate review">
       <div className="ui-section-head"><h3>Possible duplicates</h3></div>
       <div className="ui-glass ct-panel">
        <p className="ct-panel-text">Checks for similar names or phone numbers among contacts you can see. A match does not mean they are the same person. Records are never merged or shared automatically.</p>
        <button type="button" className="ui-button ui-button-secondary ct-block" disabled={busy||duplicatesLoading} onClick={()=>void showDuplicates()}>{duplicatesLoading?'Checking…':'Find possible matches'}</button>
        {duplicates&&<div role="status">{duplicates.length===0?<p className="ct-panel-text ct-panel-result">No similar contacts found.</p>:<ul className="ui-list ct-panel-result">{duplicates.map(match=><li key={match.id} className="ui-row"><span className="ui-icon-box" aria-hidden="true">{initialsOf(match.name)}</span><span className="ui-row-body"><strong>{match.name}</strong></span><button type="button" className="ui-button ui-button-quiet" onClick={()=>openRecord(match.id)}>Open</button></li>)}</ul>}</div>}
       </div>
      </section>}

      {(owner||(!detail.archived&&!detail.doNotContact))&&<Section title="Record status">
       <div className="ui-glass ct-panel"><div className="ct-actions ct-status-actions">
        {owner&&(detail.archived?<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void change('restore',{})}>Restore as closed</button>:<>
         {!detail.doNotContact&&detail.lifecycle!=='active'&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void change('status',{lifecycle:'active'})}>Set active</button>}
         {followUpOpen&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void change('status',{lifecycle:'paused'})}>Pause</button>}
         {detail.lifecycle!=='closed'
          ?<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={confirmThen('Close this record and cancel pending follow-ups?',()=>void change('status',{lifecycle:'closed'}))}>Close record</button>
          :<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={confirmThen('Archive this closed record? Its history is kept.',()=>void change('archive',{}))}>Archive record</button>}
        </>)}
        {!detail.archived&&!detail.doNotContact&&<button type="button" className="ui-button ui-button-secondary ct-danger" disabled={busy} onClick={confirmThen('Record a do-not-contact request? This closes the record and cancels pending follow-ups.',()=>void change('dnc',{}))}>Do not contact</button>}
       </div></div>
      </Section>}
     </article>}

     {detail&&!form&&section==='notes'&&<article>
      <button type="button" className="ui-button ui-button-quiet ct-back ct-back-always" onClick={()=>setSection('record')}><ChevronLeft/>Back to {detail.name}</button>
      <Heading level={2} headingRef={paneHeading} eyebrow={detail.name} title="Private notes" lede="Notes you add here are visible only to you."/>
      {!detail.archived&&<form className="ui-glass ct-composer" onSubmit={event=>void submitNote(event)}>
       <label className="ui-field" htmlFor="live-note">Add a note (only you can see it)<textarea id="live-note" className="ui-input ct-textarea" value={note} onChange={e=>setNote(e.target.value)} required maxLength={500} autoComplete="off" rows={4} placeholder="Write a short note for your own reference"/></label>
       <button className="ui-button ct-block" type="submit" disabled={busy}>{busy?'Saving…':'Save note'}<Plus size={22}/></button>
      </form>}
      {detail.archived&&<p className="ct-legend">This record is archived. Its notes are kept and no new notes can be added.</p>}
      <Section title="Note history" note={detail.interactions.length?plural(detail.interactions.length,'note'):undefined}>
       {detail.interactions.length>0?<ul className="ct-notes">{detail.interactions.map(i=><li key={i.id} className="ui-glass ct-note-card">
        <p className="ui-eyebrow"><When at={i.at}/></p>
        <p className="ct-note">{i.text}</p>
        <p className="ct-note-foot">{i.visibility==='author'?'Only you can see this':'Shared log'}</p>
       </li>)}</ul>:<div className="ui-glass ct-card"><Empty icon={<FileText/>} title="No notes yet">Notes you add appear here.</Empty></div>}
      </Section>
      <Callout title="Private by design">Notes are never shared, exported or sent from Contacts. Existing notes cannot be rewritten.</Callout>
     </article>}

     {form&&<form className="ct-form" onSubmit={event=>void submit(event)}>
      <Heading level={2} headingRef={paneHeading} eyebrow={form==='create'?'Your private workspace':detail?.name??'Contacts'} title={formTitles[form]}/>
      <div className="ui-glass ct-form-card">
       {(form==='create'||form==='edit')&&<>
        <label className="ui-field" htmlFor="live-name">Name<input id="live-name" className="ui-input" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="off"/></label>
        {form==='create'&&<label className="ui-field" htmlFor="live-phone">Phone (optional)<input id="live-phone" className="ui-input" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} autoComplete="off"/></label>}
        <label className="ui-field" htmlFor="live-method">Preferred way to reach them<select id="live-method" className="ui-input" value={preferred} onChange={e=>setPreferred(e.target.value as PreferredMethod)}>{preferredOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <p className="ui-hint">Record only details the person agreed to share. A preferred method is not permission to message them.</p>
       </>}
       {form==='schedule'&&<label className="ui-field" htmlFor="live-step">What is the next step?<textarea id="live-step" className="ui-input ct-textarea" value={note} onChange={e=>setNote(e.target.value)} required maxLength={160} autoComplete="off" rows={3}/></label>}
       {(form==='schedule'||form==='reschedule')&&<>
        <label className="ui-field" htmlFor="live-due">Date and time<input id="live-due" className="ui-input" type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} required/></label>
        <p className="ui-hint">Enter it in your own time zone. It is shown in Las Vegas time. New follow-ups are assigned to you.</p>
       </>}
       <div className="ct-form-actions">
        <button className="ui-button" type="submit" disabled={busy}>{busy?'Saving…':'Save'}</button>
        <button className="ui-button ui-button-secondary" type="button" disabled={busy} onClick={()=>{setForm(null);resetFields();pending.current=null;}}>Cancel</button>
       </div>
      </div>
     </form>}
    </section>
   </div>}
  </main>
 </div>;
}
