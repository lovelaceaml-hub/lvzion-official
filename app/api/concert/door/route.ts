import {body} from '../../../../lib/server/http';
import {ConcertError, identifier, parseScan} from '../../../../lib/concert/domain';
import {guestName} from '../../../../lib/concert/registration';
import {rpc} from '../../../../lib/concert/registration-server';
import {digest, ticketTokenFor} from '../../../../lib/concert/server';
import {failure, json, member} from '../../../../lib/concert/routes';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { return json(await rpc(await member(),'concert_door',{action:'status'})); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const client = await member();
    let input;
    try { input = await body(request); }
    catch { throw new ConcertError('Please reload and try again.'); }
    switch (input.action) {
      case 'find':
        return json(await rpc(client,'concert_door',{action:'find',name:guestName(input.name)}));
      case 'check':
        return json(parseScan(await rpc(client,'concert_door',{action:'check',id:identifier(input.id)})));
      case 'walk': {
        const id = identifier(input.id);
        return json(parseScan(await rpc(client,'concert_door',{action:'walk',id,name:guestName(input.name),
          digest:digest(ticketTokenFor(id)),confirm:input.confirm===true})));
      }
      default:
        throw new ConcertError('Choose a check-in action.');
    }
  } catch (error) { return failure(error); }
}
