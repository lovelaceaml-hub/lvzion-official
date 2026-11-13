import {attendanceCsv,parseAttendance} from '../../../../lib/concert/domain';
import {call,failure,json,member,noStore} from '../../../../lib/concert/routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const data=parseAttendance(await call(await member(),'concert_attendance'));
  if(new URL(request.url).searchParams.get('format')==='csv'){
   return new Response('﻿'+attendanceCsv(data),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="concert-attendance.csv"',...noStore}});
  }
  return json(data);
 }catch(e){return failure(e);}
}
