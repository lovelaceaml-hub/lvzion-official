import { body,reply } from '../../../../lib/server/http';
import { userClient } from '../../../../lib/server/supabase';
export async function POST(request:Request) {
 try {const input=await body(request);
  if(typeof input.password!=='string' || input.password.length<12 || input.password.length>128 || input.password!==input.confirm) throw new Error('Invalid password.');
  const client=await userClient(); const verified=await client.auth.getUser();
  if(verified.error || !verified.data.user) return reply({error:'Open a valid recovery confirmation first.'},401);
  const update=await client.auth.updateUser({password:input.password});
  if(update.error)return reply({error:'Password change rejected. Use a stronger password or request a new recovery confirmation.'},409);
  const logout=await client.auth.signOut({scope:'global'});
  return logout.error?reply({error:'Password changed, but session sign-out needs another attempt.'},503):reply({ok:true,next:'/sign-in'});
 } catch {return reply({error:'Use matching passwords of 12–128 characters and a verified recovery session.'},400);}
}
