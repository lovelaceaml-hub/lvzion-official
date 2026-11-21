import {scheduleConcertSheetSync} from '../../../../lib/concert/sheet-sync';
import {ConcertError,parseScan,tokenFromScan} from '../../../../lib/concert/domain';
import {body} from '../../../../lib/server/http';
import {digest} from '../../../../lib/concert/server';
import {rpc} from '../../../../lib/concert/registration-server';
import {failure,json,member} from '../../../../lib/concert/routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const client=await member();
  let input;try{input=await body(request);}catch{throw new ConcertError('A same-origin JSON request is required.');}
  if(Object.keys(input).some(k=>k!=='code'))throw new ConcertError('Unexpected field.');
  const token=tokenFromScan(input.code);
  const scan=parseScan(await rpc(client,'concert_door',{action:'scan',digest:token?digest(token):null}));
  if(scan.result==='ok')scheduleConcertSheetSync();
  return json(scan);
 }catch(e){return failure(e);}
}
