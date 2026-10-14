import {body,reply} from '../../../../lib/server/http';import {normalizeIdentifier} from '../../../../lib/contracts';import {consumeLoginLimit} from '../../../../lib/server/login';import {settings} from '../../../../lib/server/config';
export async function POST(request:Request){
 try{settings();}catch{return reply({error:'Access requests are not enabled in this preview.'},503);}
 try{const input=await body(request);if(input.website)return reply({message:'Your request has been received for review.'});
  const email=normalizeIdentifier(input.email);if(!email.includes('@')||typeof input.name!=='string'||input.name.trim().length<2||input.name.length>120)throw new Error('Invalid request.');
  const admin=await consumeLoginLimit(request,'access:'+email);const result=await admin.rpc('submit_access_request',{p_email:email,p_name:input.name.trim()});
  if(result.error)throw new Error('Request unavailable.');
  return reply({message:'Your request has been received for review. An authorized leader must verify your identity and match an existing member record.'});
 }catch{return reply({error:'The request could not be accepted. Check your information and try again later.'},400);}
}
