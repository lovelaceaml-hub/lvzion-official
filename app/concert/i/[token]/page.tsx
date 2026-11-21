import ConcertPublicCard from '../../../../components/concert/public-card';
import {authAdminClient} from '../../../../lib/server/supabase';
import {digest} from '../../../../lib/concert/server';
import {identifier,inviteToken,object,parsePublicEvent,type PublicEvent} from '../../../../lib/concert/domain';
import ConcertRsvpPage from '../../../../components/concert/rsvp-page';
import '../../../../components/concert/concert.css';
export const dynamic='force-dynamic';
export const metadata={title:'Healing Concert RSVP · LV Zion',robots:{index:false,follow:false},referrer:'no-referrer'};
type View={state:'ok';eventId:string;invitedBy:string;event:PublicEvent;full:boolean;open:boolean}|{state:'invalid'|'none'|'unavailable'};
async function load(raw:string):Promise<View>{
 let token;try{token=inviteToken(raw);}catch{return {state:'invalid'};}
 try{
  const {data,error}=await authAdminClient().rpc('concert_invite_view',{p_invite_digest:digest(token)});
  if(error)return {state:'unavailable'};
  const p=object(data);if(p.valid!==true)return {state:'invalid'};
  if(!p.event)return {state:'none'};
  const e=object(p.event);
  return {state:'ok',eventId:identifier(e.id),invitedBy:String(p.invitedBy??''),event:parsePublicEvent(e),full:p.full===true,open:e.rsvpOpen===true};
 }catch{return {state:'unavailable'};}
}
export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params;const v=await load(token);
 if(v.state==='ok')return <ConcertRsvpPage entry={{invite:token}} hostEventId={v.eventId} event={v.event} open={v.open} full={v.full} invitedBy={v.invitedBy}/>;
 return <ConcertPublicCard title={v.state==='none'?'No concert is open right now':v.state==='unavailable'?'RSVP is unavailable right now':'This invitation link is not valid'}>
  <p className="cc-receipt-note">{v.state==='unavailable'?'Please try again in a few minutes.':'Ask the person who invited you to send their link again.'}</p>
 </ConcertPublicCard>;
}
