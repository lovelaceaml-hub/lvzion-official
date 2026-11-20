import {body} from '../../../../lib/server/http';
import {ConcertError,identifier} from '../../../../lib/concert/domain';
import {rpc} from '../../../../lib/concert/registration-server';
import {failure,json,member} from '../../../../lib/concert/routes';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {return json(await rpc(await member(),'concert_placement',{action:'list'}));}
  catch (error) {return failure(error);}
}

export async function POST(request: Request) {
  try {
    const client = await member();
    let input;
    try {input = await body(request);}
    catch {throw new ConcertError('Please reload and try again.');}
    return json(await rpc(client,'concert_placement',{action:'approve',id:identifier(input.id),groupId:identifier(input.groupId),verified:input.verified===true}));
  } catch (error) {return failure(error);}
}
