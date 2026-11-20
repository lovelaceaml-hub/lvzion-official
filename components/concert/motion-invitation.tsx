'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {vegasInstant} from '../../lib/morning-prayer/time';
import {Clock3, Heart, MapPin} from '../home-icons';
import {concertTimeLabel, concertVenueLines} from '../../lib/concert/branding';
import {formatDate, type PublicEvent} from '../../lib/concert/domain';
import ConcertLights from './concert-lights';
import './motion-invitation.css';

import Promo, {type PromoMedia} from './promo';
export type {PromoMedia} from './promo';
function ConcertCountdown({startsAt}: {startsAt: string}) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const start = Date.parse(startsAt);
    const tick = () => setSeconds(Math.max(0, Math.ceil((start - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startsAt]);
  function unit(value: number, label: string) {
    return <span className="ml-time-unit"><b>{String(value).padStart(2, '0')}</b>{' '}<small>{label}{value === 1 ? '' : 's'}</small></span>;
  }
  const clock = seconds === null ? '…' : seconds === 0 ? 'The concert has started' : <>
    {unit(Math.floor(seconds / 86400), 'day')}{' '}
    {unit(Math.floor(seconds / 3600) % 24, 'hour')}{' '}
    {unit(Math.floor(seconds / 60) % 60, 'minute')}{' '}
    {unit(seconds % 60, 'second')}
  </>;
  return <div className="ml-countdown" role="timer" aria-live="off">
    {seconds !== 0 && <span className="ml-clock-label">Concert begins in</span>}
    <time dateTime={startsAt}>{clock}</time>
  </div>;
}

export default function MotionInvitation({event, media, action, note, extra}: {
  event: PublicEvent; media: PromoMedia; action: ReactNode; note?: string; extra?: ReactNode;
}) {
  const startsAt = vegasInstant(event.date, event.startTime);
  const [venue, ...address] = concertVenueLines(event.venue);
  const directions = 'https://maps.apple.com/?q=' + encodeURIComponent(event.venue);
  return <section className="ml-invitation" aria-label="Concert invitation">
    <div className="ml-stage">
      <div className="ml-architecture" aria-hidden="true"/>
      <header className="ml-header">
        <a href="/" aria-label="Mother’s Love and Peace Day. Go to LV Zion home"><Heart size={23}/><span>Mother’s Love<small>And Peace Day</small></span></a>
        <ConcertCountdown startsAt={startsAt}/>
      </header>
      <div className="ml-grid">
        <div className="ml-title"><ConcertLights startsAt={startsAt}/><div className="ml-lettering"><p className="ml-eyebrow">Healing Concert</p>
          <h1><span>The Words of</span><em>Mother’s Love</em><strong>That Bring Peace</strong></h1></div>
        </div>
        <Promo {...media}/>
        <div className="ml-facts">
          <div><Clock3/><p><strong>{formatDate(event.date)}</strong><span>{concertTimeLabel(event)}</span></p></div>
          <div><MapPin/><p><strong>{venue}</strong><a href={directions}>{address.join(', ') || 'Get directions'}</a></p></div>
        </div>
      </div>
      <footer className="ml-actions">{note && <p>{note}</p>}{action}{extra}</footer>
    </div>
  </section>;
}
