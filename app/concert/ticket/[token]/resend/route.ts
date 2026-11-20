import {body} from '../../../../../lib/server/http';
import {consumeLoginLimit} from '../../../../../lib/server/login';
import {ConcertError,ticketToken} from '../../../../../lib/concert/domain';
import {failure,json,ticketByToken} from '../../../../../lib/concert/routes';
import {digest,sendPassReceipt} from '../../../../../lib/concert/server';

export async function POST(request:Request,{params}:{params:Promise<{token:string}>}) {
  try {
    try { await body(request); } catch { throw new ConcertError('Open your ticket and try again.',403); }
    const token=ticketToken((await params).token);
    const ticket=await ticketByToken(token);
    if (!ticket.valid || ticket.status!=='active' || ticket.event.archived || !ticket.email) {
      throw new ConcertError('This ticket has no available email receipt.',404);
    }
    try { await consumeLoginLimit(request,digest(ticket.email.toLowerCase()),'concert-ticket-resend'); }
    catch { throw new ConcertError('Please wait before requesting another email.',429); }
    if (!await sendPassReceipt(ticket.email,ticket.event,ticket.passes)) throw new ConcertError('Email delivery failed. Please try again.',503);
    return json({ok:true});
  } catch(error) { return failure(error); }
}
