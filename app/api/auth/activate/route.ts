import {cookies} from 'next/headers';import {body,reply} from '../../../../lib/server/http';import {userClient} from '../../../../lib/server/supabase';import {ticketDigest} from '../../../../lib/server/flow';
export async function POST(request:Request){try{
 const input=await body(request);const jar=await cookies();const ticket=jar.get('lvz-invitation')?.value;
 if(!ticket||!/^[0-9a-f]{64}$/.test(ticket)||typeof input.username!=='string'||!/^[a-z][a-z0-9._-]{2,31}$/.test(input.username)||typeof input.password!=='string'||input.password.length<6||input.password.length>128)throw new Error('Invalid activation.');
 const client=await userClient();const verified=await client.auth.getUser();if(verified.error||!verified.data.user)throw new Error('Verified invitation required.');
 const digest=ticketDigest(ticket);const valid=await client.rpc('validate_invitation',{p_digest:digest});if(valid.error)return reply({error:'Invitation expired, revoked, or no longer authorized.'},409);
 const password=await client.auth.updateUser({password:input.password});if(password.error)return reply({error:'Choose a stronger password and try again.'},400);
 const activated=await client.rpc('activate_invitation',{p_digest:digest,p_username:input.username});if(activated.error)return reply({error:'Account linking failed or the username is already taken. Choose another username and retry.'},409);
 jar.delete('lvz-invitation');return reply({ok:true,next:'/members'});
 }catch{return reply({error:'Open and confirm a current invitation before activating your account.'},400);}}
