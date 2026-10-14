'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import type {ContactsWorkspace,ContactDetail,ContactSummary,PreferredMethod} from '../../lib/contacts/server-contract';
import {contactCounts,findLoadedContacts} from '../../lib/contacts/presentation';
import type {ContactFilter} from '../../lib/contacts/presentation';
import {parseModuleFeed} from '../../lib/app-runtime';
import type {AuthorizedModule} from '../../lib/app-runtime';
import './preview.css';import './workspace-r2.css';import './live-workspace.css';

type View='mine'|'followup'|'overview';
type Form='create'|'edit'|'note'|'schedule'|'reschedule'|null;
type Packet={id:string;version:number;requestId:string;operation:string;data:Record<string,string|boolean>};
class RequestFailure extends Error {status:number;constructor(status:number){super(status===401?'Please sign in again.':status===403?'This record or action is no longer available.':status===409?'This record changed. Reload it and review before saving.':status===400?'Review the entered information and try again.':'The save result is uncertain. Retry this unchanged form to reuse its request ID, or reload the record before making another change.');this.status=status;}}
const format=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
const labels={new:'New',active:'Active',paused:'Paused',closed:'Closed'};

/** Authenticated data only. Not mounted by the fictional preview and has no simulated role controls. */
export default function ContactsLiveWorkspace(){
 const [workspace,setWorkspace]=useState<ContactsWorkspace|null>(null),[detail,setDetail]=useState<ContactDetail|null>(null),[view,setView]=useState<View>('mine'),[form,setForm]=useState<Form>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[apps,setApps]=useState(false),[filter,setFilter]=useState<ContactFilter>('open'),[search,setSearch]=useState('');
 const [authorizedApps,setAuthorizedApps]=useState<AuthorizedModule[]>([]),[appsError,setAppsError]=useState(''),[appsLoading,setAppsLoading]=useState(false);
 const [duplicates,setDuplicates]=useState<{id:string;name:string}[]|null>(null),[duplicatesLoading,setDuplicatesLoading]=useState(false);
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[preferred,setPreferred]=useState<PreferredMethod>('unknown'),[note,setNote]=useState(''),[due,setDue]=useState(''),[taskId,setTaskId]=useState('');
 const [agenda,setAgenda]=useState<{id:string;title:string;href:string;deliveryEnabled:boolean}[]>([]);
 const requests=useRef(new Set<AbortController>()),epoch=useRef(0),pending=useRef<Packet|null>(null),submitting=useRef(false);
 const clearPrivate=useCallback(()=>{epoch.current++;for(const request of requests.current)request.abort();requests.current.clear();setWorkspace(null);setDetail(null);setAgenda([]);setForm(null);setName('');setPhone('');setNote('');setDue('');setPreferred('unknown');setTaskId('');pending.current=null;setBusy(false);setApps(false);setAuthorizedApps([]);setDuplicates(null);},[]);
 const send=useCallback(async<T,>(endpoint:string,body:unknown):Promise<T>=>{
  const abort=new AbortController();requests.current.add(abort);
  try{const response=await fetch('/api/contacts/'+endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:abort.signal});if(!response.ok)throw new RequestFailure(response.status);return await response.json() as T;}
  finally{requests.current.delete(abort);}
 },[]);
 const failure=useCallback((e:unknown)=>{if(e instanceof DOMException&&e.name==='AbortError')return;if(e instanceof RequestFailure&&(e.status===401||e.status===403))clearPrivate();setError(e instanceof RequestFailure?e.message:'Contacts is unavailable. Reload before retrying a submitted change.');},[clearPrivate]);
 const load=useCallback(async()=>{const version=++epoch.current;setBusy(true);setError('');setDetail(null);setForm(null);pending.current=null;try{const value=await send<ContactsWorkspace>('workspace',{});if(epoch.current===version)setWorkspace(value);}catch(e){if(epoch.current===version){setWorkspace(null);failure(e);}}finally{if(epoch.current===version)setBusy(false);}},[send,failure]);
 useEffect(()=>{void load();const visibility=()=>{if(document.hidden)clearPrivate();else void load();};const online=()=>{if(!document.hidden)void load();};document.addEventListener('visibilitychange',visibility);window.addEventListener('online',online);return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',online);epoch.current++;for(const request of requests.current)request.abort();requests.current.clear();};},[load,clearPrivate]);
 async function open(id:string,preserveNotice=false){const version=++epoch.current;setBusy(true);setDetail(null);setDuplicates(null);setError('');if(!preserveNotice)setNotice('');setForm(null);pending.current=null;try{const value=await send<ContactDetail>('detail',{id});if(epoch.current===version){setDetail(value);document.querySelector('.ct-main')?.scrollTo({top:0});}}catch(e){if(epoch.current===version)failure(e);}finally{if(epoch.current===version)setBusy(false);}}
 async function more(){if(!workspace?.nextCursor||busy)return;const version=epoch.current;setBusy(true);try{const value=await send<ContactsWorkspace>('workspace',{after:workspace.nextCursor});if(epoch.current===version){if(value.memberId!==workspace.memberId){clearPrivate();throw new RequestFailure(401);}setWorkspace({...value,contacts:[...workspace.contacts,...value.contacts.filter(c=>!workspace.contacts.some(old=>old.id===c.id))]});}}catch(e){if(epoch.current===version)failure(e);}finally{if(epoch.current===version)setBusy(false);}}
 function edit(kind:Form,id=''){setError('');setNotice('');setForm(kind);setName(kind==='edit'?detail?.name??'':'');setPhone('');setPreferred(kind==='edit'?detail?.preferred??'unknown':'unknown');setNote('');setDue('');setTaskId(id);pending.current=null;}
 async function change(operation:string,data:Record<string,string|boolean>,record:ContactSummary|null=detail){
  if(submitting.current)return;submitting.current=true;const version=epoch.current;setBusy(true);setError('');setNotice('');
  const fingerprint=JSON.stringify({operation,data,id:record?.id??null,version:record?.version??0});
  if(!pending.current||JSON.stringify({operation:pending.current.operation,data:pending.current.data,id:record?.id??null,version:pending.current.version})!==fingerprint)pending.current={id:record?.id??crypto.randomUUID(),version:record?.version??0,requestId:crypto.randomUUID(),operation,data};
  const packet=pending.current;
  try{const receipt=await send<{id:string;version:number}>('command',packet);if(epoch.current!==version)return;pending.current=null;setForm(null);setName('');setPhone('');setNote('');setDue('');setNotice('Saved.');if(operation==='create'){setFilter('open');setSearch('');setView('mine');}if(operation==='archive'){setView('mine');setFilter('archived');}if(operation==='archive'||operation==='reassign'){await load();}else await open(receipt.id,true);}
  catch(e){if(epoch.current===version)failure(e);}finally{submitting.current=false;if(epoch.current===version)setBusy(false);}
 }
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!workspace||busy)return;
  if(form==='create'){const data:Record<string,string>={name:name.trim(),preferred};if(phone.trim())data.phone=phone.trim();await change('create',data,null);}
  else if(form==='edit')await change('edit',{name:name.trim(),preferred});
  else if(form==='note')await change('interact',{text:note.trim(),visibility:'author'});
  else if(form==='schedule'||form==='reschedule'){const date=new Date(due);if(!due||!Number.isFinite(date.getTime())||date.getTime()<=Date.now()){setError('Choose a future date and time.');return;}await change(form==='schedule'?'schedule':'reschedule',form==='schedule'?{target:workspace.memberId,due:date.toISOString(),text:note.trim()}:{target:taskId,due:date.toISOString()});}
 }
 async function showAgenda(){setView('followup');setDetail(null);setForm(null);setAgenda([]);setError('');const version=++epoch.current;setBusy(true);try{const value=await send<typeof agenda>('agenda',{});if(epoch.current===version)setAgenda(value);}catch(e){if(epoch.current===version)failure(e);}finally{if(epoch.current===version)setBusy(false);}}
 const owner=Boolean(detail&&workspace&&detail.ownerId===workspace.memberId);
 const cards=workspace?findLoadedContacts(workspace.contacts,workspace.memberId,filter,search):[];
 const counts=workspace?contactCounts(workspace.contacts,workspace.memberId):null;
 async function toggleApps(){
  if(apps){setApps(false);return;}
  setApps(true);setAppsLoading(true);setAppsError('');
  const controller=new AbortController();requests.current.add(controller);
  try{
   const r=await fetch('/api/members/experience',{credentials:'same-origin',cache:'no-store',signal:controller.signal,referrerPolicy:'no-referrer'});
   if(!r.ok)throw new Error('Unavailable');
   setAuthorizedApps(parseModuleFeed(await r.json()).modules);
  }catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setAppsError('App directory unavailable. Return Home to see your authorized apps.');}
  finally{requests.current.delete(controller);setAppsLoading(false);}
 }
 async function showDuplicates(){
  if(!detail)return;
  setDuplicatesLoading(true);setError('');
  const controllerVersion=epoch.current;
  try{const list=await send<{id:string;name:string}[]>('duplicates',{id:detail.id});if(epoch.current===controllerVersion)setDuplicates(list);}
  catch(e){if(epoch.current===controllerVersion)failure(e);}
  finally{if(epoch.current===controllerVersion)setDuplicatesLoading(false);}
 }
 return <div className="ct-stage"><div className="ct-shell"><header className="ct-top"><a className="ct-home-link" href="/members">‹ Home</a><span>LV ZION OFFICIAL</span><button className="ct-view" onClick={()=>void load()} disabled={busy}>Reload</button></header>
 <main className="ct-main"><div className="ct-intro"><p className="ct-eyebrow">PRIVATE CONTACT COORDINATION</p><h1>Contacts</h1><p className="ct-muted">One responsible person. A clear next step.</p></div>
 {error&&<div className="ct-error" role="alert"><p>{error}</p><button className="ct-secondary" onClick={()=>{pending.current=null;void load();}} disabled={busy}>Reload and review</button>{!workspace&&<a href="/sign-in">Sign in</a>}</div>}{notice&&<p className="ct-feedback" role="status">{notice}</p>}{busy&&<p className="ct-muted" role="status">Loading…</p>}
 {workspace&&!detail&&!form&&<>
 <nav className="ct-tabs" aria-label="Contact views">
  <button aria-pressed={view==='mine'} className={view==='mine'?'selected':''} onClick={()=>setView('mine')}>My Contacts</button>
  <button aria-pressed={view==='followup'} className={view==='followup'?'selected':''} onClick={()=>void showAgenda()}>Follow-Ups</button>
  <button aria-pressed={view==='overview'} className={view==='overview'?'selected':''} onClick={()=>setView('overview')}>Overview</button>
 </nav>
 {view==='followup'?<>
  <section className="ct-card ct-section">
   <p className="ct-eyebrow">PRIVATE ACTIVITY</p><h2>Your assigned follow-ups</h2>
   <p className="ct-muted">{agenda.length?agenda.length+' authorized '+(agenda.length===1?'activity is':'activities are')+' waiting.':'No active follow-ups are currently assigned to you.'}</p>
   <p className="ct-small">This shared activity projection intentionally contains no contact names, phone numbers or appointment details. Open a contact to review its next agreed action and due date.</p>
  </section>
  {agenda.map(item=><div className="ct-card ct-activity" key={item.id}><strong>{item.title}</strong><span>Private to Contacts</span></div>)}
  <button className="ct-secondary" onClick={()=>setView('mine')}>Review My Contacts</button>
 </>:view==='overview'?<>
  <section className="ct-card ct-section"><p className="ct-eyebrow">PERSONAL WORKSPACE</p><h2>Your private contact overview</h2>
   <p className="ct-muted">These counts describe contacts loaded in your current session, not another member's records.</p>
  </section>
  <div className="ct-metrics">
   {([['Loaded contacts',counts?.loaded??0],['Open',counts?.open??0],['New',counts?.new??0],['Active',counts?.active??0],['Paused',counts?.paused??0],['Closed',counts?.closed??0],['Archived',counts?.archived??0]] as [string,number][]).map(([label,count])=><div className="ct-card" key={label}><strong>{count}</strong><span>{label}</span></div>)}
  </div>
  {workspace.nextCursor&&<p className="ct-small">More contacts exist. Load additional pages in My Contacts to include them in these counts.</p>}
  <button className="ct-secondary" onClick={()=>setView('mine')}>Back to My Contacts</button>
 </>:<>
  <div className="ct-section-title"><h2>Your responsibility</h2><small>{cards.length} loaded results</small></div>
  <div className="ct-filters">
   <label htmlFor="contacts-search" className="ct-sr-only">Search loaded contact names</label>
   <input id="contacts-search" type="search" maxLength={120} autoComplete="off" value={search} placeholder="Search loaded names" onChange={e=>setSearch(e.target.value)}/>
   <label htmlFor="contacts-status" className="ct-sr-only">Contact status filter</label>
   <select id="contacts-status" value={filter} onChange={e=>setFilter(e.target.value as ContactFilter)}>
    <option value="open">Open</option><option value="new">New</option><option value="active">Active</option><option value="paused">Paused</option><option value="closed">Closed</option><option value="archived">Archived</option><option value="all">All</option>
   </select>
  </div>
  <p className="ct-small ct-search-explain">Search uses only names from your loaded, authorized records. Load more pages to search additional contacts. Phone numbers and notes are not searched here.</p>
  {cards.map(c=><button className="ct-card ct-contact" key={c.id} onClick={()=>void open(c.id)} disabled={busy}>
   <div className="ct-contact-top"><div><h3>{c.name}</h3><small>You are responsible</small></div>
    <span className={'ct-pill '+c.lifecycle}>{c.archived?'Archived':c.doNotContact?'Do not contact':labels[c.lifecycle]}</span>
   </div><div className="ct-next"><span>{c.archived?'History retained':c.lifecycle==='closed'?'No active outreach':'Open record & next step'}</span><span aria-hidden="true">›</span></div>
  </button>)}
  {!cards.length&&<section className="ct-empty"><h2>No matching loaded contacts</h2><p>Adjust your search or filter, or load the next page of private contacts.</p></section>}
  {workspace.nextCursor&&<button className="ct-secondary" disabled={busy} onClick={()=>void more()}>Load next 100 authorized contacts</button>}
  {workspace.canCreate&&<button className="ct-primary" disabled={busy} onClick={()=>edit('create')}>Add contact</button>}
 </>}
 </>}
 {detail&&!form&&<><button className="ct-back" onClick={()=>void load()}>‹ Back to contacts</button><div className="ct-detail-head"><h1>{detail.name}</h1><span className={'ct-pill '+detail.lifecycle}>{detail.archived?'Archived':detail.doNotContact?'Do not contact':labels[detail.lifecycle]}</span><p className="ct-muted">{owner?'You are responsible':'Shared access'}</p></div>
 <section className="ct-card ct-section"><h2>Contact information</h2><p className="ct-muted">Preferred method: {detail.preferred==='unknown'?'Not confirmed':detail.preferred}</p>{detail.methods.map((m,i)=><p key={i}>{m.value}</p>)}{!detail.methods.length&&<p className="ct-muted">No communication details available to you.</p>}{owner&&!detail.archived&&<button className="ct-text-button" onClick={()=>edit('edit')}>Edit details</button>}<p className="ct-small">No calls or messages are sent from Contacts.</p></section>
 <section className="ct-card ct-section"><h2>Next agreed action</h2>{detail.followUps.filter(t=>t.state==='scheduled').map(t=><div key={t.id}><h3>{t.action}</h3><p className="ct-muted">{format(t.due)} · Las Vegas</p>{(owner||t.assignee===workspace?.memberId)&&!detail.archived&&<><button className="ct-primary" disabled={busy||detail.doNotContact||!['new','active'].includes(detail.lifecycle)} onClick={()=>void change('complete',{target:t.id})}>Complete follow-up</button><div className="ct-inline-actions"><button className="ct-text-button" disabled={busy||detail.doNotContact} onClick={()=>edit('reschedule',t.id)}>Reschedule</button><button className="ct-text-button" disabled={busy} onClick={()=>{if(window.confirm('Cancel this action and retain its history?'))void change('cancel-followup',{target:t.id});}}>Cancel action</button></div></>}</div>)}{!detail.followUps.some(t=>t.state==='scheduled')&&!detail.archived&&<button className="ct-secondary" disabled={busy||detail.doNotContact||!['new','active'].includes(detail.lifecycle)} onClick={()=>edit('schedule')}>Schedule follow-up</button>}</section>
 <section className="ct-card ct-section"><h2>Interaction history</h2>{detail.interactions.map(i=><article className="ct-history" key={i.id}><small>{format(i.at)} · {i.visibility==='author'?'Author-only':'Collaboration log'}</small><p>{i.text}</p></article>)}{!detail.archived&&<button className="ct-secondary" disabled={busy} onClick={()=>edit('note')}>Add author-only note</button>}</section>
 {detail.followUps.some(t=>t.state!=='scheduled')&&<section className="ct-card ct-section"><h2>Follow-up history</h2>{detail.followUps.filter(t=>t.state!=='scheduled').map(t=><article className="ct-history" key={t.id}><strong>{t.state==='completed'?'Completed':'Cancelled'}</strong><p>{t.action}</p><small>{format(t.due)} · {t.reason?.replaceAll('_',' ')}</small></article>)}</section>}
 {owner&&<section className="ct-card ct-section" aria-label="Private duplicate review">
  <h2>Possible duplicates</h2><p className="ct-muted">Check for similar names or phone numbers among contacts you are authorized to see. A match does not mean the people are the same.</p>
  <button className="ct-secondary" disabled={busy||duplicatesLoading} onClick={()=>void showDuplicates()}>{duplicatesLoading?'Checking…':'Find possible matches'}</button>
  {duplicates&&<div role="status">{duplicates.length===0?<p className="ct-small">No similar records were found among your accessible contacts.</p>:duplicates.map(match=><div className="ct-share-row" key={match.id}><strong>{match.name}</strong><button className="ct-text-button" onClick={()=>void open(match.id)}>Review record</button></div>)}</div>}
  <p className="ct-small">Records are never automatically merged or shared.</p>
 </section>}
 {!detail.archived&&!detail.doNotContact&&<button className="ct-danger" disabled={busy} onClick={()=>{if(window.confirm('Record a do-not-contact request? This closes the record and cancels pending follow-ups.'))void change('dnc',{});}}>Record do-not-contact request</button>}
 {owner&&<section className="ct-card ct-section"><h2>Record status</h2>{detail.archived?<button className="ct-secondary" disabled={busy} onClick={()=>void change('restore',{})}>Restore as closed</button>:<>{!detail.doNotContact&&detail.lifecycle!=='active'&&<button className="ct-secondary" disabled={busy} onClick={()=>void change('status',{lifecycle:'active'})}>Set active</button>}{['new','active'].includes(detail.lifecycle)&&<button className="ct-secondary" disabled={busy} onClick={()=>void change('status',{lifecycle:'paused'})}>Pause follow-up</button>}{detail.lifecycle!=='closed'?<button className="ct-secondary" disabled={busy} onClick={()=>{if(window.confirm('Close this record and cancel pending follow-ups?'))void change('status',{lifecycle:'closed'});}}>Close record</button>:<button className="ct-secondary" disabled={busy} onClick={()=>{if(window.confirm('Archive this closed record while retaining history?'))void change('archive',{});}}>Archive record</button>}</>}</section>}
 </>}
 {form&&workspace&&<form className="ct-card ct-section ct-live-form" onSubmit={event=>void submit(event)}><h2>{form==='create'?'Add contact':form==='edit'?'Edit contact':form==='note'?'Author-only note':form==='reschedule'?'Reschedule follow-up':'Schedule follow-up'}</h2>
 {(form==='create'||form==='edit')&&<><label htmlFor="live-name">Name</label><input id="live-name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="off"/>{form==='create'&&<><label htmlFor="live-phone">Phone (optional)</label><input id="live-phone" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} autoComplete="off"/></>}<label htmlFor="live-method">Preferred communication</label><select id="live-method" value={preferred} onChange={e=>setPreferred(e.target.value as PreferredMethod)}><option value="unknown">Not confirmed</option><option value="text">Text</option><option value="phone">Phone</option><option value="email">Email</option></select><p className="ct-small">Record only relevant, agreed contact information. A preferred method does not authorize messaging.</p></>}
 {(form==='note'||form==='schedule')&&<><label htmlFor="live-note">{form==='note'?'Note':'Agreed next action'}</label><textarea id="live-note" value={note} onChange={e=>setNote(e.target.value)} required maxLength={form==='note'?500:160} autoComplete="off" rows={4}/></>}
 {(form==='schedule'||form==='reschedule')&&<><label htmlFor="live-due">Date and time on this device</label><input id="live-due" type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} required/><p className="ct-small">Uses your device time zone. Saved times are displayed in Las Vegas time. New follow-ups are assigned to you.</p></>}
 <button className="ct-primary" type="submit" disabled={busy}>{busy?'Saving…':'Save'}</button><button className="ct-secondary" type="button" disabled={busy} onClick={()=>{setForm(null);setNote('');setName('');setPhone('');pending.current=null;}}>Cancel</button></form>}
 {!workspace&&!busy&&!error&&<p className="ct-muted">Sign in to access Contacts.</p>}
 {apps&&<section className="ct-card ct-section" aria-label="Authorized LV Zion apps">
 <div className="ct-section-title"><h2>Your authorized apps</h2><button className="ct-text-button" onClick={()=>setApps(false)}>Close</button></div>
 {appsLoading&&<p className="ct-muted" role="status">Loading your app directory…</p>}
 {appsError&&<p className="ct-muted" role="alert">{appsError}</p>}
 {authorizedApps.map(module=><a key={module.id} className="ct-choice ct-app-link" href={module.route}>{module.name}<span aria-hidden="true">›</span></a>)}
 {!appsLoading&&!appsError&&!authorizedApps.length&&<p className="ct-muted">No additional apps are currently assigned.</p>}
 <a className="ct-choice ct-app-link" href="/members">LV Zion Home<span aria-hidden="true">›</span></a>
 </section>}
 </main><nav className="ct-platform" aria-label="LV Zion navigation"><a href="/members">Home</a><button className="ct-apps-button" onClick={()=>{void toggleApps();requestAnimationFrame(()=>document.querySelector('.ct-main')?.scrollTo({top:100000}));}}><span className="ct-apps-icon">Apps</span></button><a href="/members">My Week</a></nav>
 </div></div>;
}
