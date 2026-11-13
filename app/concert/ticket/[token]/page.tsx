import {qrSvg,ticketUrl} from '../../../../lib/concert/server';
import {ticketByToken} from '../../../../lib/concert/routes';
import {formatStamp,ticketToken,whenLine} from '../../../../lib/concert/domain';
import '../../../../components/concert/concert.css';
export const dynamic='force-dynamic';
export const metadata={title:'Your ticket · LV Zion',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token:raw}=await params;
 let token='';try{token=ticketToken(raw);}catch{}
 let t:Awaited<ReturnType<typeof ticketByToken>>|null=null;
 if(token){try{t=await ticketByToken(token);}catch{t=null;}}
 if(!t||!t.valid)return <main className="ui-main ui-narrow cc-page cc-public"><section className="cc-public-head">
  <h1>{token&&t===null?'Your ticket is unavailable right now':'This ticket link is not valid'}</h1>
  <p className="cc-hint">{token&&t===null?'Please try again in a few minutes.':'Check the link in your ticket email.'}</p></section></main>;
 const svg=await qrSvg(ticketUrl(token));
 const inactive=t.status!=='active'||t.event.archived;
 return <main className="ui-main ui-narrow cc-page cc-public">
  <section className="cc-ticket" aria-labelledby="cc-ticket-title">
   <p className="ui-eyebrow">Your ticket</p>
   <h1 id="cc-ticket-title">{t.event.title}</h1>
   <p className="cc-ticket-when">{whenLine(t.event)}</p>
   <p className="cc-hint">{t.event.venue}</p>
   {inactive?<p className="cc-note">{t.status!=='active'?'This ticket was removed from the guest list.':'This concert has ended.'}</p>
    :<div className="cc-qr" role="img" aria-label="Ticket QR code" dangerouslySetInnerHTML={{__html:svg}}/>}
   <p className="cc-ticket-name">{t.name}</p>
   <p className="cc-hint">Party of {t.partySize}</p>
   {t.checkedInAt?<p className="cc-note">Checked in at {formatStamp(t.checkedInAt)}. Enjoy the concert.</p>:inactive?null:<p className="cc-hint">Show this code at the door. Bookmark this page or keep your ticket email.</p>}
  </section>
  <p className="cc-hint cc-center">Want to stay connected? <a className="ui-link" href="/sign-up">Create an LV Zion account</a></p>
 </main>;
}
