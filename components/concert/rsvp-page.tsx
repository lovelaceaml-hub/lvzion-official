import type {PublicEvent, RsvpEntry} from '../../lib/concert/domain';
import {concertDetails, isPeaceConcert} from '../../lib/concert/branding';
import {ConcertHero} from './event-design';
import GuestRsvp from './guest-rsvp';
import MotionInvitation from './motion-invitation';
import {concertPromoMedia} from '../../lib/concert/promo-media';
import Registration from './registration';

export default function ConcertRsvpPage({entry, event, open, full, invitedBy, personal, hostEventId}: {
  entry: RsvpEntry;
  event: PublicEvent; hostEventId?: string;
  open: boolean;
  full: boolean;
  invitedBy?: string;
  personal?: {token: string; email: string; name: string};
}) {
  const peace = isPeaceConcert(event);
  const eventId = 'eventId' in entry ? entry.eventId : hostEventId;
  const directions = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.venue);
  const description = concertDetails(event.details).description;
  const canRegister = open && !full;
  const action = !canRegister
    ? <p className="cc-warning" role="status">{open ? 'The concert is full' : 'Registration is closed'}</p>
    : eventId ? <Registration event={event} hostToken={'invite' in entry ? entry.invite : undefined} eventId={eventId} personal={personal} invitedBy={invitedBy} showPoster={peace}/>
      : <GuestRsvp entry={entry} invitedBy={invitedBy} showPoster={peace}/>;
  const recovery = !canRegister && eventId ? <Registration event={event} hostToken={'invite' in entry ? entry.invite : undefined} eventId={eventId} recoveryOnly showPoster={peace}/> : undefined;
  if (peace) {
    return <main className="cc-page"><MotionInvitation event={event} media={concertPromoMedia()} action={action}
      extra={recovery}/></main>;
  }
  return <main className="ui-main cc-page cc-public cc-attendee cc-register-landing">
    <div className="cc-register-scroll" role="region" aria-label="Concert details" tabIndex={0}>
      <ConcertHero event={event} directions={directions}/>
      {description ? <p className="cc-register-description">{description}</p> : null}
    </div>
    <footer className={`cc-register-actions${canRegister ? ' cc-register-actions-floating' : ''}`} aria-label="Concert actions">
      <div className="cc-register-primary">{action}</div>
      {recovery}
    </footer>
  </main>;
}
