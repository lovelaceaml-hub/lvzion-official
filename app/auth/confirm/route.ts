import { NextResponse } from 'next/server';
import { userClient } from '../../../lib/server/supabase';
import { settings } from '../../../lib/server/config';
import { safeNext } from '../../../lib/contracts';
export async function GET(request:Request) {
 try {const c=settings(); const params=new URL(request.url).searchParams; const token_hash=params.get('token_hash'); const type=params.get('type');
  if(!token_hash || !['invite','recovery','email'].includes(type??'')) throw new Error('Invalid confirmation.');
  const client=await userClient(); const result=await client.auth.verifyOtp({token_hash,type:type as 'invite'|'recovery'|'email'});
  if(result.error) throw new Error('Invalid confirmation.');
  const next=safeNext(type==='recovery'?'/reset-password':params.get('next'));
  return NextResponse.redirect(new URL(next,c.origin),{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 } catch {return NextResponse.redirect(new URL('/sign-in?error=confirmation',request.url),{headers:{'Cache-Control':'private, no-store'}});}
}
