'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Reservations from '../../../components/study-rooms/reservations';
import {dayKey,vegasDay} from '../../../lib/study-rooms/domain';
import type {Schedule,BookingCommand} from '../../../lib/study-rooms/domain';
import type {AdminCommand,AdminData} from '../../../lib/study-rooms/admin';
import type {HistoryPage,HistoryQuery} from '../../../lib/study-rooms/history';
import {broadcastStudyChange,subscribeStudyRefresh} from '../../../lib/study-rooms/freshness';
import {createAccessEpoch,refreshBookingDay,SupersededRead} from '../../../lib/study-rooms/read-guard';
class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
async function readJSON<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch(path,{...options,cache:'no-store'});
 let result;try{result=await response.json();}catch{throw new RequestError('The server response could not be read. Please refresh.',response.status);}
 if(!response.ok)throw new RequestError(result.error??'Request unavailable.',response.status);return result as T;
}
const accessDenied=(e:unknown):e is RequestError=>e instanceof RequestError&&(e.status===401||e.status===403);
export default function StudyRooms(){
 const [day,setDay]=useState(''),[data,setData]=useState<Schedule|null>(null),[admin,setAdmin]=useState<AdminData>(),[error,setError]=useState(''),[warning,setWarning]=useState(''),[lastRefresh,setLastRefresh]=useState('');
 const sequence=useRef(0),controller=useRef<AbortController|null>(null);
 const access=useRef(createAccessEpoch()).current;
 const clearAccess=useCallback((message:string)=>{
  access.invalidate();sequence.current++;controller.current?.abort();
  setData(null);setAdmin(undefined);setLastRefresh('');setWarning('');setError(message);
 },[access]);
 const loadDay=useCallback(async(date:string):Promise<Schedule>=>{
  dayKey(date);const ticket=access.capture();
  try{const value=await readJSON<Schedule>('/api/study-rooms?day='+encodeURIComponent(date));access.assert(ticket);return value;}
  catch(e){if(access.current(ticket)&&accessDenied(e))clearAccess(e.message);throw e;}
 },[access,clearAccess]);
 const load=useCallback(async(date:string):Promise<boolean>=>{
  const nextDay=refreshBookingDay(date,vegasDay());
  if(nextDay!==date){sequence.current++;controller.current?.abort();setData(null);setAdmin(undefined);setDay(nextDay);return false;}
  const ticket=access.capture(),id=++sequence.current;
  controller.current?.abort();const abort=new AbortController();controller.current=abort;
  try{
   const schedule=await readJSON<Schedule>('/api/study-rooms?day='+encodeURIComponent(date),{signal:abort.signal});access.assert(ticket);
   const config=schedule.canManage?await readJSON<AdminData>('/api/study-rooms/admin',{signal:abort.signal}):undefined;
   access.assert(ticket);if(id!==sequence.current)return false;
   setData(schedule);setAdmin(config);setError('');setWarning('');
   setLastRefresh(new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'}));return true;
  }catch(e){
   if(e instanceof SupersededRead||!access.current(ticket)||id!==sequence.current||abort.signal.aborted)return false;
   const message=e instanceof Error?e.message:'Unable to refresh reservations.';
   if(accessDenied(e))clearAccess(message);
   else{setError(message);setWarning('Availability could not be refreshed. The server will recheck every reservation before saving.');}return false;
  }
 },[access,clearAccess]);
 useEffect(()=>{setDay(vegasDay());return ()=>{access.invalidate();sequence.current++;controller.current?.abort();};},[access]);
 useEffect(()=>{if(!day)return;setData(null);setAdmin(undefined);void load(day);return subscribeStudyRefresh(()=>load(day));},[day,load]);
 async function post(path:string,command:BookingCommand|AdminCommand){
  const ticket=access.capture();
  try{await readJSON(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});}
  catch(e){
   if(accessDenied(e)){if(access.current(ticket))clearAccess(e.message);}
   else if(e instanceof RequestError&&e.status===409&&access.current(ticket))await load(day);
   throw e;
  }
  if(!access.current(ticket))throw new Error('Your access changed while saving. Check the reservation after signing in again.');
  broadcastStudyChange();const fresh=await load(day);
  if(!fresh&&access.current(ticket))setWarning('Your change was saved, but this screen could not refresh. Use Refresh to see the saved reservation.');
 }
 async function loadHistory(query:HistoryQuery):Promise<HistoryPage>{
  const ticket=access.capture();
  try{
   const result=await readJSON<HistoryPage>('/api/study-rooms/history?'+new URLSearchParams({from:query.from,to:query.to,offset:String(query.offset),managed:String(query.managed)}));
   access.assert(ticket);return result;
  }catch(e){if(access.current(ticket)&&accessDenied(e))clearAccess(e.message);throw e;}
 }
 if(!data)return <main className="sr-app"><h1>Study Room Reservation</h1><p role="status">{error||'Checking authorized reservation access…'}</p><p>Study Room access requires sign-in and an explicit module grant.</p><a href="/sign-in">Sign in</a><p><a href="/members">Return to LV Zion Home</a></p>{day&&<button onClick={()=>{void load(day);}}>Try again</button>}</main>;
 return <>{warning&&<p role="status" className="sr-demo">{warning}</p>}<p className="sr-freshness">Updated {lastRefresh} Las Vegas time · Refreshes while this screen is active</p><Reservations schedule={data} changeDay={setDay} refresh={()=>{void load(day);}} loadDay={loadDay} loadHistory={loadHistory} admin={admin} saveAdmin={c=>post('/api/study-rooms/admin',c)} submit={c=>post('/api/study-rooms/command',c)}/></>;
}
