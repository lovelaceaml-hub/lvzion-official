import {identifier, object, parsePublicEvent} from './domain';
import {call} from './routes';
import {authAdminClient} from '../server/supabase';

export async function loadSharedEvent() {
  try {
    const data = await call(authAdminClient(), 'concert_shared_view');
    if (data === null) return {state: 'closed'} as const;
    const result = object(data);
    const event = object(result.event);
    return {state: 'ready', event: parsePublicEvent(event), eventId: identifier(event.id),
      open: event.rsvpOpen === true, full: result.full === true} as const;
  } catch {
    return {state: 'unavailable'} as const;
  }
}
