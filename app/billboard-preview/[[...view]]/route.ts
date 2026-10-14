import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** Fixed fictional shell and reachability check only: no DB, member session or screen credential. */
export async function GET(request:Request){
 const url=new URL(request.url);
 if(process.env.VERCEL_ENV==='production')return new Response('Not available',{status:404});
 if(url.pathname==='/billboard-preview/heartbeat')return Response.json({fictional:true,reachable:true,serverTime:Date.now()},{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 if(!['/billboard-preview','/billboard-preview/manage','/billboard-preview/player','/billboard-preview/lab'].includes(url.pathname))return new Response('Not available',{status:404});
 const html=await readFile(join(process.cwd(),'public/billboard-preview/shell.html'),'utf8');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}});
}
