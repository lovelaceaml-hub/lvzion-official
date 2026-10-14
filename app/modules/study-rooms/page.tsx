'use client';
import {useEffect,useRef,useState}from'react';
import Reservations from '../../../components/study-rooms/reservations';
import{vegasDay}from'../../../lib/study-rooms/domain';
import type{Schedule}from'../../../lib/study-rooms/domain';
export default function StudyRooms(){
 const [day,setDay]=useState(''),[data,setData]=useState<Schedule|null>(null),[error,setError]=useState('');const sequence=useRef(0);
 useEffect(()=>setDay(vegasDay()),[]);
 async function load(){if(!day)return;const seq=++sequence.current;try{const response=await fetch('/api/study-rooms?day='+day,{cache:'no-store'});const payload=await response.json();if(seq!==sequence.current)return;if(!response.ok)throw Error(payload.error??'Reservation service unavailable.');setData(payload);setError('');}catch(e){if(seq===sequence.current){setData(null);setError((e as Error).message);}}}
 useEffect(()=>{setData(null);void load();const focus=()=>{void load();};window.addEventListener('focus',focus);return()=>{sequence.current++;window.removeEventListener('focus',focus);};},[day]);
 if(!data)return <main className="sr-app"><a href="/members">← LV Zion Home</a><h1>Study Room Reservation</h1><p role="status">{error||'Loading authorized availability…'}</p>{error&&<p><a href="/sign-in">Sign in</a> · <a href="/study-rooms-preview">Fictional reservation preview</a></p>}</main>;
 return <Reservations schedule={data} changeDay={setDay} refresh={()=>{void load();}} submit={async command=>{const response=await fetch('/api/study-rooms/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});const result=await response.json();if(!response.ok)throw Error(result.error??'Reservation could not be saved.');await load();}}/>;
}
