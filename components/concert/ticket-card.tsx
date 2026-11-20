import type {ReactNode} from 'react';
import {formatStamp, type PublicEvent} from '../../lib/concert/domain';
import {isPeaceConcert} from '../../lib/concert/branding';
import {ConcertDateAndVenue, PeaceConcertTitle} from './event-design';

export default function TicketCard({event, name, partySize, svg, checkedInAt, inactiveMessage, embedded = false, compact = false, attendeePicker}: {
  event: PublicEvent; embedded?: boolean; compact?: boolean; attendeePicker?: ReactNode;
  name: string;
  partySize: number;
  svg?: string;
  checkedInAt?: string | null;
  inactiveMessage?: string;
}) {
  const peace = isPeaceConcert(event);
  const Title = embedded ? 'h4' : 'h1';
  return <section className="cc-ticket" data-peace-concert={peace || undefined} aria-label={'Admission ticket for '+name}>
    {peace && <div className="cc-ticket-finish" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path pathLength="1" d="M50 99H5Q1 99 1 95V5Q1 1 5 1H50"/>
        <path pathLength="1" d="M50 99H95Q99 99 99 95V5Q99 1 95 1H50"/>
      </svg><span className="cc-ticket-heart">♥</span></div>}
    <header className="cc-ticket-head">
      <p className="cc-kicker">Admission ticket</p>
      <Title>{peace ? <PeaceConcertTitle/> : event.title}</Title>
    </header>
    <div className="cc-ticket-body">
      <div className="cc-ticket-person">
        {attendeePicker ?? <strong>{name}</strong>}
        <span>{partySize===1 ? 'Admits one' : 'Party of '+partySize}</span>
      </div>
      {svg ? <div className="cc-qr" role="img" aria-label="Ticket QR code" dangerouslySetInnerHTML={{__html: svg}}/> : null}
      {inactiveMessage ? <p className="cc-warning">{inactiveMessage}</p> : checkedInAt ?
        <p className="cc-note">Checked in at {formatStamp(checkedInAt)}</p> :
        <p className="cc-ticket-instruction">Show this QR code at the door.</p>}
    </div>
    <ConcertDateAndVenue compact={compact} event={event} className="cc-ticket-facts"/>
    {!compact && !embedded && peace && event.startTime === '16:30' && !inactiveMessage ? <a className="cc-ticket-calendar" href="/concert/mothers-love.ics">Add to calendar</a> : null}
  </section>;
}
