import {authorizedSheet} from '../../../../lib/concert/sheet-sync';
import {authAdminClient} from '../../../../lib/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reply(value: unknown, status: number) {
  return Response.json(value, {status, headers:{
    'Cache-Control':'private, no-store, max-age=0', 'Vary':'Authorization', 'X-Content-Type-Options':'nosniff',
  }});
}

function sheetRow(row: Record<string, unknown>) {
  const {attendee, registered, attendance, checked_in} = row;
  if (typeof attendee !== 'string' || typeof registered !== 'string' ||
      !(attendance === 'Registered' && checked_in === null || attendance === 'Checked in' && typeof checked_in === 'string')) {
    throw new Error('Invalid snapshot row.');
  }
  return {attendee, registered, attendance, checked_in};
}

export async function POST(request: Request) {
  const target = authorizedSheet(request.headers.get('authorization'));
  if (!target) return reply({error:'Unauthorized.'}, 401);
  try {
    const {data, error} = await authAdminClient().rpc('concert_sheet_snapshot', {p_event_id:target.eventId});
    if (!error && Array.isArray(data)) return reply({...target, rows:data.map(sheetRow)}, 200);
  } catch { /* A failed read must never replace the workbook with an empty roster. */ }
  return reply({error:'Snapshot unavailable.'}, 503);
}
