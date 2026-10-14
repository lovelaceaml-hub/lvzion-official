'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Reservations from '../../../components/study-rooms/reservations';
import {dayKey,vegasDay} from '../../../lib/study-rooms/domain';
import type {Schedule,BookingCommand} from '../../../lib/study-rooms/domain';
import type {AdminCommand,AdminData} from '../../../lib/study-rooms/admin';
import type {HistoryPage,HistoryQuery} from '../../../lib/study-rooms/history';
import {broadcastStudyChange,subscribeStudyRefresh} from '../../../lib/study-rooms/freshness';
class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
async function readJSON<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch(path,{...options,cache:'no-store'});
 let result;try{result=await response.json();}catch{throw new RequestError('The server response could not be read. Please refresh.',response.status);}
 if(!response.ok)throw new RequestError(result.error??'Request unavailable.',response.status);return result as T;
}
export default function StudyRooms(){
 const [day,setDay]=useState(''),[data,setData]=useState<Schedule|null>(null),[admin,setAdmin]=useState<AdminData>(),[error,setError]=useState(''),[warning,setWarning]=useState(''),[lastRefresh,setLastRefresh]=useState('');
 const sequence=useRef(0),controller=useRef<AbortController|null>(null);
 const loadDay=useCallback(async(date:string)=>{dayKey(date);return readJSON<Schedule>('/api/study-rooms?day='+encodeURIComponent(date));},[]);
 const load=useCallback(async(date:string):Promise<boolean>=>{
  const id=++sequence.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;
  try{dayKey(date);const schedule=await readJSON<Schedule>('/api/study-rooms?day='+encodeURIComponent(date),{signal:abort.signal});
   const config=schedule.canManage?await readJSON<AdminData>('/api/study-rooms/admin',{signal:abort.signal}):undefined;
   if(id!==sequence.current)return false;setData(schedule);setAdmin(config);setError('');setWarning('');setLastRefresh(new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'}));return true;
  }catch(e){if(id!==sequence.current||abort.signal.aborted)return false;const message=e instanceof Error?e.message:'Unable to refresh reservations.';
   if(e instanceof RequestError&&(e.status===401||e.status===403)){setData(null);setAdmin(undefined);setError(message);}
   else{setError(message);setWarning('Availability could not be refreshed. The server will recheck every reservation before saving.');}return false;
  }
 },[]);
 useEffect(()=>{setDay(vegasDay());return ()=>{sequence.current++;controller.current?.abort();};},[]);
 useEffect(()=>{if(!day)return;setData(null);setAdmin(undefined);void load(day);return subscribeStudyRefresh(()=>load(day));},[day,load]);
 async function post(path:string,command:BookingCommand|AdminCommand){
  try{await readJSON(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});}
  catch(e){if(e instanceof RequestError&&(e.status===409||e.status===401||e.status===403))await load(day);throw e;}
  broadcastStudyChange();const fresh=await load(day);if(!fresh)setWarning('Your change was saved, but this screen could not refresh. Use Refresh to see the saved reservation.');
 }
 async function loadHistory(query:HistoryQuery){
  try{return await readJSON<HistoryPage>('/api/study-rooms/history?'+new URLSearchParams({from:query.from,to:query.to,offset:String(query.offset),managed:String(query.managed)}));}
  catch(e){if(e instanceof RequestError&&(e.status===401||e.status===403)){setData(null);setAdmin(undefined);setError(e.message);}throw e;}
 }
 if(!data)return <main className="sr-app"><h1>Study Room Reservation</h1><p role="status">{error||'Checking authorized reservation access…'}</p><p>Access requires an active member account and a separately approved Study Room grant.</p><a href="/sign-in">Sign in</a><p><a href="/study-rooms-preview">Open the fictional development preview</a></p>{day&&<button onClick={()=>{void load(day);}}>Try again</button>}</main>;
 return <>{warning&&<p role="status" className="sr-demo">{warning}</p>}<p className="sr-freshness">Updated {lastRefresh} Las Vegas time · Refreshes while this screen is active</p><Reservations schedule={data} changeDay={setDay} refresh={()=>{void load(day);}} loadDay={loadDay} loadHistory={loadHistory} admin={admin} saveAdmin={c=>post('/api/study-rooms/admin',c)} submit={c=>post('/api/study-rooms/command',c)}/></>;
}
