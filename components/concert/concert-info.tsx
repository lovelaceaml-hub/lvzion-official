'use client';

import {useState} from 'react';
import type {PublicEvent} from '../../lib/concert/domain';
import {concertDetails, isPeaceConcert} from '../../lib/concert/branding';
import ConcertDialog from './concert-dialog';
import {ConcertAbout} from './event-design';
import Program from './program';

const songsPerPage = 3;

export default function ConcertInfo({event}: {event: PublicEvent}) {
  const {description, itinerary} = concertDetails(event.details);
  const hasAbout = Boolean(description || itinerary.length || isPeaceConcert(event));
  const hasProgram = event.program.length > 0;
  const [view, setView] = useState<'about' | 'program'>(hasProgram ? 'program' : 'about');
  const [page, setPage] = useState(0);
  if (!hasAbout && !hasProgram) return null;
  const pageCount = Math.ceil(event.program.length / songsPerPage);
  const index = Math.min(page, Math.max(0, pageCount - 1));

  return <ConcertDialog label={hasProgram ? 'Concert program' : 'Concert details'} title="Concert details">
    {hasAbout && hasProgram ? <div className="cc-info-nav" aria-label="Concert details sections">
      <button className="ui-button ui-button-secondary" type="button" aria-pressed={view === 'about'} onClick={() => setView('about')}>About</button>
      <button className="ui-button ui-button-secondary" type="button" aria-pressed={view === 'program'} onClick={() => setView('program')}>Program</button>
    </div> : null}
    {view === 'about' && hasAbout ? <ConcertAbout event={event}/> : null}
    {view === 'program' && hasProgram ? <>
      <Program items={event.program.slice(index * songsPerPage, (index + 1) * songsPerPage)}/>
      {pageCount > 1 ? <div className="cc-info-pager" aria-label="Program pages">
        <button className="ui-button ui-button-secondary" type="button" disabled={index === 0} onClick={() => setPage(index - 1)}>Previous</button>
        <span className="cc-hint" role="status">{index + 1} of {pageCount}</span>
        <button className="ui-button ui-button-secondary" type="button" disabled={index + 1 === pageCount} onClick={() => setPage(index + 1)}>Next</button>
      </div> : null}
    </> : null}
  </ConcertDialog>;
}
