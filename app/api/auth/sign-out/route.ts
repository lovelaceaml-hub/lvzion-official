import { body,reply } from '../../../../lib/server/http';
import { userClient } from '../../../../lib/server/supabase';
export async function POST(request:Request) {
 try {await body(request); const client=await userClient(); const {error}=await client.auth.signOut({scope:'local'});
  return error?reply({error:'Sign-out could not be completed.'},503):reply({ok:true});
 } catch {return reply({error:'Sign-out could not be completed.'},400);}
}
