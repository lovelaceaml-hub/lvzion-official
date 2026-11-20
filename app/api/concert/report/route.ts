import {call,failure,json,member} from '../../../../lib/concert/routes';
import {ConcertError} from '../../../../lib/concert/domain';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await member();
    await call(client,'concert_door',{p:{action:'status'}});
    const result = await call(client,'concert_registration_report');
    if (!result) throw new ConcertError('No active concert.',404);
    return json(result);
  } catch (error) {return failure(error);}
}
