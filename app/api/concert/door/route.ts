import {refreshConcertSheet, scheduleConcertSheetSync} from '../../../../lib/concert/sheet-sync';
import {body} from '../../../../lib/server/http';
import {ConcertError, identifier, object, parseScan} from '../../../../lib/concert/domain';
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
      case 'replaySheet': {
        const status = object(await rpc(client, 'concert_door', {action:'status'}));
        if (!status.event || !await refreshConcertSheet(identifier(object(status.event).id))) {
          throw new ConcertError('Spreadsheet refresh was not confirmed.', 503, 'unavailable');
        }
        return json({ok:true});
      }
      case 'find':
        return json(await rpc(client,'concert_door',{action:'find',name:guestName(input.name)}));
      case 'check':
      case 'walk': {
        const id = identifier(input.id);
        const action = input.action === 'walk'
          ? {action:'walk', id, name:guestName(input.name), digest:digest(ticketTokenFor(id)), confirm:input.confirm===true}
          : {action:'check', id};
        const scan = parseScan(await rpc(client, 'concert_door', action));
        if (scan.result === 'ok') scheduleConcertSheetSync();
        return json(scan);
      }
      default:
        throw new ConcertError('Choose a check-in action.');
    }
  } catch (error) { return failure(error); }
}
