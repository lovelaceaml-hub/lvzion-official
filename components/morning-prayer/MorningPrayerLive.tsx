'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {vegasInstant,vegasToday} from '../../lib/morning-prayer/time';
import styles from './morning-prayer.module.css';
import MorningPrayerOperations from './MorningPrayerOperations';
import MorningPrayerVolunteer from './MorningPrayerVolunteer';
type Capability='view_schedule'|'join_gathering'|'volunteer_host'|'review_requests'|'manage_schedule'|'view_materials'|'edit_materials'|'publish_materials';
type Occ={id:string;date:string;originalDate:string;startsAt:string;endsAt:string;timezone:string;kind:'gathering'|'app_day'|'cancelled';host:string;isMine:boolean;hostConfirmed:boolean;verified:boolean;revision:number;readingKey?:string|null};
type Req={id:string;occurrenceId:string;kind:'volunteer'|'change';status:string;revision:number;date:string;isMine:boolean;requester:string;note:string};
type Material={key:string;kind:'pwp'|'reading';revision:number;body:{title:string;summary:string;items:string[];sourceLabel:string}};
type Draft=Material&{id:string;sourceState:'checked'|'incomplete'};
type Host={id:string;name:string};
type Workspace={version:number;occurrences:Occ[];requests:Req[];materials?:Material[];capabilities:Capability[];drafts:Draft[];eligibleHosts:Host[];timezone:string;setupComplete:boolean;meetingAccessConfigured:boolean;upcoming?:Occ[];ownHosting?:Occ[];materialCatalog?:Material[];joinWindowMinutes?:number|null;meetingStates?:{occurrenceId:string;ready:boolean;configured:boolean}[];};
type Tab='home'|'schedule'|'me'|'manage';
type ManageArea='schedule'|'materials'|'people';
const zone='America/Los_Angeles';
const pretty=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
const localDay=vegasToday;
const time=(iso:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(iso));
const nextMonth=(m:string,delta:number)=>{const [y,month]=m.split('-').map(Number);return new Date(Date.UTC(y,month-1+delta,1)).toISOString().slice(0,7);};
async function json<T>(url:string,options?:RequestInit):Promise<T>{
 const r=await fetch(url,{...options,cache:'no-store',credentials:'same-origin'});
 let body;try{body=await r.json();}catch{throw new Error('Unable to read the server response.');}
 if(!r.ok)throw new Error(body?.error||'This request cannot be completed.');
 return body as T;
}
export default function MorningPrayerLive(){
 const readSequence=useRef(0),readController=useRef<AbortController|null>(null);
 const [tab,setTab]=useState<Tab>('home'),[month,setMonth]=useState(()=>localDay().slice(0,7));
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[focus,setFocus]=useState<string|null>(null);
 const [date,setDate]=useState(()=>localDay()),[start,setStart]=useState('07:00'),[end,setEnd]=useState('07:30'),[kind,setKind]=useState<'gathering'|'app_day'|'cancelled'>('gathering');
 const [manageArea,setManageArea]=useState<ManageArea>('schedule'),[ownerAccess,setOwnerAccess]=useState(false);
 const [materialWeek,setMaterialWeek]=useState(1),[materialMonth,setMaterialMonth]=useState(()=>localDay().slice(0,7));
 const [materialKind,setMaterialKind]=useState<'pwp'|'reading'>('pwp'),[readingDraftKey,setReadingDraftKey]=useState(''),[title,setTitle]=useState(''),[summary,setSummary]=useState(''),[items,setItems]=useState(''),[sourceLabel,setSourceLabel]=useState(''),[sourceChecked,setSourceChecked]=useState(false);
 const [hostSelection,setHostSelection]=useState(''),[readingSelection,setReadingSelection]=useState(''),[myWeek,setMyWeek]=useState(1);
 const cap=(key:Capability)=>!!data?.capabilities?.includes(key);
 const loader=useCallback(async()=>{
  const sequence=++readSequence.current;
  readController.current?.abort();
  const controller=new AbortController();readController.current=controller;
  const first=month+'-01',last=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).toISOString().slice(0,10);
  try{
   const result=await json<Workspace>('/api/morning-prayer?from='+first+'&to='+last,{signal:controller.signal});
   if(sequence!==readSequence.current||controller.signal.aborted)return false;
   setData(result);setError('');return true;
  }catch(e){
   if(sequence!==readSequence.current||controller.signal.aborted)return false;
   setData(null);setError(e instanceof Error?e.message:'Morning Prayer unavailable.');return false;
  }
 },[month]);
 useEffect(()=>{
  setData(null);setError('');void loader();
  const refresh=()=>{if(!document.hidden)void loader();};
  const timer=window.setInterval(refresh,30000);
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{readSequence.current++;readController.current?.abort();window.clearInterval(timer);
   window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[loader]);
 async function post(action:Record<string,unknown>,setup=false){
  if(!data||busy)return false;setBusy(true);setMessage('');
  try{const one=action.type==='create_occurrence';const url=one?'/api/morning-prayer/batch':setup?'/api/morning-prayer/setup':'/api/morning-prayer/command';
   const body=one?{key:crypto.randomUUID(),expectedVersion:data.version,occurrences:[Object.fromEntries(Object.entries(action).filter(([key])=>key!=='type'))]}:{key:crypto.randomUUID(),expectedVersion:data.version,action};
   const result=await json<{version:number}>(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const refreshed=await loader();setMessage(refreshed?'Saved.':'Change accepted. Refresh to confirm the result.');return refreshed;
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to save.');await loader();return false;}
  finally{setBusy(false);}
 }
 async function joinGathering(id:string){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const value=await json<{joinUrl:string}>('/api/morning-prayer/join',
    {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({occurrenceId:id})});
   const url=new URL(value.joinUrl);
   if(url.protocol!=='https:'||!(/(^|[.])zoom[.]us$/.test(url.hostname))||
      !(/^[/]j[/][0-9]{8,12}$/.test(url.pathname)))
     throw new Error('The verified Zoom meeting URL is unavailable.');
   window.location.assign(url.toString());
  }catch(e){setMessage(e instanceof Error?e.message:'Joining is currently unavailable.');setBusy(false);}
 }
 const rows=[...(data?.occurrences||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const today=localDay(),future=rows.filter(o=>o.date>=today&&o.kind==='gathering');
 const upcoming=(data?.upcoming||[]).filter(o=>o.date>=today&&o.kind==='gathering');
 const next=upcoming[0]||future[0];
 const joinable=(id:string)=>cap('join_gathering')&&!!data?.meetingStates?.some(s=>s.occurrenceId===id&&s.ready);
 const active=focus?rows.find(o=>o.id===focus):future[0]||rows[0];
 const own=(data?.ownHosting||rows.filter(o=>o.isMine)).filter(o=>o.kind==='gathering'&&Date.parse(o.endsAt)>Date.now()),requests=data?.requests||[];
 const published=(data?.materials||[]);
 const pub=(key:string)=>published.find(m=>m.key===key);
 const pwp=pub('pwp-'+month+'-week-'+myWeek);
 const canManage=['review_requests','manage_schedule','edit_materials','publish_materials'].some(c=>cap(c as Capability));
 const manageAreas:ManageArea[]=[...(cap('manage_schedule')||cap('review_requests')?['schedule' as const]:[]),...(cap('edit_materials')||cap('publish_materials')?['materials' as const]:[]),...(ownerAccess?['people' as const]:[])];
 const activeManageArea=manageAreas.includes(manageArea)?manageArea:manageAreas[0];
 const canVolunteer=(o:Occ)=>cap('volunteer_host')&&o.kind==='gathering'&&o.verified&&o.host==='Host needed'&&o.date>=today;
 return <main className={styles.root}>
  <div className={styles.shell}>
   <header className={styles.header}><Link href="/members">‹ LV Zion Official</Link><span className={styles.brand}>Work Mission</span></header>
   <div className={styles.titleRow}><div><p className={styles.overline}>Las Vegas Zion</p><h1>Morning Prayer</h1></div><div className={styles.logo}>WM</div></div>
   {message&&<p className={styles.message} role="status">{message}</p>}
   {error&&<section className={styles.empty}><h2>Access or service unavailable</h2><p role="alert">{error}</p><button className={styles.secondary} onClick={()=>void loader()}>Try again</button><p><Link href="/members">Back to My Week</Link></p></section>}
   {!error&&!data&&<p role="status">Loading your authorized gathering schedule…</p>}
   {data&&<>
    {tab==='home'&&<>
      <div className={styles.sectionHeading}><h2>Your next gathering</h2><span>{pretty(today)}</span></div>
      {next?<section className={styles.hero}><div className={styles.heroTop}><span>{pretty(next.date).toUpperCase()}</span><span>{next.verified?'Upcoming':'To confirm'}</span></div>
       <div className={styles.heroTime}>{time(next.startsAt)}<small>Las Vegas time</small></div>
       <h2>{next.host}</h2>{!next.hostConfirmed&&next.host!=='Host needed'&&<p>Host confirmation pending</p>}
       {joinable(next.id)&&<button onClick={()=>void joinGathering(next.id)}>Join verified gathering ↗</button>}
       <button className={styles.heroDetails} onClick={()=>{setFocus(next.id);setMonth(next.date.slice(0,7));setTab('schedule');}}>Gathering details →</button>
      </section>:<section className={styles.empty}><h2>No upcoming gatherings scheduled</h2><p>{cap('manage_schedule')?'Add your first gathering in Manage.':'Your next gathering will appear here.'}</p>{cap('manage_schedule')&&<button className={styles.primary} onClick={()=>{setManageArea('schedule');setTab('manage');}}>Add a gathering</button>}</section>}
      {cap('view_materials')&&<section className={styles.card}><div className={styles.cardTop}><h2>PWP · {new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'))}</h2></div>
       <div className={styles.weekPicker}>{[1,2,3,4,5].map(n=><button key={n} aria-pressed={myWeek===n} onClick={()=>setMyWeek(n)}>Wk {n}</button>)}</div>
       {pwp?<><h3>{pwp.body.title}</h3><p>{pwp.body.summary}</p>{pwp.body.items.map((x,i)=><p key={i}>{x}</p>)}<small>{pwp.body.sourceLabel}</small></>
       :<p className={styles.muted}>Week {myWeek} activities will appear here when they are ready.</p>}
       <a className={styles.officialLink} href="https://wm.watv.org/login.wmc" target="_blank" rel="noopener noreferrer">Open PWP card</a>
      </section>}
      <div className={styles.sectionHeading}><h2>Upcoming dates</h2><button onClick={()=>setTab('schedule')}>Full schedule →</button></div>
      <div className={styles.upcomingList}>{(upcoming.length?upcoming:future).slice(0,5).map(o=><button className={styles.nextOwn} key={o.id} onClick={()=>{setFocus(o.id);setMonth(o.date.slice(0,7));setTab('schedule');}}><span><small>{pretty(o.date)}</small><strong>{time(o.startsAt)} · {o.host}</strong></span><b>›</b></button>)}</div>
    </>}
    {tab==='schedule'&&<>
      <div className={styles.monthNav}><button aria-label="Previous month" onClick={()=>{setMonth(nextMonth(month,-1));setFocus(null);}}>‹</button><h2>{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'))}</h2><button aria-label="Next month" onClick={()=>{setMonth(nextMonth(month,1));setFocus(null);}}>›</button></div>
      <MorningPrayerVolunteer month={month} rows={rows} today={today} selected={focus} onSelect={setFocus} canVolunteer={cap('volunteer_host')} busy={busy} onSubmit={ids=>post({type:'volunteer',occurrenceIds:ids})}/>
      {rows.length===0?<section className={styles.empty}><h2>No gatherings entered for this month</h2><p>Scheduled gatherings will appear on this calendar.</p></section>:<details className={styles.dateList}><summary>All dates this month</summary>{rows.map(o=><button key={o.id} className={styles.scheduleRow} onClick={()=>setFocus(o.id)} aria-pressed={focus===o.id}>
       <span className={styles.dateBlock}><small>{pretty(o.date).split(',')[0]}</small><strong>{+o.date.slice(-2)}</strong></span>
       <span><b>{o.kind==='app_day'?'Pray Daily app day':o.kind==='cancelled'?'Cancelled':o.host}</b><small>{o.kind==='gathering'?time(o.startsAt)+' · '+(o.verified?'Schedule verified':'Pending verification'):'No live Zoom gathering'}</small></span><b>›</b>
       </button>)}</details>}
      {active&&active.date.slice(0,7)===month&&<section className={styles.card} data-testid="actual-gathering"><h2>{pretty(active.date)}</h2><p><strong>{active.kind==='gathering'?active.host:active.kind==='app_day'?'Pray Daily app day':'Cancelled'}</strong></p>
       <p>{time(active.startsAt)} to {time(active.endsAt)} · America/Los_Angeles</p>
       {!active.verified&&<p className={styles.warning}>This date is waiting for confirmation.</p>}
       {active.kind==='gathering'&&(joinable(active.id)?<button className={styles.primary} disabled={busy} onClick={()=>void joinGathering(active.id)}>Join verified gathering ↗</button>:<p className={styles.muted}>The meeting link will appear here when joining opens.</p>)}
       {canVolunteer(active)&&<button className={styles.primary} disabled={busy} onClick={()=>void post({type:'volunteer',occurrenceIds:[active.id]})}>Request to host this date →</button>}
       {cap('view_materials')&&published.filter(m=>m.kind==='reading'&&m.key===active.readingKey).map(m=><div key={m.key} className={styles.reading}><h3>{m.body.title}</h3><p>{m.body.summary}</p><ul>{m.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul><p className={styles.muted}>Source: {m.body.sourceLabel}</p></div>)}
      </section>}
    </>}
    {tab==='me'&&<>
      <section className={styles.card}><h2>Your hosting dates</h2>{own.length?own.map(o=><div className={styles.hostingRow} key={o.id}><strong>{pretty(o.date)} · {time(o.startsAt)}</strong><p>{o.hostConfirmed?'Confirmed':'Confirmation needed'}</p>
        {o.hostConfirmed?<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'request_change',occurrenceId:o.id,note:''})}>Request a change</button>:<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'confirm_host',occurrenceId:o.id})}>Confirm hosting</button>}
       </div>):<p className={styles.muted}>You do not have an upcoming hosting assignment.</p>}</section>
      <section className={styles.card}><h2>Your requests</h2>{requests.filter(r=>r.isMine).length?requests.filter(r=>r.isMine).map(r=><div className={styles.requestRow} key={r.id}><strong>{r.kind==='volunteer'?'Volunteer':'Change'} · {r.status}</strong><p>{pretty(r.date||rows.find(o=>o.id===r.occurrenceId)?.date||today)}</p>{r.status==='pending'&&<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'withdraw',requestId:r.id})}>Withdraw request</button>}</div>):<p className={styles.muted}>No requests. Other members’ private requests are not shown.</p>}</section>
    </>}
    {tab==='manage'&&<>
      {!canManage?<section className={styles.empty}><h2>No management permission</h2><p>Management is assigned independently of group and department positions.</p></section>:<>
      <div className={styles.sectionHeading}><h2>Manage</h2></div><nav className={styles.manageTabs} aria-label="Manage sections">{manageAreas.map(area=><button key={area} aria-pressed={activeManageArea===area} onClick={()=>setManageArea(area)}>{area==='schedule'?'Schedule':area==='materials'?'Materials':'People'}</button>)}</nav>{activeManageArea==='schedule'&&<label className={styles.monthFilter}>Month<input type="month" value={month} onChange={e=>{if(e.target.value){setMonth(e.target.value);setDate(e.target.value===localDay().slice(0,7)?localDay():e.target.value+'-01');}}}/></label>}
      {activeManageArea==='schedule'&&cap('manage_schedule')&&<details className={styles.editor}><summary>Add a gathering</summary><div className={styles.editorBody}><p className={styles.muted}>Enter the date and Las Vegas time. Confirm it after saving.</p>
       <label>Date<input className={styles.input} type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
       <div className={styles.two}><label>Start (Las Vegas)<input className={styles.input} type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>End (Las Vegas)<input className={styles.input} type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
       <label>Occurrence type<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="gathering">Live gathering</option><option value="app_day">Pray Daily app day</option><option value="cancelled">Cancelled occurrence</option></select></label>
       <button disabled={busy} className={styles.primary} onClick={()=>{try{void post({type:'create_occurrence',date,startsAt:vegasInstant(date,start),endsAt:vegasInstant(date,end),timezone:zone,kind},true);}catch(e){setMessage(e instanceof Error?e.message:'Check the time.');}}}>Save gathering</button>
      </div></details>}
      {activeManageArea==='schedule'&&cap('manage_schedule')&&rows.length>0&&<section className={styles.card}><h2>Gatherings</h2>{rows.filter(o=>o.date>=today).map(o=><details key={o.id} className={styles.dateEditor}><summary><strong>{pretty(o.date)} · {o.host}</strong><span>{o.verified?'Confirmed':'To confirm'} <span aria-hidden="true">›</span></span></summary><div className={styles.editorBody}>
       {published.some(m=>m.kind==='reading')&&<div><label>Reading for this date<select value={readingSelection} onChange={e=>setReadingSelection(e.target.value)}><option value="">Choose approved reading</option>{published.filter(m=>m.kind==='reading').map(m=><option key={m.key} value={m.key}>{m.body.title}</option>)}</select></label><button className={styles.secondary} disabled={busy||!readingSelection} onClick={()=>void post({type:'link_reading',occurrenceId:o.id,readingKey:readingSelection},true)}>Link reading</button></div>}<div className={styles.actions}><button className={styles.primary} disabled={busy||o.verified||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'verify'})}>Confirm date</button><button disabled={busy||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'app_day'})}>App day</button><button disabled={busy||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'cancel'})}>Cancel</button>{o.kind!=='gathering'&&<button disabled={busy} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'restore'})}>Restore as unverified gathering</button>}</div>
       {data.eligibleHosts.length>0&&o.verified&&o.kind==='gathering'&&<div><label>Eligible host<select value={hostSelection} onChange={e=>setHostSelection(e.target.value)}><option value="">Choose an eligible host</option>{data.eligibleHosts.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label><button className={styles.secondary} disabled={!hostSelection||busy} onClick={()=>void post({type:'assign',occurrenceId:o.id,memberId:hostSelection})}>Assign host</button></div>}
      </div></details>)}</section>}
      {activeManageArea==='schedule'&&cap('review_requests')&&requests.some(r=>r.status==='pending')&&<section className={styles.card}><h2>Hosting requests</h2>{requests.filter(r=>r.status==='pending').length?requests.filter(r=>r.status==='pending').map(r=><div key={r.id} className={styles.requestRow}><strong>{r.requester} · {r.kind==='volunteer'?'Volunteer':'Change'}</strong><p>{pretty(r.date||rows.find(o=>o.id===r.occurrenceId)?.date||today)}{r.note?' · Private note: '+r.note:''}</p><div className={styles.actions}><button disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'approve'})}>Approve</button><button disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'decline'})}>Decline</button></div></div>):<p className={styles.muted}>No pending requests.</p>}</section>}
      {activeManageArea==='materials'&&cap('edit_materials')&&<details className={styles.editor}><summary>New reading or PWP</summary><form className={styles.editorBody} action="/api/morning-prayer/setup" method="post" onSubmit={event=>{event.preventDefault();const key=materialKind==='pwp'?'pwp-'+materialMonth+'-week-'+materialWeek:readingDraftKey||'reading-'+crypto.randomUUID();if(materialKind==='reading')setReadingDraftKey(key);void post({type:'create_material',key,kind:materialKind,body:{title,summary,items:items.split('\n').map(s=>s.trim()).filter(Boolean),sourceLabel},sourceChecked},true).then(saved=>{if(saved){setReadingDraftKey('');setTitle('');setSummary('');setItems('');setSourceLabel('');setSourceChecked(false);}});}}><p className={styles.muted}>Prepare the wording from an approved source. Publishing is a separate step.</p>
       <label>Type<select value={materialKind} onChange={e=>{setMaterialKind(e.target.value as typeof materialKind);setSourceChecked(false);}}><option value="pwp">PWP</option><option value="reading">Daily reading</option></select></label>
       {materialKind==='pwp'&&<div className={styles.two}><label>PWP month<input className={styles.input} type="month" required name="month" value={materialMonth} onChange={e=>{setMaterialMonth(e.target.value);setSourceChecked(false);}}/></label><label>Week<select value={materialWeek} onChange={e=>{setMaterialWeek(Number(e.target.value));setSourceChecked(false);}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Week {n}</option>)}</select></label></div>}
       <label>Title<input className={styles.input} required name="title" maxLength={100} value={title} onChange={e=>{setTitle(e.target.value);setSourceChecked(false);}}/></label>
       <label>Summary<textarea className={styles.input} required name="summary" maxLength={400} rows={3} value={summary} onChange={e=>{setSummary(e.target.value);setSourceChecked(false);}}/></label>
       <label>Activities or points (one per line, up to five)<textarea className={styles.input} required name="items" rows={4} value={items} onChange={e=>{setItems(e.target.value);setSourceChecked(false);}}/></label>
       <label>Source<input className={styles.input} required name="source" maxLength={100} value={sourceLabel} onChange={e=>{setSourceLabel(e.target.value);setSourceChecked(false);}}/></label>
       <label><input type="checkbox" checked={sourceChecked} onChange={e=>setSourceChecked(e.target.checked)}/> I have checked the content against the permitted source.</label>
       <button className={styles.primary} disabled={busy} type="submit">Save draft</button>
      </form></details>}
      {activeManageArea==='materials'&&cap('publish_materials')&&<section className={styles.card}><h2>Ready to publish</h2>{data.drafts.length?data.drafts.map(m=><div key={m.id} className={styles.requestRow}><strong>{m.body.title}</strong><p>{m.sourceState==='checked'?'Source checked':'Source needs checking'}</p><details className={styles.review}><summary>Review draft</summary><p>{m.body.summary}</p><ul>{m.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul><p className={styles.muted}>Source: {m.body.sourceLabel}</p><button className={styles.primary} disabled={busy||m.sourceState!=='checked'} onClick={()=>void post({type:'material_publish',materialId:m.id})}>Publish</button></details></div>):<p className={styles.muted}>No material drafts awaiting publication.</p>}</section>}
      <MorningPrayerOperations data={data} area={activeManageArea} onOwnerAccess={setOwnerAccess} onReload={loader} onNotice={setMessage}/>

      </>}
    </>}
   </>}
   <footer className={styles.footer}>Las Vegas Zion · Work Mission</footer>
  </div>
  <nav className={styles.nav} aria-label="Morning Prayer navigation">
   {(['home','schedule','me',...(canManage?['manage']:[])] as Tab[]).map(x=><button key={x} aria-current={tab===x?'page':undefined} onClick={()=>setTab(x)}>{x==='home'?'Home':x==='schedule'?'Schedule':x==='me'?'Me':'Manage'}</button>)}
  </nav>
 </main>;
}