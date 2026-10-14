import { normalizeIdentifier } from '../../../../lib/contracts';
import { body,reply } from '../../../../lib/server/http';
import { settings } from '../../../../lib/server/config';
import { userClient } from '../../../../lib/server/supabase';
import { consumeLoginLimit } from '../../../../lib/server/login';
export async function POST(request:Request) {
 try {
  const input=await body(request); const identifier=normalizeIdentifier(input.identifier);
  const admin=await consumeLoginLimit(request,identifier);
  const {data,error}=await admin.rpc('resolve_login_identifier',{p_identifier:identifier});
  if(!error && typeof data==='string' && process.env.LVZ_EMAIL_DELIVERY_ENABLED==='true') {
   const client=await userClient(); await client.auth.resetPasswordForEmail(data,{redirectTo:settings().origin+'/auth/callback?next=/reset-password'});
  }
 } catch { /* Never reveal whether an account exists. No request bodies or credentials logged. */ }
 return reply({message:'If this account is eligible and recovery delivery is enabled, recovery instructions will be sent to its verified email.'});
}
