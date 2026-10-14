import {validatePackage,projectForScreen,type DisplayPackage} from '../../public/billboard-preview/engine.mjs';
/** Untrusted input boundary for future adapters. This contract intentionally permits only fictional packages. */
export function parseFictionalManifest(input:string,screenId:string,now:number):Readonly<DisplayPackage>|null{
 if(!Number.isFinite(now)||typeof input!=='string'||new TextEncoder().encode(input).byteLength>65536)return null;
 try{
  const value:unknown=JSON.parse(input);
  if(!validatePackage(value)||value.issuedAt>now+5000||value.screenId!==screenId)return null;
  return projectForScreen(value,screenId,now);
 }catch{return null;}
}
/** A live availability adapter must never translate stale/unavailable data into “available”. */
export function availabilityFreshness(observedAt:number|null,now:number,maxAgeMs:number):'current'|'stale'|'unavailable'{
 if(observedAt===null||!Number.isFinite(observedAt)||!Number.isFinite(now)||!Number.isFinite(maxAgeMs)||maxAgeMs<=0||observedAt>now+5000)return 'unavailable';
 return now-observedAt<=maxAgeMs?'current':'stale';
}
export const DISPLAY_ADAPTERS=Object.freeze({rooms:false,worshipDuty:false,workMission:false,mothersLove:false});
