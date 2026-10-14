import {cookies} from 'next/headers';import {body,reply} from '../../../../lib/server/http';import {userClient} from '../../../../lib/server/supabase';import {validFlow} from '../../../../lib/server/flow';
export async function POST(request:Request){try{
 const input=await body(request);if(typeof input.password!=='string'||input.password.length<6||input.password.length>128||input.confirm!==input.password)throw new Error('Invalid password.');
 const client=await userClient();const user=await client.auth.getUser();const claims=await client.auth.getClaims();const jar=await cookies();
 if(user.error||!user.data.user||claims.error||typeof claims.data?.claims.session_id!=='string'||!validFlow(jar.get('lvz-recovery')?.value,user.data.user.id,claims.data.claims.session_id,'recovery'))return reply({error:'Confirm a current recovery email before changing the password.'},401);
 const updated=await client.auth.updateUser({password:input.password});if(updated.error)return reply({error:'Password rejected. Choose a stronger password.'},400);
 jar.delete('lvz-recovery');const logout=await client.auth.signOut({scope:'global'});if(logout.error)return reply({error:'Password changed. Session sign-out could not be confirmed; retry signing out.'},503);
 return reply({ok:true,next:'/sign-in'});
 }catch{return reply({error:'Use matching passwords of 6 to 128 characters and a verified recovery session.'},400);}}
