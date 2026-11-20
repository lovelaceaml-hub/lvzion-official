import {CalendarDays, Heart, MapPin} from '../home-icons';
import {formatDate, formatTime, type PublicEvent} from '../../lib/concert/domain';
import {concertDetails, concertDisplayTitle, concertTimeLabel, concertVenueLines, isPeaceConcert, PEACE_CONCERT_DESCRIPTION, PEACE_CONCERT_SUBTITLE, PEACE_CONCERT_TITLE_LINES} from '../../lib/concert/branding';

export function PeaceConcertTitle() {
  const [intro, love, peace] = PEACE_CONCERT_TITLE_LINES;
  return <><span className="cc-hero-title-intro">{intro}</span>{' '}
    <span className="cc-hero-title-love">{love}</span>{' '}
    <span className="cc-hero-title-peace">{peace}</span></>;
}

export function ConcertDateAndVenue({event, className, directions, compact = false}: {
  event: Pick<PublicEvent, 'title' | 'date' | 'startTime' | 'doorsTime' | 'venue'>;
  className?: string;
  directions?: string;
  compact?: boolean;
}) {
  const venue = concertVenueLines(event.venue).map((line, i) =>
    i === 0 ? <strong key={i}>{line}</strong> : <span key={i}>{line}</span>);
  return <div className={className ?? 'cc-event-facts'}>
    <p className="cc-event-fact"><CalendarDays size={19} aria-hidden="true"/>
      <span><strong>{compact ? formatDate(event.date, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'}) : formatDate(event.date)}</strong>{compact && ' · '}<span>{concertTimeLabel(event)}{event.doorsTime ? ' · Doors open ' + formatTime(event.doorsTime) : ''}</span></span>
    </p>
    <p className="cc-event-fact"><MapPin size={19} aria-hidden="true"/>
      {directions ? <a className="cc-event-directions" href={directions} target="_blank" rel="noreferrer">{venue}{!compact && <span>Get directions</span>}</a> : <span>{venue}</span>}
    </p>
  </div>;
}

export function ConcertHero({event, directions}: {event: PublicEvent; directions?: string}) {
  const peace = isPeaceConcert(event);

  return <section className="cc-hero" aria-label="Concert information">
    <div className="cc-hero-art">
      <span className="cc-heart-mark" aria-hidden="true"><Heart size={24}/></span>
      <p className="cc-hero-kicker">{event.title === 'Healing Concert' ? 'LV Zion' : 'Healing Concert'}</p>
      <h1 className="cc-hero-title">{peace ? <PeaceConcertTitle/> : concertDisplayTitle(event)}</h1>
      {peace ? <p className="cc-hero-subtitle">{PEACE_CONCERT_SUBTITLE}</p> : null}
    </div>
    <ConcertDateAndVenue event={event} directions={directions}/>
  </section>;
}

export function ConcertSectionHeading({title, event}: {
  title: string;
  event?: Pick<PublicEvent, 'date' | 'title'> | null;
}) {
  return <header className="cc-section-heading">
    <p className="cc-kicker">{event ? concertDisplayTitle(event) : 'Healing Concert'}</p>
    <h1>{title}</h1>
  </header>;
}

export function ConcertItinerary({items}: {items: ReturnType<typeof concertDetails>['itinerary']}) {
  return <ul className="cc-itinerary">{items.map(({time, title}, index) => <li key={index}>
    {time ? <strong>{time}</strong> : null}<span>{title}</span>
  </li>)}</ul>;
}

export function ConcertAbout({event}: {event: PublicEvent}) {
  const details = concertDetails(event.details);
  const peace = isPeaceConcert(event);
  const description = peace ? PEACE_CONCERT_DESCRIPTION : details.description;

  return <section className="cc-about" aria-labelledby="cc-about-title">
    <h3 id="cc-about-title">About the concert</h3>
    {peace ? <p className="cc-about-theme">Bringing Us Closer, Inspiring Us to Love More</p> : null}
    {description ? <p className="cc-details">{description}</p> : null}
    {details.itinerary.length > 0 ? <>
      <h3>Itinerary</h3>
      <ConcertItinerary items={details.itinerary}/>
    </> : null}
  </section>;
}
