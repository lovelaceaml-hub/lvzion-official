import {NextResponse} from 'next/server';
// Legacy query-token links are intentionally not consumed on GET (email scanners).
export async function GET(request:Request){return NextResponse.redirect(new URL('/sign-in?error=use-current-confirmation',request.url),{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});}
