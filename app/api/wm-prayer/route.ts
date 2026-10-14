import { NextResponse } from 'next/server';
import { requireMember } from '../../../lib/server/supabase';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
async function disabled(){
 try{await requireMember();}catch{return NextResponse.json({error:'Sign in required.'},{status:401,headers});}
 return NextResponse.json({error:'Work Mission live operations are not activated.'},{status:503,headers});
}
// No payload is read or logged. There is no active ingestion, generation, publication or sharing adapter.
export const GET=disabled;
export const POST=disabled;
