import {ConcertError,parseScan,tokenFromScan} from '../../../../lib/concert/domain';
import {body} from '../../../../lib/server/http';
import {digest} from '../../../../lib/concert/server';
import {call,failure,json,member} from '../../../../lib/concert/routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const client=await member();
  let input;try{input=await body(request);}catch{throw new ConcertError('A same-origin JSON request is required.');}
  if(Object.keys(input).some(k=>k!=='code'))throw new ConcertError('Unexpected field.');
  const token=tokenFromScan(input.code);
  if(!token){await call(client,'concert_attendance');return json({result:'invalid'});}// still enforces manager permission
  return json(parseScan(await call(client,'concert_scan',{p_digest:digest(token)})));
 }catch(e){return failure(e);}
}
