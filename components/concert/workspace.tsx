'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {FrameControls} from '../app-frame';
import {EmptyState,Glass,IconBox,Row,SearchField,SectionHeader,StatGrid,StatTile,Tag} from '../ui-kit';
import {CalendarDays,Check,MapPin,Music,UsersRound} from '../home-icons';
import {MAX_PARTY,formatStamp,parseAttendance,parseProgramEntries,seatsLeft,whenLine,type Attendance,type ConcertEvent,type ProgramEntry,type Workspace} from '../../lib/concert/domain';
import Program from './program';
import './concert.css';

type View='ticket'|'invite'|'guests'|'settings';
type Data=Workspace&{email:string};
class SessionError extends Error{}
async function readJSON(response:Response){
 let data:unknown;try{data=await response.json();}catch{throw Error('The server response could not be read. Refresh and try again.');}
 if(response.status===401)throw new SessionError('Sign in to your LV Zion account to RSVP and invite guests.');
 if(!response.ok){const p=data as {error?:unknown};throw Error(typeof p?.error==='string'?p.error:'The request could not be completed.');}
 return data;
}
async function post(input:Record<string,unknown>){return readJSON(await fetch('/api/concert',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}));}

function EventCard({event}:{event:ConcertEvent}){
 const left=seatsLeft(event);
 return <Glass className="cc-event" aria-labelledby="cc-event-title">
  <p className="ui-eyebrow">{event.rsvpOpen?'RSVP open':'RSVP closed'}</p>
  <h2 id="cc-event-title">{event.title}</h2>
  <p className="cc-meta"><CalendarDays size={18}/><span>{whenLine(event)}</span></p>
  <p className="cc-meta"><MapPin size={18}/><span>{event.venue}</span></p>
  {event.details?<p className="cc-details">{event.details}</p>:null}
  {left!==null?<p className="cc-hint">{left===0?'All seats are taken.':`${left} of ${event.capacity} seats left.`}</p>:null}
 </Glass>;
}

