'use client';

import {useEffect,useRef,useState,type DOMAttributes,type ReactNode} from 'react';
import {concertCalendar,concertDisplayTitle} from '../../lib/concert/branding';
import type {PublicEvent} from '../../lib/concert/domain';
import type {NamedTicket} from '../../lib/concert/registration';
import {passImages} from './pass-images';
import TicketCard from './ticket-card';

type Panel='options'|'photo'|'all';
export default function TicketWallet({event,tickets,embedded=false,extraOptions}:{event:PublicEvent;tickets:NamedTicket[];embedded?:boolean;extraOptions?:ReactNode}) {
  const [index,setIndex]=useState(0);
  const [panel,setPanel]=useState<Panel>('options');
  const [prepared,setPrepared]=useState<Awaited<ReturnType<typeof passImages>>>();
  const [imageUrl,setImageUrl]=useState('');
  const [notice,setNotice]=useState('');
  const [sending,setSending]=useState(false);
  const modal=useRef<HTMLDialogElement>(null);
  const scanDialog=useRef<HTMLDialogElement>(null);
  const swiped=useRef(false);
  const start=useRef<{x:number;y:number}|null>(null);
  const ticket=tickets[index] ?? tickets[0];
  const title=concertDisplayTitle(event);
  const calendar=concertCalendar(event);
  useEffect(()=>{
    let active=true;
    setPrepared(undefined);
    passImages(tickets,title).then(value=>{if(active)setPrepared(value);}).catch(()=>{});
    return ()=>{active=false;};
  },[tickets,title]);
  useEffect(()=>{
    if (!ticket) return;
    const file=panel==='all' ? prepared?.sheet : prepared?.files[index];
    const url=file ? URL.createObjectURL(file) : '';
    setImageUrl(url);
    return ()=>{if(url)URL.revokeObjectURL(url);};
  },[prepared,index,ticket,panel]);
  if(!ticket)return null;
  function show(next:Panel,message=''){
    setNotice(message);setPanel(next);
    if(!modal.current?.open)modal.current?.showModal();
  }
  async function save(all:boolean){
    const files=all ? prepared?.files : prepared && [prepared.files[index]];
    if(files && navigator.canShare?.({files})){
      try{await navigator.share({files});return;}
      catch(error){if(error instanceof DOMException && error.name==='AbortError')return;}
    }
    show(all?'all':'photo');
  }
  async function resend(){
    setSending(true);setNotice('');
    try{
      const res=await fetch(tickets[0].url+'/resend',{method:'POST',mode:'same-origin',referrerPolicy:'origin',headers:{'Content-Type':'application/json'},body:'{}'});
      const data=await res.json();
      setNotice(res.ok?'Sent to the registration email.':data.error || 'Email delivery failed. Please try again.');
    }catch{setNotice('Email delivery failed. Please try again.');}
    finally{setSending(false);}
  }
  async function share(){
    try{
      if(navigator.share)await navigator.share({title:ticket.name+' · Concert ticket',url:ticket.url});
      else{await navigator.clipboard.writeText(ticket.url);show('options','Ticket link copied.');}
    }catch(error){if(!(error instanceof DOMException && error.name==='AbortError'))show('options','Use Open QR ticket to copy the address.');}
  }
  const picker=tickets.length>1 ? <div className="cc-pass-identity"><strong>{ticket.name}</strong>
    <div className="cc-pass-dots" aria-label="Choose a ticket">{tickets.map((t,i)=><button type="button" key={t.id}
      aria-label={'Ticket '+(i+1)+' of '+tickets.length+' · '+t.name} aria-pressed={i===index}
      onClick={()=>setIndex(i)}>{i+1}</button>)}</div></div>:undefined;
  const swipeHandlers: DOMAttributes<HTMLDivElement> = {
    onPointerDown(e) {
      if (!e.isPrimary || e.button !== 0) return;
      swiped.current = false;
      const control = (e.target as Element).closest('button,a');
      if (control && !control.matches('.cc-ticket-enlarge')) return;
      start.current = {x:e.clientX, y:e.clientY};
      (control ?? e.currentTarget).setPointerCapture(e.pointerId);
    },
    onPointerCancel() { start.current = null; },
    onPointerUp(e) {
      const point = start.current;
      start.current = null;
      if (!point) return;
      const dx = e.clientX - point.x, dy = e.clientY - point.y;
      if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        swiped.current = true;
        setIndex(i => Math.max(0, Math.min(tickets.length - 1, i + (dx < 0 ? 1 : -1))));
      }
    },
    onClickCapture(e) {
      if (swiped.current && e.detail > 0) e.stopPropagation();
    },
  };
  return <div className="cc-ticket-view cc-pass-deck">
    <div className="cc-pass-gesture" {...swipeHandlers}>
      <TicketCard event={event} name={ticket.name} partySize={ticket.partySize} svg={ticket.svg} checkedInAt={ticket.checkedInAt}
        onEnlargeQr={()=>scanDialog.current?.showModal()} attendeePicker={picker} compact embedded={embedded}/>
    </div>
    <div className="cc-reg-tools">
      <button className="ui-button" type="button" onClick={()=>void save(false)}>Save image</button>
      {tickets.length>1 && <button className="cc-reg-link" type="button" onClick={()=>void save(true)}>Save all</button>}
      <button type="button" className="cc-reg-link" onClick={()=>void share()}>Share</button>
      <button type="button" className="cc-reg-link" onClick={()=>show('options')}>Options</button>
    </div>
    {ticket.svg && <dialog ref={scanDialog} className="cc-ticket-scan" aria-label={'Ticket QR code for ' + ticket.name}>
      <div className="cc-ticket-scan-controls">
        {picker ?? <strong>{ticket.name}</strong>}
        <button type="button" onClick={()=>scanDialog.current?.close()}>Close</button>
      </div>
      <div className="cc-ticket-scan-area" {...swipeHandlers}>
        <span className="cc-ticket-code" role="img" aria-label="Enlarged ticket QR code" dangerouslySetInnerHTML={{__html:ticket.svg}}/>
      </div>
    </dialog>}
    <dialog ref={modal} className="cc-pass-options" aria-label={panel==='options'?'Ticket options':'Save ticket images'}
      onClose={()=>setNotice('')}>
      <header><h3>{panel==='options'?'Ticket options':panel==='all'?'Save all tickets':'Save ticket image'}</h3>
        <button type="button" onClick={()=>modal.current?.close()} aria-label="Close ticket options">×</button></header>
      {panel==='options'?<>
        <a href={ticket.url}>Open QR ticket</a>
        {extraOptions}
        <button type="button" disabled={sending} onClick={()=>void resend()}>{sending?'Sending…':'Resend to email'}</button>
        <button type="button" onClick={()=>show('photo')}>View ticket as an image</button>
        {tickets.length>1 && <button type="button" onClick={()=>show('all')}>View all as one image</button>}
        {calendar && <><h4>Add to calendar</h4><a href={calendar.apple}>Apple Calendar / iCalendar</a>
          <a href={calendar.google} target="_blank" rel="noreferrer">Google Calendar</a></>}

      </>:<>
        <p>Touch and hold the image to save it to your photos or gallery.</p>
        {panel==='all' && !prepared ? tickets.map(t=><img key={t.id} src={t.url+'/qr'} alt={'Ticket for '+t.name}/>)
          : <img src={imageUrl || ticket.url+'/qr'} alt={panel==='all'?'All party tickets':'Ticket for '+ticket.name}/>}
        {(panel!=='all'||prepared) && <a href={imageUrl || ticket.url+'/qr'} download={panel==='all'?'Concert-party-tickets.png':'Concert-ticket.png'}>Download image</a>}
      </>}
      {notice && <p role="status">{notice}</p>}
    </dialog>
  </div>;
}
