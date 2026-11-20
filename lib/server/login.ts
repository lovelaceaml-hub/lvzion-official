import 'server-only';
import { createHmac } from 'node:crypto';
import { authAdminClient } from './supabase';
import { settings } from './config';
export async function consumeLoginLimit(request:Request,identifier:string,channel='login') {
 const c=settings(); const admin=authAdminClient();
 // Vercel overwrites x-vercel-forwarded-for. Never trust caller-supplied X-Forwarded-For.
 const ip=process.env.VERCEL==='1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : 'isolated-local';
 if(!ip || !c.rateSecret) throw new Error('Rate limiting unavailable.');
 const hash=(value:string)=>createHmac('sha256',c.rateSecret!).update(value).digest('hex');
 const prefix=channel==='login'?'':channel+':';
 const {data,error}=await admin.rpc('consume_auth_limits',{p_ip_hash:hash(`${prefix}ip:${ip}`),p_identifier_hash:hash(`${prefix}identifier:${identifier}`)});
 if(error || data!==true) throw new Error('Request cannot be accepted.');
 return admin;
}
