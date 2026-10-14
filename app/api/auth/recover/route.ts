import {normalizeIdentifier} from '../../../../lib/contracts';import {body,reply} from '../../../../lib/server/http';import {consumeLoginLimit} from '../../../../lib/server/login';import {sendAccountEmail,mailConfigured} from '../../../../lib/server/mail';import {confirmationLink} from '../../../../lib/server/flow';
export async function POST(request:Request){const started=Date.now();try{
 const input=await body(request);const identifier=normalizeIdentifier(input.identifier);const admin=await consumeLoginLimit(request,'recovery:'+identifier);
 const resolved=await admin.rpc('resolve_login_identifier',{p_identifier:identifier});
 if(!resolved.error&&typeof resolved.data==='string'&&mailConfigured()){
  const link=await admin.auth.admin.generateLink({type:'recovery',email:resolved.data});
  if(!link.error&&link.data.properties?.hashed_token)await sendAccountEmail(resolved.data,'Reset your LV Zion Official password',`A password reset was requested for your account.\n\nOpen the link below, then explicitly confirm recovery:\n${confirmationLink(link.data.properties.hashed_token,'recovery')}\n\nDo not forward this link. If you did not request this, ignore the message.`);
 }
 }catch{/* Never log credentials, tokens, email addresses, or request bodies. */}
 await new Promise(r=>setTimeout(r,Math.max(0,700-(Date.now()-started))));
 return reply({message:'If this account is eligible and recovery delivery is enabled, recovery instructions will be sent to its verified email.'});}
