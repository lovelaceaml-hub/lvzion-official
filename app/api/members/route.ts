import { requireMember } from '../../../lib/server/supabase';
import { reply } from '../../../lib/server/http';
export const dynamic='force-dynamic';
export async function GET() {
 try { const client=await requireMember(); const {data,error}=await client.rpc('member_workspace');
  if(error) return reply({error:'Member workspace unavailable.'},503); return reply(data);
 } catch {return reply({error:'Sign in to continue.'},401);}
}
