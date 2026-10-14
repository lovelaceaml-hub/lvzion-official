import { createHash } from 'node:crypto';
import { body,reply } from '../../../../lib/server/http';
import { userClient } from '../../../../lib/server/supabase';
export async function POST(request:Request) {
 try {const input=await body(request);
  if(typeof input.ticket!=='string' || !/^[0-9a-f]{64}$/.test(input.ticket) || typeof input.username!=='string' || !/^[a-z][a-z0-9._-]{2,31}$/.test(input.username) || typeof input.password!=='string' || input.password.length<12 || input.password.length>128) throw new Error('Invalid activation.');
  const client=await userClient(); const verified=await client.auth.getUser(); if(verified.error || !verified.data.user) throw new Error('Verified invitation required.');
  const result=await client.rpc('activate_invitation',{p_digest:createHash('sha256').update(input.ticket).digest('hex'),p_username:input.username});
  if(result.error) return reply({error:'Invitation unavailable, expired, or username already taken.'},409);
  const password=await client.auth.updateUser({password:input.password});
  if(password.error) return reply({error:'Account linked. Use verified password recovery to finish setting your password.'},409);
  return reply({ok:true,next:'/members'});
 } catch {return reply({error:'A verified, active invitation and a valid password are required.'},400);}
}
