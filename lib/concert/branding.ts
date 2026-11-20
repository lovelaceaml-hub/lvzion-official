import {formatDate, formatTime, type PublicEvent} from './domain.ts';

export const PEACE_CONCERT_TITLE_LINES = ['The Words of', 'Mother’s Love', 'That Bring Peace'] as const;
export const PEACE_CONCERT_TITLE = PEACE_CONCERT_TITLE_LINES.join(' ');
export const PEACE_CONCERT_POSTER = '/concert/event-artwork.webp';
export const PEACE_CONCERT_DESCRIPTION = 'Experience the healing power of Mother’s love through heartfelt messages, uplifting music, and inspiring performances.';
export const PEACE_CONCERT_SUBTITLE = 'The Healing Power of Music';
const PEACE_CONCERT_DATE = '2026-12-06';
export const PEACE_CONCERT_START = '16:30';

export function isPeaceConcert(event: Pick<PublicEvent, 'date' | 'title'>): boolean {
  return event.date === PEACE_CONCERT_DATE && /words of (?:mother['’]s )?love/i.test(event.title);
}

export function concertDisplayTitle(event: Pick<PublicEvent, 'date' | 'title'>): string {
  return isPeaceConcert(event) ? PEACE_CONCERT_TITLE : event.title;
}

export function concertTimeLabel(event: Pick<PublicEvent, 'date' | 'title' | 'startTime'>): string {
  if (isPeaceConcert(event) && event.startTime === PEACE_CONCERT_START) return '4:30–6:00 PM Pacific';
  return `Starts ${formatTime(event.startTime)}`;
}

export function concertWhen(event: Pick<PublicEvent, 'date' | 'title' | 'startTime' | 'doorsTime'>): string {
  const time = concertTimeLabel(event);
  return `${formatDate(event.date)} · ${time}${event.doorsTime ? ' · Doors open ' + formatTime(event.doorsTime) : ''}`;
}

export function concertVenueLines(venue: string): string[] {
  const [name, ...address] = venue.split(/,(?=\s*\d+\s)/);
  return address.length ? [name.trim(), address.join(',').trim()] : [venue];
}

export function concertDetails(details: string) {
  const lines = details.split('\n');
  const itineraryStart = lines.findIndex(line => line.trim().toLowerCase() === 'itinerary');
  if (itineraryStart < 0) return {description: details, itinerary: []};

  return {
    description: lines.slice(0, itineraryStart).join('\n').trim(),
    itinerary: lines.slice(itineraryStart + 1).flatMap(line => {
      const entry = line.trim();
      if (!entry) return [];
      const match = /^(\d{1,2}:\d{2}\s+[AP]M)\s+[—–-]\s+(.+)$/i.exec(entry);
      return [match ? {time: match[1], title: match[2]} : {time: null, title: entry}];
    }),
  };
}

export const PEACE_CONCERT_ITINERARY = [
  'Itinerary',
  '4:30 PM — Welcome Presentation',
  '5:00 PM — Choir & Orchestra Performances',
  'Closing Remarks',
].join('\n');
