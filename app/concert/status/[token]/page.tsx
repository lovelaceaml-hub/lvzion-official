import {readInvitationStatus} from '../../../../lib/concert/registration-server';
import {concertDisplayTitle, concertWhen} from '../../../../lib/concert/branding';
import '../../../../components/concert/concert.css';

export const dynamic='force-dynamic';
export const metadata={title:'Your invitation statuses',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  const view=await readInvitationStatus(token).catch(()=>undefined);
  return <main className="ui-main ui-narrow cc-page cc-public"><section className="cc-panel">
    <h1>Your invitation statuses</h1>
    {view ? <><h2>{concertDisplayTitle(view.event)}</h2><p>{concertWhen(view.event)}</p>
      <ul className="cc-reg-results">{view.invitations.map((item,index)=><li key={index}><strong>{item.name}</strong>
        <span>{item.status}{item.partySize>0 ? ' · Party of '+item.partySize : ''}</span></li>)}</ul></>
      : <p>{view===null?'This status link is invalid. Open the link in your invitation confirmation email.':'Invitation statuses are temporarily unavailable. Please try again.'}</p>}
  </section></main>;
}
