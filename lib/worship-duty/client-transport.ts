import {WorshipError,parseWorkspace,parseCandidates,parseSongs,parseCommand,parseLookup} from './api-contract.ts';
import type {Workspace,CandidateList,SongList,Command} from './api-contract.ts';
import type {Duty} from './domain.ts';
export type WorshipTransport={workspace:()=>Promise<Workspace>;candidates:(serviceId:string,dutyId:Duty)=>Promise<CandidateList>;songs:(serviceId:string,search?:string)=>Promise<SongList>;command:(command:Command)=>Promise<void>};

export function createHttpTransport(fetcher:typeof fetch=fetch):WorshipTransport{
 async function send(path:string,command?:Command):Promise<unknown>{
  const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),25000);
  try{
   const response=await fetcher('/api/worship-duty'+path,{method:command?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:timeout.signal,headers:command?{'Content-Type':'application/json'}:undefined,body:command?JSON.stringify(parseCommand(command)):undefined});
   if(!response.headers.get('content-type')?.includes('application/json'))throw new WorshipError('The service did not return a valid response. Reload before trying again.',503,'unavailable');
   const raw=await response.text();if(raw.length>2_000_000)throw new WorshipError('The service response is too large.',503,'unavailable');
   let data:unknown;try{data=JSON.parse(raw);}catch{throw new WorshipError('The service response could not be read.',503,'unavailable');}
   if(!response.ok){const code=response.status===401?'session':response.status===403?'access':response.status===409?'stale':response.status===422?'rule':'unavailable';const messages={session:'Sign in again to continue.',access:'Your access changed. The workspace has been cleared.',stale:'This record changed. Reload and review it before saving.',rule:'That change is not allowed. Review the assignment or song selections.',unavailable:'Worship Duty is unavailable. Reload before trying again.'};throw new WorshipError(messages[code],response.status,code);}
   return data;
  }catch(e){if(e instanceof WorshipError)throw e;throw new WorshipError('Connection interrupted. A save may have completed. Reload to verify before trying again.',0,'connection');}
  finally{clearTimeout(timer);}
 }
 return{
  workspace:async()=>parseWorkspace(await send('')),
  candidates:async(serviceId,dutyId)=>{parseLookup({kind:'candidates',serviceId,dutyId});const r=parseCandidates(await send('?'+new URLSearchParams({kind:'candidates',serviceId,dutyId})));if(r.serviceId!==serviceId||r.dutyId!==dutyId)throw new WorshipError('Assignment options changed. Reload.',409,'stale');return r;},
  songs:async(serviceId,search='')=>{parseLookup({kind:'songs',serviceId,search});const r=parseSongs(await send('?'+new URLSearchParams({kind:'songs',serviceId,search})));if(r.serviceId!==serviceId)throw new WorshipError('The service changed. Reload.',409,'stale');return r;},
  command:async command=>{const r=await send('',command);if(!r||typeof r!=='object'||!('ok' in r)||r.ok!==true)throw new WorshipError('Save status is unknown. Reload to verify.',503,'unavailable');}
 };
}
