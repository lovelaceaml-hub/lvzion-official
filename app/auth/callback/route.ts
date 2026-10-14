import { NextResponse } from 'next/server';
import { userClient } from '../../../lib/server/supabase';
import { settings } from '../../../lib/server/config';
import { safeNext } from '../../../lib/contracts';
export async function GET(request:Request) {
 try {const c=settings();const params=new URL(request.url).searchParams;const code=params.get('code');if(!code)throw new Error('Missing code.');
  const client=await userClient();const result=await client.auth.exchangeCodeForSession(code);if(result.error)throw new Error('Invalid code.');
  return NextResponse.redirect(new URL(safeNext(params.get('next')),c.origin),{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 } catch {return NextResponse.redirect(new URL('/sign-in?error=confirmation',request.url),{headers:{'Cache-Control':'private, no-store'}});}
}
