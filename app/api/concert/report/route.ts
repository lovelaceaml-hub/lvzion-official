import {call,failure,json,member} from '../../../../lib/concert/routes';
import {ConcertError,object} from '../../../../lib/concert/domain';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await member();
    const door = object(await call(client,'concert_door',{p:{action:'status'}}));
    const result = await call(client,'concert_registration_report');
    if (!result) throw new ConcertError('No active concert.',404);
    const [eventId,sheetId] = (process.env.LVZ_CONCERT_ATTENDANCE_SHEET ?? '').split('/');
    const sheetUrl = door.event && object(door.event).id === eventId && /^[A-Za-z0-9_-]+$/.test(sheetId ?? '')
      ? 'https://docs.google.com/spreadsheets/d/'+sheetId+'/edit' : undefined;
    return json({...object(result),sheetUrl});
  } catch (error) {return failure(error);}
}
