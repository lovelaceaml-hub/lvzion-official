import TicketWallet from '../../../../components/concert/ticket-wallet';
import {qrSvg} from '../../../../lib/concert/server';
import {ticketByToken} from '../../../../lib/concert/routes';
import {ticketToken} from '../../../../lib/concert/domain';
import ConcertInfo from '../../../../components/concert/concert-info';
import TicketCard from '../../../../components/concert/ticket-card';
import '../../../../components/concert/concert.css';
export const dynamic='force-dynamic';
export const metadata={title:'Your ticket · LV Zion',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token:raw}=await params;
 let token='';try{token=ticketToken(raw);}catch{}
 let t:Awaited<ReturnType<typeof ticketByToken>>|null=null;
 if(token){try{t=await ticketByToken(token);}catch{t=null;}}
 if(!t||!t.valid)return <main className="ui-main ui-narrow cc-page cc-public"><section className="cc-panel cc-public-head">
  <h1>{token&&t===null?'Your ticket is unavailable right now':'This ticket link is not valid'}</h1>
  <p className="cc-hint">{token&&t===null?'Please try again in a few minutes.':'Check the link in your ticket email.'}</p></section></main>;
 const inactiveMessage=t.status!=='active'?'This ticket was removed from the guest list.':t.event.archived?'This concert has ended.':undefined;
 const passes=inactiveMessage ? [] : await Promise.all(t.passes.map(async pass=>({...pass,svg:await qrSvg(pass.url)})));
 return <main className="ui-main cc-page cc-public cc-wallet">
  {inactiveMessage ? <TicketCard event={t.event} name={t.name} partySize={t.partySize} compact inactiveMessage={inactiveMessage}/> :
    <><TicketWallet event={t.event} tickets={passes}/><div className="cc-wallet-secondary"><ConcertInfo event={t.event}/></div></>}
 </main>;
}
