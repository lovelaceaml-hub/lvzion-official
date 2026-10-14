'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import type {Action} from '../../lib/morning-prayer/domain';
import styles from './morning-prayer.module.css';
type Capability='view_schedule'|'join_gathering'|'volunteer_host'|'review_requests'|'manage_schedule'|'view_materials'|'edit_materials'|'publish_materials';
type Occ={id:string;date:string;originalDate:string;startsAt:string;endsAt:string;timezone:string;kind:'gathering'|'app_day'|'cancelled';host:string;isMine:boolean;hostConfirmed:boolean;verified:boolean;revision:number;readingKey?:string|null};
type Req={id:string;occurrenceId:string;kind:'volunteer'|'change';status:string;revision:number;isMine:boolean;requester:string;note:string};
type Material={key:string;kind:'pwp'|'reading';revision:number;body:{title:string;summary:string;items:string[];sourceLabel:string}};
type Draft=Material&{id:string;sourceState:'checked'|'incomplete'};
type Host={id:string;name:string};
type Workspace={version:number;occurrences:Occ[];requests:Req[];materials?:Material[];capabilities:Capability[];drafts:Draft[];eligibleHosts:Host[];timezone:string;setupComplete:boolean;meetingAccessConfigured:boolean};
type Tab='home'|'schedule'|'me'|'manage';
const zone='America/Los_Angeles';
const pretty=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
const localDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date).replace(/(\d\d)\/(\d\d)\/(\d{4})/,'$3-$1-$2');
const time=(iso:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(iso));
const nextMonth=(m:string,delta:number)=>{const [y,month]=m.split('-').map(Number);return new Date(Date.UTC(y,month-1+delta,1)).toISOString().slice(0,7);};
function laInstant(date:string,clock:string):string{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))throw new Error('Choose a valid date and time.');
 const [y,mon,d]=date.split('-').map(Number),[h,min]=clock.split(':').map(Number);
 const target=Date.UTC(y,mon-1,d,h,min),fmt=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let candidate=target;
 for(let i=0;i<4;i++){const parts=fmt.formatToParts(new Date(candidate)),get=(k:string)=>Number(parts.find(p=>p.type===k)?.value);const represented=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));candidate+=target-represented;}
 const actual=Object.fromEntries(fmt.formatToParts(new Date(candidate)).map(p=>[p.type,p.value]));
 if([actual.year,actual.month,actual.day].join('-')!==date||[actual.hour,actual.minute].join(':')!==clock)throw new Error('This local time does not exist because of a clock change.');
 return new Date(candidate).toISOString();
}
async function json<T>(url:string,options?:RequestInit):Promise<T>{
 const r=await fetch(url,{...options,cache:'no-store',credentials:'same-origin'});
 let body;try{body=await r.json();}catch{throw new Error('Unable to read the server response.');}
 if(!r.ok)throw new Error(body?.error||'This request cannot be completed.');
 return body as T;
}
export default function MorningPrayerLive(){
 const [tab,setTab]=useState<Tab>('home'),[month,setMonth]=useState(()=>localDay().slice(0,7));
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[focus,setFocus]=useState<string|null>(null);
 const [date,setDate]=useState(()=>localDay()),[start,setStart]=useState('07:00'),[end,setEnd]=useState('07:30'),[kind,setKind]=useState<'gathering'|'app_day'|'cancelled'>('gathering');
 const [materialKind,setMaterialKind]=useState<'pwp'|'reading'>('pwp'),[materialKey,setMaterialKey]=useState(''),[title,setTitle]=useState(''),[summary,setSummary]=useState(''),[items,setItems]=useState(''),[sourceLabel,setSourceLabel]=useState(''),[sourceChecked,setSourceChecked]=useState(false);
 const [hostSelection,setHostSelection]=useState(''),[readingSelection,setReadingSelection]=useState(''),[myWeek,setMyWeek]=useState(1);
 const cap=(key:Capability)=>!!data?.capabilities?.includes(key);
 const loader=useCallback(async()=>{
  const first=month+'-01',last=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).toISOString().slice(0,10);
  try{const result=await json<Workspace>('/api/morning-prayer?from='+first+'&to='+last);setData(result);setError('');}
  catch(e){setData(null);setError(e instanceof Error?e.message:'Morning Prayer unavailable.');}
 },[month]);
 useEffect(()=>{void loader();const onFocus=()=>{void loader();};window.addEventListener('focus',onFocus);
  return()=>window.removeEventListener('focus',onFocus);},[loader]);
 async function post(action:Record<string,unknown>,setup=false){
  if(!data||busy)return;setBusy(true);setMessage('');
  try{const result=await json<{version:number}>(setup?'/api/morning-prayer/setup':'/api/morning-prayer/command',
   {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:crypto.randomUUID(),expectedVersion:data.version,action})});
   await loader();setMessage('Saved in LV Zion Official. Version '+result.version+'.');
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to save.');await loader();}
  finally{setBusy(false);}
 }
 const rows=[...(data?.occurrences||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const today=localDay(),future=rows.filter(o=>o.date>=today&&o.kind==='gathering');
 const active=focus?rows.find(o=>o.id===focus):future[0]||rows[0];
 const own=rows.filter(o=>o.isMine&&o.kind==='gathering'),requests=data?.requests||[];
 const published=(data?.materials||[]);
 const pub=(key:string)=>published.find(m=>m.key===key);
 const pwp=pub('pwp-'+month+'-week-'+myWeek);
 const canManage=['review_requests','manage_schedule','edit_materials','publish_materials'].some(c=>cap(c as Capability));
 const canVolunteer=(o:Occ)=>cap('volunteer_host')&&o.kind==='gathering'&&o.verified&&o.host==='Host needed'&&o.date>=today;
 return <main className={styles.root}>
  <div className={styles.shell}>
   <header className={styles.header}><Link href="/members">‹ LV Zion Official</Link><span className={styles.previewBadge}>Member application</span></header>
   <div className={styles.titleRow}><div><p className={styles.overline}>LAS VEGAS WORK MISSION</p><h1>Morning Prayer</h1></div><div className={styles.logo}>WM</div></div>
   {message&&<p className={styles.message} role="status">{message}</p>}
   {error&&<section className={styles.empty}><h2>Access or service unavailable</h2><p role="alert">{error}</p><button className={styles.secondary} onClick={()=>void loader()}>Try again</button><p><Link href="/members">Back to My Week</Link></p></section>}
   {!error&&!data&&<p role="status">Loading your authorized gathering schedule…</p>}
   {data&&<>
    {tab==='home'&&<>
      <div className={styles.sectionHeading}><h2>Your next gathering</h2><span>{pretty(today)}</span></div>
      {future[0]?<section className={styles.hero}><div className={styles.heroTop}><span>{pretty(future[0].date).toUpperCase()}</span><span>{future[0].verified?'SCHEDULED':'NEEDS VERIFICATION'}</span></div>
       <div className={styles.heroTime}>{time(future[0].startsAt)}<small>Las Vegas time</small></div>
       <h2>{future[0].host}</h2><p>{future[0].hostConfirmed?'Confirmed host':'Host and meeting details may need confirmation'}</p>
       <button onClick={()=>{setFocus(future[0].id);setTab('schedule');}}>Gathering details →</button>
      </section>:<section className={styles.empty}><h2>No upcoming gatherings scheduled</h2><p>An authorized coordinator can add actual dates in Manage. No dates or meeting links are guessed.</p></section>}
      {cap('view_materials')&&<section className={styles.card}><div className={styles.cardTop}><h2>PWP · {new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'))}</h2><span className={styles.tag}>Approved sources only</span></div>
       <div className={styles.weekPicker}>{[1,2,3,4,5].map(n=><button key={n} aria-pressed={myWeek===n} onClick={()=>setMyWeek(n)}>Wk {n}</button>)}</div>
       {pwp?<><h3>{pwp.body.title}</h3><p>{pwp.body.summary}</p>{pwp.body.items.map((x,i)=><p key={i}>{x}</p>)}<small>{pwp.body.sourceLabel}</small></>
       :<p className={styles.muted}>Week {myWeek} PWP material has not been reviewed and published in this module.</p>}
       <a className={styles.officialLink} href="https://wm.watv.org/login.wmc" target="_blank" rel="noopener noreferrer">Open official WM PWP Card ↗</a>
      </section>}
      <div className={styles.sectionHeading}><h2>Upcoming dates</h2><button onClick={()=>setTab('schedule')}>Full schedule →</button></div>
      {future.slice(0,5).map(o=><button className={styles.nextOwn} key={o.id} onClick={()=>{setFocus(o.id);setTab('schedule');}}><span><small>{pretty(o.date)}</small><strong>{time(o.startsAt)} · {o.host}</strong></span><b>›</b></button>)}
    </>}
    {tab==='schedule'&&<>
      <div className={styles.monthNav}><button aria-label="Previous month" onClick={()=>{setMonth(nextMonth(month,-1));setFocus(null);}}>‹</button><h2>{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'))}</h2><button aria-label="Next month" onClick={()=>{setMonth(nextMonth(month,1));setFocus(null);}}>›</button></div>
      {rows.length===0?<section className={styles.empty}><h2>No gatherings entered for this month</h2><p>This is the real app; only authorized records will appear here.</p></section>:rows.map(o=><button key={o.id} className={styles.scheduleRow} onClick={()=>setFocus(o.id)} aria-pressed={focus===o.id}>
       <span className={styles.dateBlock}><small>{pretty(o.date).split(',')[0]}</small><strong>{+o.date.slice(-2)}</strong></span>
       <span><b>{o.kind==='app_day'?'Pray Daily app day':o.kind==='cancelled'?'Cancelled':o.host}</b><small>{o.kind==='gathering'?time(o.startsAt)+' · '+(o.verified?'Schedule verified':'Pending verification'):'No live Zoom gathering'}</small></span><b>›</b>
       </button>)}
      {active&&active.date.slice(0,7)===month&&<section className={styles.card} data-testid="actual-gathering"><h2>{pretty(active.date)}</h2><p><strong>{active.kind==='gathering'?active.host:active.kind==='app_day'?'Pray Daily app day':'Cancelled'}</strong></p>
       <p>{time(active.startsAt)} – {time(active.endsAt)} · America/Los_Angeles</p>
       {!active.verified&&<p className={styles.warning}>Schedule has not been verified by a coordinator.</p>}
       {active.kind==='gathering'&&<p className={styles.muted}>Join access remains unavailable until this occurrence has an authorized, verified meeting link.</p>}
       {canVolunteer(active)&&<button className={styles.primary} disabled={busy} onClick={()=>void post({type:'volunteer',occurrenceIds:[active.id]})}>Request to host this date →</button>}
       {cap('view_materials')&&published.filter(m=>m.kind==='reading'&&m.key===active.readingKey).map(m=><p key={m.key}><strong>{m.body.title}</strong> — {m.body.summary}</p>)}
      </section>}
    </>}
    {tab==='me'&&<>
      <section className={styles.card}><h2>Your hosting dates</h2>{own.length?own.map(o=><div className={styles.hostingRow} key={o.id}><strong>{pretty(o.date)} · {time(o.startsAt)}</strong><p>{o.hostConfirmed?'Confirmed':'Confirmation needed'}</p>
        {o.hostConfirmed?<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'request_change',occurrenceId:o.id,note:''})}>Request a change</button>:<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'confirm_host',occurrenceId:o.id})}>Confirm hosting</button>}
       </div>):<p className={styles.muted}>You do not have an upcoming hosting assignment.</p>}</section>
      <section className={styles.card}><h2>Your requests</h2>{requests.filter(r=>r.isMine).length?requests.filter(r=>r.isMine).map(r=><div className={styles.requestRow} key={r.id}><strong>{r.kind==='volunteer'?'Volunteer':'Change'} · {r.status}</strong><p>{pretty(rows.find(o=>o.id===r.occurrenceId)?.date||today)}</p>{r.status==='pending'&&<button className={styles.secondary} disabled={busy} onClick={()=>void post({type:'withdraw',requestId:r.id})}>Withdraw request</button>}</div>):<p className={styles.muted}>No requests. Other members’ private requests are not shown.</p>}</section>
    </>}
    {tab==='manage'&&<>
      {!canManage?<section className={styles.empty}><h2>No management permission</h2><p>Management is assigned independently of group and department positions.</p></section>:<>
      <div className={styles.sectionHeading}><h2>Manage Morning Prayer</h2><span>Data revision {data.version}</span></div>
      {cap('manage_schedule')&&<section className={styles.card}><h2>Add an actual gathering date</h2><p className={styles.muted}>Only authorized coordinators can create dates. Added records remain unverified until reviewed. No automatic calendar or Zoom link is created.</p>
       <label>Date<input className={styles.input} type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
       <div className={styles.two}><label>Start (Las Vegas)<input className={styles.input} type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>End (Las Vegas)<input className={styles.input} type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
       <label>Occurrence type<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="gathering">Live gathering</option><option value="app_day">Pray Daily app day</option><option value="cancelled">Cancelled occurrence</option></select></label>
       <button disabled={busy} className={styles.primary} onClick={()=>{try{void post({type:'create_occurrence',date,startsAt:laInstant(date,start),endsAt:laInstant(date,end),timezone:zone,kind},true);}catch(e){setMessage(e instanceof Error?e.message:'Check the time.');}}}>Save date, pending verification →</button>
      </section>}
      {cap('manage_schedule')&&rows.length>0&&<section className={styles.card}><h2>Manage entered dates</h2>{rows.filter(o=>o.date>=today).map(o=><div key={o.id} className={styles.requestRow}><strong>{pretty(o.date)} · {o.host}</strong><p>{o.verified?'Schedule verified':'Unverified'} · Version {o.revision}</p>
       {published.some(m=>m.kind==='reading')&&<div><label>Reading for this date<select value={readingSelection} onChange={e=>setReadingSelection(e.target.value)}><option value="">Choose approved reading</option>{published.filter(m=>m.kind==='reading').map(m=><option key={m.key} value={m.key}>{m.body.title}</option>)}</select></label><button className={styles.secondary} disabled={busy||!readingSelection} onClick={()=>void post({type:'link_reading',occurrenceId:o.id,readingKey:readingSelection},true)}>Link reading</button></div>}<div className={styles.actions}><button disabled={busy||o.verified} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'verify'})}>Verify date/time</button><button disabled={busy||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'app_day'})}>App day</button><button disabled={busy||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'cancel'})}>Cancel</button></div>
       {data.eligibleHosts.length>0&&o.verified&&o.kind==='gathering'&&<div><label>Eligible host<select value={hostSelection} onChange={e=>setHostSelection(e.target.value)}><option value="">Choose an eligible host</option>{data.eligibleHosts.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label><button className={styles.secondary} disabled={!hostSelection||busy} onClick={()=>void post({type:'assign',occurrenceId:o.id,memberId:hostSelection})}>Assign host</button></div>}
      </div>)}</section>}
      {cap('review_requests')&&<section className={styles.card}><h2>Hosting requests awaiting approval</h2>{requests.filter(r=>r.status==='pending').length?requests.filter(r=>r.status==='pending').map(r=><div key={r.id} className={styles.requestRow}><strong>{r.requester} · {r.kind==='volunteer'?'Volunteer':'Change'}</strong><p>{pretty(rows.find(o=>o.id===r.occurrenceId)?.date||today)}{r.note?' · Private note: '+r.note:''}</p><div className={styles.actions}><button disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'approve'})}>Approve</button><button disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'decline'})}>Decline</button></div></div>):<p className={styles.muted}>No pending requests.</p>}</section>}
      {cap('edit_materials')&&<section className={styles.card}><h2>Create official reading or PWP draft</h2><p className={styles.muted}>Use source-supported wording only. Drafting never publishes automatically. Do not include personal information or private meeting credentials.</p>
       <label>Type<select value={materialKind} onChange={e=>setMaterialKind(e.target.value as typeof materialKind)}><option value="pwp">PWP</option><option value="reading">Daily reading</option></select></label>
       <label>Unique material key<input className={styles.input} value={materialKey} placeholder={'pwp-'+month+'-week-1'} onChange={e=>setMaterialKey(e.target.value)}/></label>
       <label>Approved source title<input className={styles.input} value={title} onChange={e=>setTitle(e.target.value)}/></label>
       <label>Source-supported summary<textarea className={styles.input} rows={3} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
       <label>Teaching points (one per line, maximum five)<textarea className={styles.input} rows={4} value={items} onChange={e=>setItems(e.target.value)}/></label>
       <label>Source reference label<input className={styles.input} value={sourceLabel} onChange={e=>setSourceLabel(e.target.value)}/></label>
       <label><input type="checkbox" checked={sourceChecked} onChange={e=>setSourceChecked(e.target.checked)}/> I have checked the content against the permitted source.</label>
       <button className={styles.primary} disabled={busy} onClick={()=>void post({type:'create_material',key:materialKey,kind:materialKind,body:{title,summary,items:items.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,5),sourceLabel},sourceChecked},true)}>Save as an unpublished draft →</button>
      </section>}
      {cap('publish_materials')&&<section className={styles.card}><h2>Material publication review</h2>{data.drafts.length?data.drafts.map(m=><div key={m.id} className={styles.requestRow}><strong>{m.body.title}</strong><p>{m.key} · Revision {m.revision} · Source {m.sourceState}</p><p>{m.body.summary}</p><button className={styles.primary} disabled={busy||m.sourceState!=='checked'} onClick={()=>void post({type:'material_publish',materialId:m.id})}>Publish reviewed revision →</button></div>):<p className={styles.muted}>No material drafts awaiting publication.</p>}</section>}
      <p className={styles.boundary}>No automatic sheet synchronization, external messages, attendance tracking, or old Firebase database access.</p>
      </>}
    </>}
   </>}
   <footer className={styles.footer}>LV Zion Official · Work Mission Morning Prayer<br/>Verified member access only. Changes are saved to the independent LV Zion system.</footer>
  </div>
  <nav className={styles.nav} aria-label="Morning Prayer navigation">
   {(['home','schedule','me',...(canManage?['manage']:[])] as Tab[]).map(x=><button key={x} aria-current={tab===x?'page':undefined} onClick={()=>setTab(x)}>{x==='home'?'Home':x==='schedule'?'Schedule':x==='me'?'Me':'Manage'}</button>)}
  </nav>
 </main>;
}