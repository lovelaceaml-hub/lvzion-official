'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import MotionInvitation, {type PromoMedia} from './motion-invitation';
import Registration from './registration';
import {FrameControls} from '../app-frame';
import {EmptyState,IconBox,Row,SearchField,SectionHeader,StatGrid,StatTile} from '../ui-kit';
import {Check,Music,UsersRound} from '../home-icons';
import {MAX_PARTY,formatStamp,parseAttendance,parseProgramEntries,seatsLeft,type Attendance,type ConcertEvent,type ProgramEntry,type PublicEvent,type Workspace} from '../../lib/concert/domain';
import {concertDetails,concertDisplayTitle,concertWhen,isPeaceConcert,PEACE_CONCERT_ITINERARY,PEACE_CONCERT_START} from '../../lib/concert/branding';
import {ConcertHero,ConcertSectionHeading} from './event-design';
import ConcertDialog from './concert-dialog';
import ConcertInfo from './concert-info';
import TicketCard from './ticket-card';
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

function TicketView({data,reload,media}:{data:Data;media:PromoMedia;reload:()=>Promise<void>}){
 const event=data.event!;const ticket=data.myTicket;
 const available=seatsLeft(event);
 const [email,setEmail]=useState(data.email),[party,setParty]=useState(1),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[error,setError]=useState('');
 async function rsvp(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNote('');
  try{const r=await post({op:'rsvp',email,partySize:party}) as {emailed?:boolean};await reload();setNote(r.emailed?'Your ticket is ready and a copy was emailed to you.':'Your ticket is ready. Keep this page or take a screenshot.');}
  catch(x){setError(x instanceof Error?x.message:'RSVP could not be confirmed.');}finally{setBusy(false);}}
 async function resend(){if(!ticket)return;setBusy(true);setError('');setNote('');
  try{await post({op:'resend',ticketId:ticket.id});setNote('Sent to '+ticket.email+'.');}catch(x){setError(x instanceof Error?x.message:'The email could not be sent.');}finally{setBusy(false);}}
 if(ticket)return <>
  <TicketCard event={event} name={ticket.name} partySize={ticket.partySize} svg={ticket.qrSvg} checkedInAt={ticket.checkedInAt}/>
  <div className="cc-ticket-actions">
   <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void resend()}>Email my ticket</button>
   <a className="ui-button ui-button-quiet" href={ticket.url}>Open ticket page</a>
   <ConcertInfo event={event}/>
  </div>
  {note?<p className="cc-note" role="status">{note}</p>:null}{error?<p className="cc-error" role="alert">{error}</p>:null}
 </>;
 if(isPeaceConcert(event)&&event.publicRsvp)return <MotionInvitation event={event} media={media}
  action={event.rsvpOpen&&available!==0?<Registration event={event} eventId={event.id} showPoster/>:<p role="status">{event.rsvpOpen?'The concert is full.':'Registration is closed.'}</p>}
  extra={<ConcertInfo event={event}/>}/>;
 return <>
  <ConcertHero event={event}/>
  <div className="cc-landing-actions">
   {event.rsvpOpen&&available!==0?event.publicRsvp?<Registration event={event} eventId={event.id} showPoster={isPeaceConcert(event)}/>:<ConcertDialog label="RSVP" title="Reserve your seats" primary presentation="registration" showPoster={isPeaceConcert(event)}>
    <form className="cc-registration cc-reg-form" onSubmit={rsvp}>
     {available!==null?<p className="cc-hint">{available} of {event.capacity} seats left</p>:null}
     <label className="ui-field"><span>Email for your ticket</span><input className="ui-input" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
     <label className="ui-field"><span>How many people, including you</span><select className="ui-input" value={party} onChange={e=>setParty(Number(e.target.value))}>{Array.from({length:MAX_PARTY},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
     <button className="ui-button ui-button-block" disabled={busy}>{busy?'Saving…':'RSVP and get my ticket'}</button>
     {error?<p className="cc-error" role="alert">{error}</p>:null}
    </form>
   </ConcertDialog>:<p className="cc-warning">{event.rsvpOpen?'The concert is full.':'RSVP is closed.'}</p>}
   <ConcertInfo event={event}/>
  </div>
 </>;
}

function InviteView({event,inviteUrl,invitedCount}:{event:ConcertEvent;inviteUrl:string;invitedCount:number}){
 const [shareStatus,setShareStatus]=useState('');
 const [qrImage,setQrImage]=useState('');
 const [qrError,setQrError]=useState(false);
 const title=concertDisplayTitle(event);
 const message=`You're invited to ${title}.\n${concertWhen(event)}\n${event.venue}\nRSVP for your free ticket: ${inviteUrl}`;
 useEffect(()=>{
  let active=true;
  async function loadQr(){
   try{
    const {default: QRCode}=await import('qrcode');
    const image=await QRCode.toDataURL(inviteUrl,{width:768,margin:4,errorCorrectionLevel:'M'});
    if(active)setQrImage(image);
   }catch{
    if(active)setQrError(true);
   }
  }
  void loadQr();
  return ()=>{active=false;};
 },[inviteUrl]);
 async function share(){
  setShareStatus('');
  try{if(navigator.share){await navigator.share({title,text:message});return;}}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(message);setShareStatus('Invitation copied, including the RSVP link.');}catch{setShareStatus('Select and copy the invitation link above.');}
 }
 return <>
  <ConcertHero event={event}/>
  <section className="cc-panel cc-invite" aria-labelledby="cc-share-title">
   <h2 id="cc-share-title">Share your invitation</h2>
   <p className="cc-hint">{event.publicRsvp?'Share this RSVP link or invitation QR. Each guest receives their own QR ticket for the door.':'Guests can scan your QR or open your personal link to RSVP. Each guest receives a QR ticket for the door.'}</p>
   <div className="cc-invite-qr">
    {qrImage?<>
     <p className="cc-kicker">Scan to RSVP</p>
     <img src={qrImage} width={224} height={224} alt="Invitation QR code to open the guest RSVP"/>
     <a className="ui-button ui-button-secondary" href={qrImage} download="healing-concert-rsvp-qr.png">Download invitation QR</a>
    </>:<p className="cc-hint" role="status">{qrError?'The invitation QR could not load. You can still share your invite link.':'Preparing invitation QR…'}</p>}
   </div>
   <p className="cc-link">{inviteUrl}</p>
   <div className="cc-actions">
    {event.publicRsvp?<Registration event={event} eventId={event.id} mode="invite" showPoster={isPeaceConcert(event)}/>:null}
    <button type="button" className="ui-button" onClick={()=>void share()}>Share invite link</button>
    <a className="ui-button ui-button-secondary" href={'sms:?&body='+encodeURIComponent(message)}>Send as text</a>
    {qrImage?<button type="button" className="ui-button ui-button-secondary" onClick={()=>window.print()}>Print invitation</button>:null}
   </div>
   {shareStatus?<p className="cc-hint" role="status">{shareStatus}</p>:null}
  </section>
  {event.publicRsvp?null:<StatGrid label="Your invitations"><StatTile label="Guests who RSVP’d through you" value={invitedCount}/></StatGrid>}
 </>;
}

