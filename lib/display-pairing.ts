import {createHash,randomBytes} from 'node:crypto';
export const DEVICE_COOKIE='lvz_display_device';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function createPairCode():string{
 const bytes=randomBytes(12);
 return Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
}
export function formatPairCode(value:string){return value.match(/.{1,4}/g)?.join('-')??value;}
export function normalizePairCode(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const code=value.toUpperCase().replace(/[\s–-]/g,'');
 return code.length===12&&[...code].every(c=>alphabet.includes(c))?code:null;
}
export function createDeviceSecret():string{return randomBytes(32).toString('base64url');}
export function deviceDigest(value:string):string{return createHash('sha256').update(value,'utf8').digest('hex');}
