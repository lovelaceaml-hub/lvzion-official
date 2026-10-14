import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { settings } from './config';
export async function userClient() {
 const c=settings(); const jar=await cookies();
 return createServerClient(c.url,c.key,{
  cookieOptions:{httpOnly:true,secure:true,sameSite:'lax',path:'/'},
  cookies:{getAll:()=>jar.getAll(),setAll:(items)=>{for(const {name,value,options} of items) jar.set(name,value,{...options,httpOnly:true,secure:true,sameSite:'lax',path:'/'});}}
 });
}
// Do not use this client to read or mutate member management data.
export function authAdminClient() {
 const c=settings();
 if (!c.secret || !c.rateSecret || c.rateSecret.length<32) throw new Error('Trusted authentication configuration required.');
 return createClient(c.url,c.secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export async function requireMember() {
 const client=await userClient();
 const {data,error}=await client.auth.getUser();
 if (error || !data.user) throw new Error('Sign in required.');
 const member=await client.rpc('my_membership_id');
 if (member.error || !member.data) throw new Error('Membership access unavailable.');
 return client;
}
