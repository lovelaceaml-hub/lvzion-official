import {call,failure,json,member} from '../../../../lib/concert/routes';
import {ConcertError,identifier,object} from '../../../../lib/concert/domain';
import {body} from '../../../../lib/server/http';
import {deliverConcertMail} from '../../../../lib/concert/registration-server';
import {invitationDelivery} from '../../../../lib/concert/invitation-provider';
import type {InvitationRow} from '../../../../lib/concert/invitation-tracker';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
  try{
    const client=await member();
    const result=object(await call(client,'concert_invitation_tracker',{p:{action:'list'}}));
    if(!Array.isArray(result.rows))throw new ConcertError('Invitation tracker unavailable.',503);
    const rows=result.rows as InvitationRow[];
    return json({eventId:identifier(result.eventId),...await invitationDelivery(rows)});
  }catch(error){return failure(error);}
}
export async function POST(request:Request){
  try{
    const client=await member();
    let input:Record<string,unknown>;
    try{input=await body(request);}catch{throw new ConcertError('A same-origin JSON request is required.');}
    const id=identifier(input.id),eventId=identifier(input.eventId),action=input.action;
    if(action!=='markTest'&&action!=='resend')throw new ConcertError('Invalid tracker action.');
    if(action==='markTest'&&typeof input.test!=='boolean')throw new ConcertError('Invalid test flag.');
    const result=object(await call(client,'concert_invitation_tracker',{p:{action,id,eventId,test:input.test}}));
    if(result.ok!==true)throw new ConcertError('The change could not be confirmed.',503);
    if(action==='resend'&&!await deliverConcertMail('invitation',id))
      throw new ConcertError('Email delivery was not confirmed. Refresh the tracker before retrying.',503,'mail');
    return json({ok:true});
  }catch(error){return failure(error);}
}
