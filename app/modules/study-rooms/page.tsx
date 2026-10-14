'use client';
import {useEffect,useRef,useState}from'react';
import Reservations from '../../../components/study-rooms/reservations';
import{vegasDay,dayKey}from'../../../lib/study-rooms/domain';
import type{Schedule}from'../../../lib/study-rooms/domain';
import type{AdminData}from'../../../lib/study-rooms/admin';
export default function StudyRooms(){
 const [day,setDay]=useState(''),[data,setData]=useState<Schedule|null>(null),[admin,setAdmin]=useState<AdminData|undefined>(),[error,setError]=useState('');const sequence=useRef(0);
 useEffect(()=>setDay(vegasDay()),[]);
 async function loadDay(date:string):Promise<Schedule>{dayKey(date);const response=await fetch('/api/study-rooms?day='+date,{cache:'no-store'}),payload=await response.json();if(!response.ok)throw Error(payload.error??'Reservation service unavailable.');return payload;}
 async function load(){if(!day)return;const seq=++sequence.current;try{const payload=await loadDay(day);if(seq!==sequence.current)return;setData(payload);setError('');setAdmin(undefined);if(payload.canManage){const r=await fetch('/api/study-rooms/admin',{cache:'no-store'});if(seq===sequence.current&&r.ok)setAdmin(await r.json());}}catch(e){if(seq===sequence.current){setData(null);setAdmin(undefined);setError((e as Error).message);}}}
 useEffect(()=>{setData(null);setAdmin(undefined);void load();const focus=()=>{void load();};window.addEventListener('focus',focus);return()=>{sequence.current++;window.removeEventListener('focus',focus);};},[day]);
 if(!data)return <main className="sr-app"><a href="/members">← LV Zion Home</a><h1>Study Room Reservation</h1><p role="status">{error||'Loading authorized availability…'}</p>{error&&<p><a href="/sign-in">Sign in</a> · <a href="/study-rooms-preview">Fictional reservation preview</a></p>}</main>;
 async function post(path:string,payload:unknown){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await response.json();if(!response.ok)throw Error(result.error??'Change could not be saved.');await load();}
 return <Reservations schedule={data} changeDay={setDay} refresh={()=>{void load();}} loadDay={loadDay} admin={admin}
 saveAdmin={c=>post('/api/study-rooms/admin',c)} submit={c=>post('/api/study-rooms/command',c)}/>;
}