function TicketView({data,reload}:{data:Data;reload:()=>Promise<void>}){
 const event=data.event!;const ticket=data.myTicket;
 const [email,setEmail]=useState(data.email),[party,setParty]=useState(1),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[error,setError]=useState('');
 async function rsvp(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNote('');
  try{const r=await post({op:'rsvp',email,partySize:party}) as {emailed?:boolean};await reload();setNote(r.emailed?'Your ticket is ready and a copy was emailed to you.':'Your ticket is ready. Keep this page or take a screenshot.');}
  catch(x){setError(x instanceof Error?x.message:'RSVP could not be confirmed.');}finally{setBusy(false);}}
 async function resend(){if(!ticket)return;setBusy(true);setError('');setNote('');
  try{await post({op:'resend',ticketId:ticket.id});setNote('Sent to '+ticket.email+'.');}catch(x){setError(x instanceof Error?x.message:'The email could not be sent.');}finally{setBusy(false);}}
 if(ticket)return <>
  <section className="cc-ticket" aria-labelledby="cc-ticket-title">
   <p className="ui-eyebrow">Your ticket</p>
   <h2 id="cc-ticket-title">{event.title}</h2>
   <p className="cc-ticket-when">{whenLine(event)}</p>
   <div className="cc-qr" role="img" aria-label="Ticket QR code" dangerouslySetInnerHTML={{__html:ticket.qrSvg}}/>
   <p className="cc-ticket-name">{ticket.name}</p>
   <p className="cc-hint">Party of {ticket.partySize} · {event.venue}</p>
   {ticket.checkedInAt?<Tag tone="success">Checked in at {formatStamp(ticket.checkedInAt)}</Tag>:<p className="cc-hint">Show this code at the door.</p>}
  </section>
  <div className="cc-actions">
   <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void resend()}>Email my ticket</button>
   <a className="ui-button ui-button-quiet" href={ticket.url}>Open ticket page</a>
  </div>
  {note?<p className="cc-note" role="status">{note}</p>:null}{error?<p className="cc-error" role="alert">{error}</p>:null}
  <Program items={event.program}/>
 </>;
 return <>
  <EventCard event={event}/>
  {event.rsvpOpen&&seatsLeft(event)!==0?<form className="cc-form" onSubmit={rsvp}>
   <SectionHeader title="RSVP"/>
   <label className="ui-field"><span>Email for your ticket</span><input className="ui-input" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label className="ui-field"><span>How many people, including you</span><select className="ui-input" value={party} onChange={e=>setParty(Number(e.target.value))}>{Array.from({length:MAX_PARTY},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
   <button className="ui-button ui-button-block" disabled={busy}>{busy?'Saving…':'RSVP and get my ticket'}</button>
   {error?<p className="cc-error" role="alert">{error}</p>:null}
  </form>:<p className="cc-hint">{event.rsvpOpen?'The concert is full.':'RSVP is closed.'}</p>}
  {note?<p className="cc-note" role="status">{note}</p>:null}
  <Program items={event.program}/>
 </>;
}

function InviteView({data}:{data:Data}){
 const [copied,setCopied]=useState(false);
 const message=`You're invited to ${data.event?.title??'the Healing Concert'}. RSVP here to get your free ticket: ${data.inviteUrl}`;
 async function share(){
  try{if(navigator.share){await navigator.share({title:data.event?.title??'Healing Concert',text:message});return;}}catch{return;}
  try{await navigator.clipboard.writeText(message);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{setCopied(false);}
 }
 return <>
  <Glass className="cc-invite">
   <h2>Invite someone</h2>
   <p className="cc-hint">Anyone with your link can RSVP, even without an LV Zion account. They get their own ticket by email, and the guest list shows that you invited them.</p>
   <p className="cc-link">{data.inviteUrl}</p>
   <div className="cc-actions">
    <button type="button" className="ui-button" onClick={()=>void share()}>{copied?'Copied':'Share invite link'}</button>
    <a className="ui-button ui-button-secondary" href={'sms:?&body='+encodeURIComponent(message)}>Send as text</a>
   </div>
  </Glass>
  <StatGrid label="Your invitations"><StatTile label="Guests who RSVP'd through you" value={data.invitedCount}/></StatGrid>
 </>;
}

function GuestsView({data}:{data:Data}){
 const [list,setList]=useState<Attendance|null>(null),[error,setError]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState('');
 const load=useCallback(async()=>{try{setList(parseAttendance(await readJSON(await fetch('/api/concert/attendance',{cache:'no-store'}))));setError('');}catch(x){setError(x instanceof Error?x.message:'Unable to load the guest list.');}},[]);
 useEffect(()=>{void load();const t=setInterval(()=>void load(),15000);return()=>clearInterval(t);},[load]);
 const shown=useMemo(()=>{const q=query.trim().toLowerCase();return (list?.tickets??[]).filter(t=>!q||t.name.toLowerCase().includes(q)||t.email.includes(q));},[list,query]);
 async function act(op:'checkin'|'undo'|'cancel'|'resend',ticketId:string,name:string){
  if(op==='cancel'&&!window.confirm(`Remove ${name}'s ticket? Their QR code will stop working.`))return;
  setBusy(ticketId);try{await post({op,ticketId});await load();}catch(x){setError(x instanceof Error?x.message:'Save could not be confirmed.');}finally{setBusy('');}
 }
 if(!data.event)return null;
 const tickets=list?.tickets??[],seats=tickets.reduce((n,t)=>n+t.partySize,0),arrived=tickets.filter(t=>t.checkedInAt),arrivedSeats=arrived.reduce((n,t)=>n+t.partySize,0);
 return <>
  <StatGrid label="Attendance">
   <StatTile label="RSVPs" value={tickets.length} note={`${seats} people`}/>
   <StatTile label="Arrived" value={arrived.length} note={`${arrivedSeats} people`} tone="accent"/>
  </StatGrid>
  <div className="cc-actions"><a className="ui-button" href="/modules/concert/scan">Scan tickets</a><a className="ui-button ui-button-secondary" href="/api/concert/attendance?format=csv">Download list</a></div>
  <SearchField label="Search guests" placeholder="Search by name or email" value={query} onChange={e=>setQuery(e.target.value)}/>
  {error?<p className="cc-error" role="alert">{error}</p>:null}
  {list===null&&!error?<p className="cc-hint" role="status">Loading guests…</p>:null}
  {list&&!tickets.length?<EmptyState icon={<UsersRound size={28}/>} title="No RSVPs yet">Share invite links to start the guest list.</EmptyState>:null}
  <ul className="ui-list cc-guests">{shown.map(t=><li key={t.id}>
   <Row lead={<IconBox round>{t.checkedInAt?<Check size={20}/>:<UsersRound size={20}/>}</IconBox>} title={t.name}
    detail={<>{t.email}{t.phone?' · '+t.phone:''}<br/>Party of {t.partySize}{t.invitedBy?' · invited by '+t.invitedBy:t.member?' · member':''}{t.checkedInAt?` · arrived ${formatStamp(t.checkedInAt)}`:''}</>}
    end={<span className="cc-row-actions">
     {t.checkedInAt?<button type="button" className="ui-button ui-button-quiet" disabled={busy===t.id} onClick={()=>void act('undo',t.id,t.name)}>Undo</button>
      :<button type="button" className="ui-button ui-button-secondary" disabled={busy===t.id} onClick={()=>void act('checkin',t.id,t.name)}>Check in</button>}
     <button type="button" className="ui-button ui-button-quiet" disabled={busy===t.id} onClick={()=>void act('resend',t.id,t.name)}>Resend</button>
     {!t.checkedInAt?<button type="button" className="ui-button ui-button-quiet" disabled={busy===t.id} onClick={()=>void act('cancel',t.id,t.name)}>Remove</button>:null}
    </span>}/>
  </li>)}</ul>
 </>;
}

function SettingsView({data,reload,onCreated}:{data:Data;reload:()=>Promise<void>;onCreated:()=>void}){
 const e=data.event;
 const [form,setForm]=useState({title:e?.title??'Healing Concert',date:e?.date??'',startTime:e?.startTime??'',doorsTime:e?.doorsTime??'',venue:e?.venue??'',details:e?.details??'',capacity:e?.capacity?.toString()??'',rsvpOpen:e?.rsvpOpen??true});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
 const set=(k:keyof typeof form)=>(ev:{target:{value:string}})=>setForm(f=>({...f,[k]:ev.target.value}));
 async function save(ev:FormEvent){ev.preventDefault();setBusy(true);setError('');setNote('');
  const fields={title:form.title,date:form.date,startTime:form.startTime,doorsTime:form.doorsTime||null,venue:form.venue,details:form.details,capacity:form.capacity?Number(form.capacity):null,rsvpOpen:form.rsvpOpen};
  try{await post(e?{op:'edit',eventId:e.id,expectedVersion:e.version,...fields}:{op:'create',...fields});await reload();if(e)setNote('Saved.');else onCreated();}
  catch(x){setError(x instanceof Error?x.message:'Save could not be confirmed.');}finally{setBusy(false);}}
 async function archive(){if(!e||!window.confirm('Close this concert for good? RSVPs stop and its tickets no longer scan. The guest list is kept.'))return;
  setBusy(true);try{await post({op:'archive',eventId:e.id,expectedVersion:e.version});await reload();}catch(x){setError(x instanceof Error?x.message:'Could not close the concert.');}finally{setBusy(false);}}
 return <form className="cc-form" onSubmit={save}>
  <SectionHeader title={e?'Concert details':'Set up the concert'}/>
  <label className="ui-field"><span>Name</span><input className="ui-input" required maxLength={80} value={form.title} onChange={set('title')}/></label>
  <label className="ui-field"><span>Date</span><input className="ui-input" type="date" required value={form.date} onChange={set('date')}/></label>
  <div className="cc-two"><label className="ui-field"><span>Doors open</span><input className="ui-input" type="time" value={form.doorsTime} onChange={set('doorsTime')}/></label>
   <label className="ui-field"><span>Starts</span><input className="ui-input" type="time" required value={form.startTime} onChange={set('startTime')}/></label></div>
  <label className="ui-field"><span>Venue</span><input className="ui-input" required maxLength={120} value={form.venue} onChange={set('venue')}/></label>
  <label className="ui-field"><span>Details for guests (optional)</span><textarea className="ui-input" rows={3} maxLength={600} value={form.details} onChange={set('details')}/></label>
  <label className="ui-field"><span>Seats (blank for no limit)</span><input className="ui-input" type="number" min={1} max={5000} inputMode="numeric" value={form.capacity} onChange={set('capacity')}/></label>
  <label className="cc-check"><input type="checkbox" checked={form.rsvpOpen} onChange={ev=>setForm(f=>({...f,rsvpOpen:ev.target.checked}))}/><span>RSVP is open</span></label>
  <button className="ui-button ui-button-block" disabled={busy}>{busy?'Saving…':e?'Save changes':'Create concert'}</button>
  {note?<p className="cc-note" role="status">{note}</p>:null}{error?<p className="cc-error" role="alert">{error}</p>:null}
  {e?<button type="button" className="ui-button ui-button-quiet" disabled={busy} onClick={()=>void archive()}>Close this concert</button>:null}
 </form>;
}


const blank=():ProgramEntry=>({songNumber:null,title:'',duration:null,performers:null});
function ProgramEditor({reload}:{reload:()=>Promise<void>}){
 const [items,setItems]=useState<ProgramEntry[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
 useEffect(()=>{void(async()=>{try{const d=await readJSON(await fetch('/api/concert?program=full',{cache:'no-store'})) as {items:unknown};setItems(parseProgramEntries(d.items));}catch(x){setError(x instanceof Error?x.message:'Unable to load the program.');}})();},[]);
 const update=(i:number,k:keyof ProgramEntry,v:string)=>setItems(list=>list!.map((it,n)=>n===i?{...it,[k]:k==='title'?v:(v||null)}:it));
 const move=(i:number,d:number)=>setItems(list=>{const l=[...list!];const j=i+d;if(j<0||j>=l.length)return l;[l[i],l[j]]=[l[j],l[i]];return l;});
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNote('');
  try{await post({op:'program',items:(items??[]).filter(it=>it.title.trim()||it.songNumber||it.duration||it.performers)});await reload();setNote('Program saved.');}
  catch(x){setError(x instanceof Error?x.message:'Save could not be confirmed.');}finally{setBusy(false);}}
 if(!items)return error?<p className="cc-error" role="alert">{error}</p>:<p className="cc-hint" role="status">Loading the program…</p>;
 return <form className="cc-form cc-program-edit" onSubmit={save} aria-label="Program">
  <SectionHeader title="Program"/>
  <p className="cc-hint">Everyone sees the order, title and performers. Song numbers and times are only shown here.</p>
  {items.map((it,i)=><fieldset className="cc-program-row" key={i} aria-label={`Song ${i+1}`}>
   <label className="ui-field"><span>No.</span><input className="ui-input" maxLength={12} value={it.songNumber??''} onChange={e=>update(i,'songNumber',e.target.value)}/></label>
   <label className="ui-field"><span>Song {i+1} title</span><input className="ui-input" maxLength={120} value={it.title} onChange={e=>update(i,'title',e.target.value)}/></label>
   <label className="ui-field"><span>Time</span><input className="ui-input" maxLength={5} placeholder="3:08" inputMode="numeric" value={it.duration??''} onChange={e=>update(i,'duration',e.target.value)}/></label>
   <label className="ui-field"><span>Performers</span><input className="ui-input" maxLength={120} value={it.performers??''} onChange={e=>update(i,'performers',e.target.value)}/></label>
   <span className="cc-row-tools">
    <button type="button" className="ui-button ui-button-quiet" disabled={i===0} onClick={()=>move(i,-1)} aria-label={`Move song ${i+1} up`}>Up</button>
    <button type="button" className="ui-button ui-button-quiet" disabled={i===items.length-1} onClick={()=>move(i,1)} aria-label={`Move song ${i+1} down`}>Down</button>
    <button type="button" className="ui-button ui-button-quiet" onClick={()=>setItems(l=>l!.filter((_,n)=>n!==i))} aria-label={`Remove song ${i+1}`}>Remove</button>
   </span>
  </fieldset>)}
  <button type="button" className="ui-button ui-button-secondary" disabled={items.length>=40} onClick={()=>setItems(l=>[...l!,blank()])}>Add a song</button>
  <button className="ui-button ui-button-block" disabled={busy}>{busy?'Saving…':'Save program'}</button>
  {note?<p className="cc-note" role="status">{note}</p>:null}{error?<p className="cc-error" role="alert">{error}</p>:null}
 </form>;
}

export default function ConcertWorkspace(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[signedOut,setSignedOut]=useState(false),[notice,setNotice]=useState(''),[view,setView]=useState<View>('ticket');
 const load=useCallback(async()=>{try{setData(await readJSON(await fetch('/api/concert',{cache:'no-store'})) as Data);setError('');}catch(x){setSignedOut(x instanceof SessionError);setError(x instanceof Error?x.message:'Unable to load the concert.');}},[]);
 useEffect(()=>{void load();if(window.location.hash==='#guests')setView('guests');},[load]);
 const manage=data?.canManage??false;
 const more=useMemo(()=>manage?[{label:'Guest list',icon:'people' as const,onClick:()=>setView('guests'),active:view==='guests'},{label:'Scan tickets',icon:'clipboard' as const,href:'/modules/concert/scan'},{label:'Concert settings',icon:'calendar' as const,onClick:()=>setView('settings'),active:view==='settings'}]:[],[manage,view]);
 const left=useMemo(()=>({label:'My ticket',short:'Ticket',icon:'music' as const,onClick:()=>setView('ticket'),active:view==='ticket'}),[view]);
 const right=useMemo(()=>({label:'Invite',icon:'people' as const,onClick:()=>setView('invite'),active:view==='invite'}),[view]);
 return <main className="ui-main ui-narrow cc-page">
  <FrameControls title="Healing Concert" left={left} right={right} more={more}/>
  {signedOut?<EmptyState icon={<Music size={28}/>} title="Healing Concert" action={<a className="ui-button" href="/sign-in">Sign in</a>}>{error}</EmptyState>
   :error?<p className="cc-error" role="alert">{error}</p>:null}
  {!data&&!error?<p className="cc-hint" role="status">Loading…</p>:null}
  {notice&&view==='ticket'?<p className="cc-note" role="status">{notice}</p>:null}
  {data&&!data.event&&view!=='settings'?<EmptyState icon={<Music size={28}/>} title="No concert is open yet"
   action={manage?<button type="button" className="ui-button" onClick={()=>setView('settings')}>Set up the concert</button>:undefined}>When the concert is set up, you can RSVP and invite guests here.</EmptyState>:null}
  {data&&data.event&&view==='ticket'?<TicketView data={data} reload={load}/>:null}
  {data&&data.event&&view==='invite'?<InviteView data={data}/>:null}
  {data&&manage&&view==='guests'?<GuestsView data={data}/>:null}
  {data&&manage&&view==='settings'?<SettingsView data={data} reload={load} onCreated={()=>{setView('ticket');setNotice('The concert is open for RSVPs.');}}/>:null}
  {data&&manage&&view==='settings'&&data.event?<ProgramEditor key={data.event.id} reload={load}/>:null}
 </main>;
}
