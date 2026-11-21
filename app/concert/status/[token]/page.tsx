import {readInvitationStatus} from '../../../../lib/concert/registration-server';
import {concertDisplayTitle, isPeaceConcert} from '../../../../lib/concert/branding';
import {ConcertDateAndVenue, PeaceConcertTitle} from '../../../../components/concert/event-design';
import ConcertPublicCard from '../../../../components/concert/public-card';
import '../../../../components/concert/concert.css';

export const dynamic = 'force-dynamic';
export const metadata = {title:'Your invitation statuses',robots:{index:false,follow:false},referrer:'no-referrer'};

export default async function Page({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const view = await readInvitationStatus(token).catch(() => undefined);
  return <ConcertPublicCard title="Your invitation statuses">
    {view ? <>
      <div className="cc-receipt-event">
        <h2>{isPeaceConcert(view.event) ? <PeaceConcertTitle/> : concertDisplayTitle(view.event)}</h2>
        <ConcertDateAndVenue event={view.event}/>
      </div>
      {view.invitations.length ? <ul className="cc-reg-results cc-status-list" aria-label="Your invitations">
        {view.invitations.map((item, index) => <li key={index}>
          <strong>{item.name}</strong>
          <span className="cc-invite-status">
            <span data-invite-status={item.status.toLowerCase()}>{item.status}</span>
            {item.partySize > 0 && <span>Party of {item.partySize}</span>}
          </span>
        </li>)}
      </ul> : <p className="cc-receipt-note">There are no invitations to show yet.</p>}
    </> : <p className="cc-receipt-note">{view === null
      ? 'This status link is invalid. Open the link in your invitation confirmation email.'
      : 'Invitation statuses are temporarily unavailable. Please try again.'}</p>}
  </ConcertPublicCard>;
}
