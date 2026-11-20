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
  return <main className="ui-main cc-page cc-public cc-attendee">
    <section className="cc-panel cc-public-head">
      <h1>{result.state === 'closed' ? 'No concert is open for registration' : 'Registration is unavailable right now'}</h1>
      {result.state === 'unavailable' ? <p className="cc-hint">Please try again in a few minutes.</p> : null}
    </section>
  </main>;
}