type Report={invitationCount:number;invitations:{id:string;name:string;details:{title:string;organization:string;category:string}|null;registered:boolean;sender:string;relationship:string;firstVisit:boolean}[];intake:{id:string;name:string;title:string;location:string;leader:string;memberId:string|null}[]};

function GuestsView({data}:{data:Data}){
 const [report,setReport]=useState<Report|null>(null);
 const [list,setList]=useState<Attendance|null>(null),[error,setError]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState('');
 const load=useCallback(async()=>{try{setList(parseAttendance(await readJSON(await fetch('/api/concert/attendance',{cache:'no-store'}))));setError('');}catch(x){setError(x instanceof Error?x.message:'Unable to load the guest list.');}},[]);
 useEffect(()=>{
  const refresh=()=>{void load();void fetch('/api/concert/report',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(setReport).catch(()=>undefined);};
  refresh();const t=setInterval(refresh,15000);return()=>clearInterval(t);
 },[load]);
 const shown=useMemo(()=>{const q=query.trim().toLowerCase();return (list?.tickets??[]).filter(t=>!q||t.name.toLowerCase().includes(q)||t.email.includes(q)||t.additionalNames?.some(name=>name.toLowerCase().includes(q)));},[list,query]);
 async function act(op:'checkin'|'undo'|'cancel'|'resend',ticketId:string,name:string){
  if(op==='cancel'&&!window.confirm(`Remove ${name}'s ticket? Their QR code will stop working.`))return;
  setBusy(ticketId);try{await post({op,ticketId});await load();}catch(x){setError(x instanceof Error?x.message:'Save could not be confirmed.');}finally{setBusy('');}
 }
 if(!data.event)return null;
 const tickets=list?.tickets??[],seats=tickets.reduce((n,t)=>n+t.partySize,0),arrived=tickets.filter(t=>t.checkedInAt),arrivedSeats=arrived.reduce((n,t)=>n+t.partySize,0);
 return <>
  <ConcertSectionHeading title="Guest list" event={data.event}/>
  <StatGrid label="Attendance">
   {report?<StatTile label="Invitations" value={report.invitationCount}/>:null}
   <StatTile label="Reserved seats" value={seats}/>
   <StatTile label="Checked in" value={arrivedSeats} tone="accent"/>
  </StatGrid>
  <div className="cc-actions"><a className="ui-button" href="/modules/concert/scan">Scan tickets</a><a className="ui-button ui-button-secondary" href="/api/concert/attendance?format=csv">Download list</a></div>
  <SearchField label="Search guests" placeholder="Search by name or email" value={query} onChange={e=>setQuery(e.target.value)}/>
  {error?<p className="cc-error" role="alert">{error}</p>:null}
  {list===null&&!error?<p className="cc-hint" role="status">Loading guests…</p>:null}
  {list&&!tickets.length?<EmptyState icon={<UsersRound size={28}/>} title="No RSVPs yet">Share invite links to start the guest list.</EmptyState>:null}
  <ul className="ui-list cc-guests">{shown.map(t=><li key={t.id}>
   <Row lead={<IconBox round>{t.checkedInAt?<Check size={20}/>:<UsersRound size={20}/>}</IconBox>} title={t.name}
    detail={<>{t.email}{t.phone?' · '+t.phone:''}<br/>Party of {t.partySize}{t.invitedBy?' · invited by '+t.invitedBy:t.member?' · member':''}{t.checkedInAt?` · arrived ${formatStamp(t.checkedInAt)}`:''}{t.additionalNames?.length ? <><br/>{t.additionalNames.join(', ')}</> : null}</>}
    end={<span className="cc-row-actions">
     {t.checkedInAt?<button type="button" className="ui-button ui-button-quiet" disabled={busy===t.id} onClick={()=>void act('undo',t.id,t.name)}>Undo</button>
      :<button type="button" className="ui-button ui-button-secondary" disabled={busy===t.id} onClick={()=>void act('checkin',t.id,t.name)}>Check in</button>}
     {t.email?<button type="button" className="ui-button ui-button-quiet" disabled={busy===t.id} onClick={()=>void act('resend',t.id,t.name)}>Resend</button>:null}
     {!t.checkedInAt?<button type="button" className="ui-button ui-button-quiet" disabled={busy===t.id} onClick={()=>void act('cancel',t.id,t.name)}>Remove</button>:null}
    </span>}/>
  </li>)}</ul>
  {report?.invitations.length ? <details className="cc-panel cc-registration"><summary>Named invitations</summary>
   <ul className="cc-reg-results">{report.invitations.map(item=><li key={item.id}>
    <strong>{item.name}{item.details?<span className="cc-vip-badge">VIP</span>:null}</strong>
    <span>Invited by {item.sender} · {item.relationship}</span>
    {item.details?<span>{item.details.title} · {item.details.organization} · {item.details.category}</span>:null}
    <small>{item.registered?'Registered':'Invited'}{item.firstVisit?' · First visit':''}</small>
   </li>)}</ul>
  </details>:null}
  {report?.intake.length ? <details className="cc-panel cc-registration"><summary>Member registrations</summary>
   <ul className="cc-reg-results">{report.intake.map(item=><li key={item.id}>
    <strong>{item.title} {item.name}</strong><span>{item.location && item.location + ' · '}Group leader {item.leader}</span>
    <small>{item.memberId?'Account linked':'Awaiting account setup'}</small>
   </li>)}</ul>
   <a className="cc-reg-link" href="/modules/concert/placement">Review group placements</a>
  </details>:null}
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
 const flyerDraft=[form.details.trim(),PEACE_CONCERT_ITINERARY].filter(Boolean).join('\n\n');
 const canAddFlyerItinerary=isPeaceConcert(form)&&form.startTime===PEACE_CONCERT_START&&
  !concertDetails(form.details).itinerary.length&&flyerDraft.length<=600;
 return <form className="cc-form cc-panel" onSubmit={save}>
  <SectionHeader title={e?'Event information':'Set up the concert'}/>
  <label className="ui-field"><span>Name</span><input className="ui-input" required maxLength={80} value={form.title} onChange={set('title')}/></label>
  <label className="ui-field"><span>Date</span><input className="ui-input" type="date" required value={form.date} onChange={set('date')}/></label>
  <div className="cc-two"><label className="ui-field"><span>Doors open</span><input className="ui-input" type="time" value={form.doorsTime} onChange={set('doorsTime')}/></label>
   <label className="ui-field"><span>Starts</span><input className="ui-input" type="time" required value={form.startTime} onChange={set('startTime')}/></label></div>
  <label className="ui-field"><span>Venue</span><input className="ui-input" required maxLength={120} value={form.venue} onChange={set('venue')}/></label>
  <label className="ui-field"><span>Details for guests (optional)</span><textarea className="ui-input" rows={3} maxLength={600} value={form.details} onChange={set('details')}/></label>
  {canAddFlyerItinerary?<button type="button" className="ui-button ui-button-secondary" onClick={()=>setForm({...form,details:flyerDraft})}>Add flyer itinerary to draft</button>:null}
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
 return <form className="cc-form cc-panel cc-program-edit" onSubmit={save} aria-label="Program">
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

export default function ConcertWorkspace({media,shared}:{media:PromoMedia;shared?:{event:PublicEvent;eventId:string;open:boolean;full:boolean}}){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[signedOut,setSignedOut]=useState(false),[notice,setNotice]=useState(''),[view,setView]=useState<View>('ticket');
 const load=useCallback(async()=>{try{setData(await readJSON(await fetch('/api/concert',{cache:'no-store'})) as Data);setError('');}catch(x){setSignedOut(x instanceof SessionError);setError(x instanceof Error?x.message:'Unable to load the concert.');}},[]);
 useEffect(()=>{void load();if(window.location.hash==='#guests')setView('guests');},[load]);
 const manage=data?.canManage??false;
 const [canPlace,setCanPlace]=useState(false);
 useEffect(()=>{
  if (!data) return;
  const controller=new AbortController();
  void fetch('/api/concert/placement',{cache:'no-store',signal:controller.signal})
    .then(r=>{if(!controller.signal.aborted)setCanPlace(r.ok);}).catch(()=>undefined);
  return()=>controller.abort();
 },[data]);
 const more=useMemo(()=>[...(manage?[{label:'Guest list',icon:'people' as const,onClick:()=>setView('guests'),active:view==='guests'},{label:'Scan tickets',icon:'clipboard' as const,href:'/modules/concert/scan'},{label:'Concert settings',icon:'calendar' as const,onClick:()=>setView('settings'),active:view==='settings'}]:[]),...(canPlace?[{label:'Group placements',icon:'people' as const,href:'/modules/concert/placement'}]:[])],[manage,view,canPlace]);
 const left=useMemo(()=>({label:'My ticket',short:'Ticket',icon:'music' as const,onClick:()=>setView('ticket'),active:view==='ticket'}),[view]);
 const right=useMemo(()=>({label:'Invite',icon:'people' as const,onClick:()=>setView('invite'),active:view==='invite'}),[view]);
 return <main className={'ui-main ui-narrow cc-page'+(view==='ticket'?' cc-attendee':'')} data-concert-view={view}>
  {!signedOut && <FrameControls title="Event Invitation and Registration" left={left} right={right} more={more}/>}
  {signedOut && shared && isPeaceConcert(shared.event) ? <MotionInvitation event={shared.event} media={media}
   action={shared.open && !shared.full ? <Registration event={shared.event} eventId={shared.eventId} showPoster/> : <p>{shared.open ? 'The concert is full' : 'Registration is closed'}</p>}
   extra={<a className="ml-member-access" href="/sign-in?continue=concert">Member sign-in</a>}/> : signedOut?<EmptyState icon={<Music size={28}/>} title="Event Invitation and Registration" action={<div className="cc-actions"><a className="ui-button" href="/concert/rsvp">Open event registration</a><a className="ui-button ui-button-secondary" href="/sign-in?continue=concert">Sign in</a></div>}>{error}</EmptyState>
   :error?<p className="cc-error" role="alert">{error}</p>:null}
  {!data&&!error?<p className="cc-hint" role="status">Loading…</p>:null}
  {notice&&view==='ticket'?<p className="cc-note" role="status">{notice}</p>:null}
  {data&&!data.event&&view!=='settings'?<EmptyState icon={<Music size={28}/>} title="No concert is open yet"
   action={manage?<button type="button" className="ui-button" onClick={()=>setView('settings')}>Set up the concert</button>:undefined}>When the concert is set up, you can RSVP and invite guests here.</EmptyState>:null}
  {data&&data.event&&view==='ticket'?<TicketView media={media} data={data} reload={load}/>:null}
  {data?.event && view==='invite' && isPeaceConcert(data.event) && data.event.publicRsvp ?
   <MotionInvitation event={data.event} media={media} action={<Registration event={data.event} eventId={data.event.id} mode="invite" showPoster/>}
    note="Create a personal invitation link for each guest."/> :
   data&&data.event&&view==='invite'?<InviteView key={data.inviteUrl} event={data.event} inviteUrl={data.inviteUrl} invitedCount={data.invitedCount}/>:null}
  {data&&manage&&view==='guests'?<GuestsView data={data}/>:null}
  {data&&manage&&view==='settings'?<><ConcertSectionHeading title="Concert settings" event={data.event}/><SettingsView data={data} reload={load} onCreated={()=>{setView('ticket');setNotice('The concert is open for RSVPs.');}}/></>:null}
  {data&&manage&&view==='settings'&&data.event?<ProgramEditor key={data.event.id} reload={load}/>:null}
 </main>;
}
