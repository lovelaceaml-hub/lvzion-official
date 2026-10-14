import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
export function proxy(request:NextRequest){
 if(process.env.VERCEL_ENV==='production')return NextResponse.redirect(new URL('/sign-in',request.url));
 return NextResponse.next();
}
export const config={matcher:['/experience-preview/:path*','/member-preview/:path*','/enrollment-preview/:path*','/roster-preview/:path*']};
