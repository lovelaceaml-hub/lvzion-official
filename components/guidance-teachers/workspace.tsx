'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {FrameControls} from '../app-frame';
import {LOCATIONS,addDays,formatDate,formatTime,isFuture,parseCandidates,parseCommand,parseWorkspace,today,type Candidate,type Service,type Slot,type Workspace} from '../../lib/guidance-teachers/domain';
import './guidance-teachers.css';

type IconName='calendar'|'people'|'person'|'sun'|'moon'|'building'|'search'|'left'|'right'|'plus'|'close'|'check'|'refresh'|'edit';
function Icon({name,size=20}:{name:IconName;size?:number}){
 const shapes:Record<IconName,ReactNode>={
  calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m3 0h2m3 0h1M7 18h2"/></>,
  people:<><circle cx="9" cy="8" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2zm14-16a3 3 0 0 1 0 6m2 4a6 6 0 0 1 4 6"/></>,
  person:<><circle cx="12" cy="8" r="3.5"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/></>,
  sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  moon:<path d="M20.8 14A9 9 0 0 1 10 3.2 9 9 0 1 0 20.8 14Z"/>,
  building:<><path d="M3 21h18M5 21V5l7-3 7 3v16M9 21v-5h6v5M9 7h.01M15 7h.01M9 11h.01M15 11h.01"/></>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  left:<path d="m15 5-7 7 7 7"/>,right:<path d="m9 5 7 7-7 7"/>,plus:<path d="M12 5v14M5 12h14"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,
  check:<path d="m5 12 4 4L19 6"/>,refresh:<><path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5"/></>,edit:<><path d="m14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();}
async function readJSON(response:Response){
 let data:unknown;try{data=await response.json();}catch{throw Error('The server response could not be read. Refresh and try again.');}
 if(!response.ok){const p=data as {error?:unknown};throw Error(typeof p?.error==='string'?p.error:'The request could not be completed.');}
 return data;
}
function Sheet({title,subtitle,children,busy=false,onClose}:{title:string;subtitle?:string;children:ReactNode;busy?:boolean;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=ref.current;node?.showModal();return()=>node?.close();},[]);
 return <dialog ref={ref} className="gt-sheet" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
  <div className="gt-sheet-handle" aria-hidden="true"/><header className="gt-sheet-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="gt-icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><Icon name="close"/></button></header>{children}
 </dialog>;
}
type Save=(input:Record<string,unknown>)=>Promise<void>;
function AssignmentPicker({service,slot,onSave,onClose,busy}:{service:Service;slot:Slot;onSave:Save;onClose:()=>void;busy:boolean}){
 const [query,setQuery]=useState(''),[members,setMembers]=useState<Candidate[]|null>(null),[hasMore,setHasMore]=useState(false),[error,setError]=useState('');
 const [selected,setSelected]=useState<{id:string;name:string}|null>(slot.memberId?{id:slot.memberId,name:slot.name??''}:null),[removing,setRemoving]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();setMembers(null);setError('');
  const timer=setTimeout(()=>{void(async()=>{try{
   const response=await fetch('/api/guidance-teachers?'+new URLSearchParams({kind:'candidates',serviceId:service.id,q:query}),{cache:'no-store',signal:controller.signal});
   const data=parseCandidates(await readJSON(response));if(data.serviceId!==service.id)throw Error('The service has changed. Close this window and refresh.');
   if(!controller.signal.aborted){setMembers(data.members);setHasMore(data.hasMore);}
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load members.');}})();},200);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,service.id]);
 async function save(memberId:string|null){setError('');try{await onSave({op:'assign',serviceId:service.id,expectedVersion:service.version,location:slot.location,position:slot.position,memberId});}catch(e){setError(e instanceof Error?e.message:'Save could not be confirmed.');}}
 return <Sheet title="Select member" subtitle={`${LOCATIONS.find(l=>l.id===slot.location)?.name} · Teacher ${slot.position}`} busy={busy} onClose={onClose}>
  <p className="gt-context">{service.title} · {formatDate(service.date,{month:'short',day:'numeric'})} · {formatTime(service.startTime)}</p>
  <label className="gt-search"><Icon name="search"/><span className="gt-sr">Search members by name</span><input type="search" placeholder="Search members…" autoComplete="off" maxLength={80} value={query} disabled={busy} onChange={e=>setQuery(e.target.value)}/></label>
  {error&&<p className="gt-error" role="alert">{error}</p>}
  {members===null&&!error?<p className="gt-hint" role="status">Loading members…</p>:null}
  <div className="gt-member-list" role="radiogroup" aria-label="Guidance Teacher">
   {members?.map(member=>{const blocked=member.unavailable&&member.id!==slot.memberId;return <button type="button" role="radio" aria-checked={!removing&&selected?.id===member.id} className="gt-member" disabled={busy||blocked} key={member.id} onClick={()=>{setSelected(member);setRemoving(false);}}>
    <span className="gt-initials">{initials(member.name)}</span><span className="gt-member-name"><strong>{member.name}</strong>{blocked&&<small>Already assigned at this time</small>}</span><span className="gt-radio">{!removing&&selected?.id===member.id&&<Icon name="check" size={14}/>}</span>
   </button>;})}
  </div>
  {members?.length===0&&!error&&<p className="gt-hint">No matching active members.</p>}
  {hasMore&&<p className="gt-hint">Showing the first 50 matches. Type a name to narrow the list.</p>}
  <footer className="gt-sheet-footer">
   {removing?<><p>Remove {slot.name} from this slot?</p><button className="gt-button gt-danger" disabled={busy} onClick={()=>void save(null)}>{busy?'Saving…':'Confirm removal'}</button><button className="gt-text-button" disabled={busy} onClick={()=>setRemoving(false)}>Keep assignment</button></>:<>
    <button className="gt-button" disabled={busy||!selected||selected.id===slot.memberId} onClick={()=>selected&&void save(selected.id)}>{busy?'Saving…':selected?`Assign ${selected.name.split(' ')[0]}`:'Select a member'}</button>
    {slot.memberId&&<button className="gt-text-button gt-danger-text" disabled={busy} onClick={()=>setRemoving(true)}>Remove assignment</button>}
   </>}
  </footer>
 </Sheet>;
}
function ServiceEditor({service,date,onSave,onClose,busy}:{service?:Service;date:string;onSave:Save;onClose:()=>void;busy:boolean}){
 const [title,setTitle]=useState(service?.title??''),[day,setDay]=useState(service?.date??date),[start,setStart]=useState(service?.startTime??''),[end,setEnd]=useState(service?.endTime??''),[error,setError]=useState(''),[cancelling,setCancelling]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setError('');try{await onSave({op:service?'edit':'create',title,date:day,startTime:start,endTime:end,...(service?{serviceId:service.id,expectedVersion:service.version}:{})});}catch(e){setError(e instanceof Error?e.message:'Save could not be confirmed.');}}
 async function cancelService(){if(!service)return;setError('');try{await onSave({op:'cancel',serviceId:service.id,expectedVersion:service.version});}catch(e){setError(e instanceof Error?e.message:'Cancellation could not be confirmed.');}}
 return <Sheet title={service?'Edit service':'Add worship service'} subtitle="Two sanctuaries · Two teachers in each" busy={busy} onClose={onClose}>
  {error&&<p className="gt-error" role="alert">{error}</p>}
  {cancelling?<div className="gt-cancel-confirm"><h3>Cancel this service?</h3><p>It will leave the active schedule. Its assignments and history will be retained.</p><button className="gt-button gt-danger" disabled={busy} onClick={()=>void cancelService()}>{busy?'Cancelling…':'Confirm cancellation'}</button><button className="gt-text-button" disabled={busy} onClick={()=>setCancelling(false)}>Keep service</button></div>:<form onSubmit={e=>void submit(e)}>
   <label className="gt-field">Service name<input required minLength={2} maxLength={80} value={title} disabled={busy} placeholder="Enter service name" onChange={e=>setTitle(e.target.value)}/></label>
   <label className="gt-field">Date<input required type="date" min={today()} value={day} disabled={busy} onChange={e=>setDay(e.target.value)}/></label>
   <div className="gt-time-fields"><label className="gt-field">Start time<input required type="time" value={start} disabled={busy} onChange={e=>setStart(e.target.value)}/></label><label className="gt-field">End time<input required type="time" value={end} disabled={busy} onChange={e=>setEnd(e.target.value)}/></label></div>
   <p className="gt-hint">All times are Las Vegas time. The end time must be later on the same day.</p>
   <footer className="gt-sheet-footer"><button type="submit" className="gt-button" disabled={busy}>{busy?'Saving…':service?'Save changes':'Create service'}</button>{service&&<button type="button" className="gt-text-button gt-danger-text" disabled={busy} onClick={()=>setCancelling(true)}>Cancel this service</button>}</footer>
  </form>}
 </Sheet>;
}
type Modal={kind:'assign';service:Service;slot:Slot}|{kind:'edit';service:Service}|{kind:'create'}|null;
export default function GuidanceWorkspace(){
 const [date,setDate]=useState(()=>today()),[anchor,setAnchor]=useState(()=>today()),[data,setData]=useState<Workspace|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [mode,setMode]=useState<'schedule'|'mine'|'manage'>('schedule'),[modal,setModal]=useState<Modal>(null),[busy,setBusy]=useState(false);
 const sequence=useRef(0),activeRead=useRef<AbortController|null>(null),busyRef=useRef(false),attempt=useRef<{signature:string;id:string}|null>(null);
 const load=useCallback(async()=>{
  activeRead.current?.abort();const controller=new AbortController();activeRead.current=controller;const current=++sequence.current;
  setLoading(true);setError('');
  try{
   const response=await fetch('/api/guidance-teachers?'+new URLSearchParams({date}),{cache:'no-store',signal:controller.signal});
   const workspace=parseWorkspace(await readJSON(response));if(workspace.date!==date)throw Error('The schedule returned the wrong date. Please refresh.');
   if(current===sequence.current){setData(workspace);if(!workspace.canManage)setMode(m=>m==='manage'?'schedule':m);}
   return true;
  }catch(e){if(!controller.signal.aborted&&current===sequence.current){setData(null);setError(e instanceof Error?e.message:'Unable to load the schedule.');}return false;}
  finally{if(current===sequence.current)setLoading(false);}
 },[date]);
 useEffect(()=>{void load();const refresh=()=>{if(document.visibilityState==='visible'&&!busyRef.current)void load();};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{activeRead.current?.abort();++sequence.current;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[load]);
 const current=data?.date===date?data:null,managing=mode==='manage'&&!!current?.canManage;
 function chooseDate(day:string){if(!day||busy)return;setDate(day);setNotice('');setModal(null);}
 function jump(day:string){setAnchor(day);chooseDate(day);}
 async function save(input:Record<string,unknown>){
  if(busyRef.current)return;
  const signature=JSON.stringify(input);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
  const command=parseCommand({...input,requestId:attempt.current!.id});
  busyRef.current=true;setBusy(true);setNotice('');
  try{
   let response:Response;try{response=await fetch('/api/guidance-teachers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(15000)});}catch{throw Error('The save could not be confirmed. Try the same save again; it will not be duplicated.');}
   const result=await readJSON(response) as {ok?:boolean};if(result.ok!==true)throw Error('The save could not be confirmed. Refresh before trying again.');
   attempt.current=null;setModal(null);
   if((command.op==='create'||command.op==='edit')&&command.date!==date){setAnchor(command.date);setDate(command.date);setNotice('Service saved.');}
   else{const refreshed=await load();setNotice(refreshed?'Schedule saved.':'Saved, but the refreshed schedule is unavailable. Tap Refresh.');}
  }finally{busyRef.current=false;setBusy(false);}
 }
 const services=(current?.services??[]).filter(s=>mode!=='mine'||s.slots.some(a=>a.memberId===current?.viewerId));
 const right=current?.canManage?{label:'Manage',icon:'people' as const,active:mode==='manage',onClick:()=>{setMode(m=>m==='manage'?'schedule':'manage');setNotice('');}}:{label:'My duties',short:'My duties',icon:'user' as const,active:mode==='mine',onClick:()=>setMode(m=>m==='mine'?'schedule':'mine')};
 return <div className="gt-page">
  <FrameControls title="Guidance Teachers" module="guidance-teachers" left={{label:'Schedule',icon:'calendar',active:mode==='schedule',onClick:()=>setMode('schedule')}} right={right} more={[{label:'Refresh schedule',icon:'clock',disabled:busy,onClick:()=>void load()},...(current?.canManage?[{label:'My duties',icon:'user' as const,onClick:()=>setMode('mine')}]:[])]}/>
  <main className="gt-main">
   <div className="gt-calendar-heading"><label className="gt-date-jump"><Icon name="calendar" size={18}/><span>{formatDate(date,{month:'long',year:'numeric'})}</span><input type="date" aria-label="Choose schedule date" value={date} disabled={busy} onChange={e=>e.target.value&&jump(e.target.value)}/></label><button className="gt-text-button" disabled={busy} onClick={()=>jump(today())}>Today</button></div>
   <nav className="gt-date-strip" aria-label="Service dates"><button className="gt-icon-button" aria-label="Previous four days" disabled={busy} onClick={()=>jump(addDays(anchor,-4))}><Icon name="left"/></button>{Array.from({length:4},(_,i)=>addDays(anchor,i)).map(day=><button key={day} type="button" className="gt-date-chip" aria-pressed={date===day} aria-label={formatDate(day)} disabled={busy} onClick={()=>chooseDate(day)}><span>{formatDate(day,{weekday:'short'})}</span><strong>{formatDate(day,{day:'numeric'})}</strong><small>{formatDate(day,{month:'short'})}</small></button>)}<button className="gt-icon-button" aria-label="Next four days" disabled={busy} onClick={()=>jump(addDays(anchor,4))}><Icon name="right"/></button></nav>
   <header className="gt-day-heading"><div><p className="gt-kicker">{managing?'Coordinator view':mode==='mine'?'Your assignments':'Worship schedule'}</p><h1>{formatDate(date,{weekday:'long',month:'long',day:'numeric'})}</h1></div>{managing?<button className="gt-icon-button gt-add" aria-label="Add worship service" disabled={busy} onClick={()=>{attempt.current=null;setModal({kind:'create'});}}><Icon name="plus"/></button>:<button className="gt-icon-button" aria-label="Refresh schedule" disabled={loading||busy} onClick={()=>void load()}><Icon name="refresh" size={18}/></button>}</header>
   {notice&&<p className="gt-notice" role="status">{notice}</p>}
   {error&&<div className="gt-error" role="alert"><p>{error}</p><button className="gt-text-button" disabled={busy} onClick={()=>void load()}>Refresh</button><a href="/sign-in">Sign in</a></div>}
   {loading&&!current&&!error&&<div className="gt-empty" role="status"><Icon name="calendar" size={28}/><strong>Loading the schedule…</strong></div>}
   {current&&!current.canView&&<div className="gt-empty"><Icon name="people" size={32}/><h2>Guidance Teachers</h2><p>This schedule is available to coordinators and assigned Guidance Teachers. Your coordinator can add you to a service.</p></div>}
   {current?.canView&&services.length===0&&<div className="gt-empty"><Icon name="calendar" size={32}/><h2>{mode==='mine'?'No duties on this date':'No services on this date'}</h2><p>{mode==='mine'?'Choose another date or return to the full schedule.':managing?'Add a service to begin assigning the four teacher slots.':'Choose another date to view its worship services.'}</p>{managing&&<button className="gt-button" onClick={()=>{attempt.current=null;setModal({kind:'create'});}}>Add service</button>}{mode==='mine'&&<button className="gt-text-button" onClick={()=>setMode('schedule')}>View full schedule</button>}</div>}
   <div className="gt-service-list" aria-busy={loading}>
    {services.map(service=>{const own=service.slots.some(s=>s.memberId===current?.viewerId),editable=managing&&isFuture(service);return <article key={service.id} className="gt-service-card" data-own={own||undefined} aria-label={`${service.title}, ${formatTime(service.startTime)}`}>
     <header className="gt-service-heading"><span className="gt-service-symbol"><Icon name={service.startTime>='17:00'?'moon':'sun'} size={26}/></span><div><h2>{service.title}</h2><p>{formatTime(service.startTime)} – {formatTime(service.endTime)}</p></div>{editable?<button type="button" className="gt-icon-button" aria-label={`Edit ${service.title}`} disabled={busy} onClick={()=>{attempt.current=null;setModal({kind:'edit',service});}}><Icon name="edit" size={18}/></button>:own?<span className="gt-you-tag">Your duty</span>:null}</header>
     <div className="gt-locations">{LOCATIONS.map(location=><section key={location.id} className="gt-location" aria-label={location.name}><h3><Icon name="building" size={16}/>{location.name}</h3>{[1,2].map(position=>{const slot=service.slots.find(s=>s.location===location.id&&s.position===position)!;const yours=slot.memberId===current?.viewerId;const content=<><Icon name={slot.memberId?'person':'plus'} size={16}/><span className="gt-slot-name">{slot.name??(editable?'Assign teacher':'Unassigned')}</span>{yours&&<span className="gt-you-tag">You</span>}</>;return editable?<button type="button" key={position} className="gt-slot" data-empty={!slot.memberId||undefined} data-own={yours||undefined} aria-label={`${location.name}, Teacher ${position}: ${slot.name??'unassigned'}. ${slot.memberId?'Change':'Assign'} member`} disabled={busy} onClick={()=>{attempt.current=null;setModal({kind:'assign',service,slot});}}>{content}</button>:<div key={position} className="gt-slot" data-empty={!slot.memberId||undefined} data-own={yours||undefined}>{content}</div>;})}</section>)}</div>
     {managing&&<footer className="gt-card-footer"><span>{service.slots.filter(s=>s.memberId).length} of 4 assigned</span><span>{editable?'Tap a slot to assign':'Past service · Read only'}</span></footer>}
    </article>;})}
   </div>
   {current?.canView&&services.length>0&&<p className="gt-timezone">All service times are Las Vegas time.</p>}
  </main>
  {modal?.kind==='assign'&&<AssignmentPicker key={`${modal.service.id}:${modal.slot.location}:${modal.slot.position}`} service={modal.service} slot={modal.slot} busy={busy} onSave={save} onClose={()=>setModal(null)}/>}
  {modal&&(modal.kind==='edit'||modal.kind==='create')&&<ServiceEditor service={modal.kind==='edit'?modal.service:undefined} date={date} busy={busy} onSave={save} onClose={()=>setModal(null)}/>}
 </div>;
}
