'use client';
import {useState} from 'react';
export default function TicketActions({url}:{url:string}) {
  const [notice,setNotice]=useState('');
  async function share() {
    try {
      if(navigator.share) await navigator.share({title:'Concert ticket',url});
      else {await navigator.clipboard.writeText(url);setNotice('Ticket link copied.');}
    } catch(error) {if(!(error instanceof DOMException && error.name==='AbortError')) setNotice('Copy the ticket link from your address bar.');}
  }
  return <div className="cc-reg-tools"><a className="ui-button" href={url+'/qr'} download>Download QR</a>
    <button className="cc-reg-link" type="button" onClick={()=>void share()}>Share ticket</button><span role="status">{notice}</span></div>;
}
