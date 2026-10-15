import 'server-only';
import {NextResponse} from 'next/server';
export const privateHeaders={
 'Cache-Control':'private, no-store, max-age=0',
 'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'
};
export const errorReply=(status:number,error:string)=>NextResponse.json({error},{status,headers:privateHeaders});
export function badDatabaseReply(code?:string){
 if(code==='42501')return errorReply(403,'This operation is not permitted or the gathering is unavailable.');
 if(code==='23505'||code==='40001')return errorReply(409,'The schedule changed. Refresh and retry.');
 if(['22023','22P02','22007','22008'].includes(code??''))return errorReply(422,'Check the entered details and try again.');
 return errorReply(503,'Morning Prayer is temporarily unavailable.');
}
export async function guardedJSON(request:Request,limit=64000):Promise<unknown>{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('origin');
 if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw new Error('type');
 const stated=Number(request.headers.get('content-length')||0);
 if(!Number.isFinite(stated)||stated>limit)throw new Error('size');
 if(!request.body)throw new Error('body');
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>limit)throw new Error('size');chunks.push(next.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function envelope(input:unknown):{key:string;expectedVersion:number;action:Record<string,unknown>}{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid');
 const v=input as Record<string,unknown>;
 if(Object.keys(v).some(x=>!['key','expectedVersion','action'].includes(x))||
 typeof v.key!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.key)||
 !Number.isSafeInteger(v.expectedVersion)||(v.expectedVersion as number)<1||
 !v.action||typeof v.action!=='object'||Array.isArray(v.action))throw new Error('invalid');
 return {key:v.key,expectedVersion:v.expectedVersion as number,action:v.action as Record<string,unknown>};
}
export const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);