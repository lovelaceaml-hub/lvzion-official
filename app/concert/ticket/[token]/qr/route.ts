import {ticketToken} from '../../../../../lib/concert/domain';
import {ticketByToken} from '../../../../../lib/concert/routes';
import {qrPng,ticketUrl} from '../../../../../lib/concert/server';

export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
  try {ticketToken(token);} catch {return new Response(null,{status:404,headers});}
  const ticket=await ticketByToken(token);
  if (!ticket.valid || ticket.status!=='active' || ticket.event.archived) return new Response(null,{status:404,headers});
  return new Response(new Uint8Array(await qrPng(ticketUrl(token))),{headers:{...headers,
    'Content-Type':'image/png','Content-Disposition':'inline; filename="concert-ticket.png"'}});
}
