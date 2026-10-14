import {cookies} from 'next/headers';import {body,reply} from '../../../../lib/server/http';import {userClient} from '../../../../lib/server/supabase';import {settings} from '../../../../lib/server/config';import {flowProof} from '../../../../lib/server/flow';
export async function POST(request:Request){try{
 const input=await body(request);if(typeof input.token_hash!=='string'||!/^[a-zA-Z0-9_-]{20,512}$/.test(input.token_hash)||!['invite','magiclink','signup','email','recovery'].includes(String(input.type)))throw new Error('Invalid confirmation.');
 const client=await userClient();const result=await client.auth.verifyOtp({token_hash:input.token_hash,type:input.type as 'invite'|'magiclink'|'signup'|'email'|'recovery'});
 if(result.error||!result.data.user||!result.data.session)return reply({error:'This confirmation is invalid or expired. Request a new one.'},401);
 const jar=await cookies();const opts={httpOnly:true,secure:settings().secureCookies,sameSite:'lax' as const,path:'/',maxAge:600};
 if(input.type==='recovery'){
  const claims=await client.auth.getClaims();if(claims.error||typeof claims.data?.claims.session_id!=='string')throw new Error('Verified session required.');
  jar.set('lvz-recovery',flowProof(result.data.user.id,claims.data.claims.session_id,'recovery'),opts);
  return reply({ok:true,next:'/reset-password'});
 }
 if(typeof input.ticket==='string'&&/^[0-9a-f]{64}$/.test(input.ticket)){jar.set('lvz-invitation',input.ticket,opts);return reply({ok:true,next:'/activate'});}
 return reply({ok:true,next:'/members'});
 }catch{return reply({error:'Confirmation could not be completed. Use a current invitation or recovery email.'},400);}}
