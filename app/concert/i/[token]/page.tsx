import {authAdminClient} from '../../../../lib/server/supabase';
import {digest} from '../../../../lib/concert/server';
import {inviteToken,object,parsePublicEvent,whenLine,type PublicEvent} from '../../../../lib/concert/domain';
import GuestRsvp from '../../../../components/concert/guest-rsvp';
import Program from '../../../../components/concert/program';
import '../../../../components/concert/concert.css';
export const dynamic='force-dynamic';
export const metadata={title:'Healing Concert RSVP · LV Zion',robots:{index:false,follow:false},referrer:'no-referrer'};
type View={state:'ok';invitedBy:string;event:PublicEvent;full:boolean;open:boolean}|{state:'invalid'|'none'|'unavailable'};
async function load(raw:string):Promise<View>{
 let token;try{token=inviteToken(raw);}catch{return {state:'invalid'};}
 try{
  const {data,error}=await authAdminClient().rpc('concert_invite_view',{p_invite_digest:digest(token)});
  if(error)return {state:'unavailable'};
  const p=object(data);if(p.valid!==true)return {state:'invalid'};
  if(!p.event)return {state:'none'};
  const e=object(p.event);
  return {state:'ok',invitedBy:String(p.invitedBy??''),event:parsePublicEvent(e),full:p.full===true,open:e.rsvpOpen===true};
 }catch{return {state:'unavailable'};}
}
export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params;const v=await load(token);
 return <main className="ui-main ui-narrow cc-page cc-public">
  {v.state==='ok'?<>
   <header className="cc-public-head">
    <p className="ui-eyebrow">{v.invitedBy?`${v.invitedBy} invited you`:'You are invited'}</p>
    <h1>{v.event.title}</h1>
    <p className="cc-public-when">{whenLine(v.event)}</p>
    <p className="cc-hint">{v.event.venue}</p>
    {v.event.details?<p className="cc-details">{v.event.details}</p>:null}
   </header>
   {!v.open?<p className="cc-note">RSVP is closed for this concert.</p>:v.full?<p className="cc-note">Sorry, every seat has been taken.</p>:<GuestRsvp invite={token}/>}
   <Program items={v.event.program}/>
  </>:<section className="cc-public-head">
   <h1>{v.state==='none'?'No concert is open right now':v.state==='unavailable'?'RSVP is unavailable right now':'This invitation link is not valid'}</h1>
   <p className="cc-hint">{v.state==='unavailable'?'Please try again in a few minutes.':'Ask the person who invited you to send their link again.'}</p>
  </section>}
 </main>;
}
