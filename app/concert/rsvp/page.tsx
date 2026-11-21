import ConcertPublicCard from '../../../components/concert/public-card';
import ConcertRsvpPage from '../../../components/concert/rsvp-page';
import {loadSharedEvent} from '../../../lib/concert/shared-event';
import '../../../components/concert/concert.css';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Event Invitation and Registration · LV Zion', robots: {index: false, follow: false}};

export default async function Page() {
  const result = await loadSharedEvent();
  if (result.state === 'ready') {
    return <ConcertRsvpPage entry={{eventId: result.eventId}} event={result.event} open={result.open} full={result.full}/>;
  }
  return <ConcertPublicCard title={result.state === 'closed' ? 'No concert is open for registration' : 'Registration is unavailable right now'}>
    {result.state === 'unavailable' && <p className="cc-receipt-note">Please try again in a few minutes.</p>}
  </ConcertPublicCard>;
}
