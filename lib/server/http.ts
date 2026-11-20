import 'server-only';
import { NextResponse } from 'next/server';
import { sameOrigin } from '../contracts';
import { settings } from './config';
export function reply(data: unknown,status=200) {
 return NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
}
export async function body(request: Request,maxBytes=8192): Promise<Record<string,unknown>> {
 if (!sameOrigin(request.headers.get('origin'),settings().origin)) throw new Error('Request origin rejected.');
 if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('JSON request required.');
 // Read incrementally to enforce the limit even with no Content-Length.
 const reader=request.body?.getReader(); if(!reader) throw new Error('Request body required.');
 const chunks:Uint8Array[]=[]; let length=0;
 try { while(true) { const {done,value}=await reader.read(); if(done)break; length+=value.length; if(length>maxBytes) { await reader.cancel(); throw new Error('Request too large.'); } chunks.push(value); } } finally {reader.releaseLock();}
 const bytes=new Uint8Array(length); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const parsed:unknown=JSON.parse(new TextDecoder().decode(bytes));
 if (!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw new Error('Invalid request.');
 return parsed as Record<string,unknown>;
}
