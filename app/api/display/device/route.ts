import type {NextRequest} from 'next/server';
import {authAdminClient} from '../../../../lib/server/supabase';
import {body,reply} from '../../../../lib/server/http';
import {parseDisplaySnapshot} from '../../../../lib/continuous-display/live-contract';
import {createDeviceSecret,DEVICE_COOKIE,deviceDigest,normalizePairCode} from '../../../../lib/server/display';
import {settings} from '../../../../lib/server/config';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const token=request.cookies.get(DEVICE_COOKIE)?.value;
 if(!token||token.length>128)return reply({paired:false});
 try{
  const admin=authAdminClient();
  const {data,error}=await admin.rpc('display_device_snapshot',{p_token_digest:deviceDigest(token)});
  if(error||!data)return reply({paired:false});
  return reply(parseDisplaySnapshot(data));
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
