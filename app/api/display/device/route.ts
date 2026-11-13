import type {NextRequest} from 'next/server';
import {authAdminClient} from '../../../../lib/server/supabase';
import {body,reply} from '../../../../lib/server/http';
import {parseDisplaySnapshotR2} from '../../../../lib/continuous-display/operations';
import {createDeviceSecret,DEVICE_COOKIE,deviceDigest,normalizePairCode} from '../../../../lib/server/display';
import {settings} from '../../../../lib/server/config';
import {todaysRooms} from '../../../../lib/server/rooms-feed';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const token=request.cookies.get(DEVICE_COOKIE)?.value;
 try{
  const admin=authAdminClient();
  // A paired TV gets its own screen. Anyone else opening lvz.app/display gets the main screen's
  // published playlist (Anthony, 2026-11-13: the link alone shows it, no pairing).
  const paired=token&&token.length<=128?await admin.rpc('display_device_snapshot_r2',{p_token_digest:deviceDigest(token)}):null;
  const {data,error}=paired&&!paired.error&&paired.data?paired:await admin.rpc('display_public_snapshot');
  if(error||!data)return reply({paired:false});
  const snapshot=parseDisplaySnapshotR2(data);
  // Room bookings are read only when a published slide shows them.
  if(snapshot.slides.some(s=>s.kind==='rooms'))snapshot.rooms=await todaysRooms();
  return reply(snapshot);
 }catch{return reply({paired:false});}
}
export async function POST(request:NextRequest){
 let input:Record<string,unknown>;
 try{input=await body(request);}catch{return reply({error:'Invalid pairing request.'},400);}
 const code=normalizePairCode(input.code);
 if(!code||Object.keys(input).some(k=>k!=='code'))return reply({error:'Enter the complete pairing code.'},400);
 try{
  const token=createDeviceSecret();
  const admin=authAdminClient();
  const {data,error}=await admin.rpc('display_device_redeem',{p_code_digest:deviceDigest(code),p_token_digest:deviceDigest(token)});
  if(error||!data||data.paired!==true)return reply({error:'That code is invalid, used or expired.'},400);
  const r=reply({paired:true});
  r.cookies.set(DEVICE_COOKIE,token,{httpOnly:true,secure:settings().secureCookies,sameSite:'strict',path:'/api/display',maxAge:2592000});
  return r;
 }catch{return reply({error:'The pairing service is currently unavailable.'},503);}
}
