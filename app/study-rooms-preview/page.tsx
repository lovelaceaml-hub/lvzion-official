'use client';
import {useEffect,useState} from 'react';
import Reservations from '../../components/study-rooms/reservations';
import {demoSchedule,simulate,vegasDay} from '../../lib/study-rooms/domain';
import type {Schedule} from '../../lib/study-rooms/domain';
export default function StudyRoomsPreview(){
 const [today,setToday]=useState(''),[day,setDay]=useState(''),[manager,setManager]=useState(false),[cache,setCache]=useState<Record<string,Schedule>>({});
 useEffect(()=>{const key=vegasDay();setToday(key);setDay(key);},[]);
 if(!day)return <main className="sr-app"><p>Loading fictional reservation preview…</p></main>;
 const schedule={...(cache[day]??demoSchedule(day,today)),canManage:manager};
 return <><div style={{maxWidth:760,margin:'auto',padding:'15px 20px',background:'#f3f7f5',font:'12px Arial'}}><label><input type="checkbox" checked={manager} onChange={e=>setManager(e.target.checked)}/> Preview explicit reservation-manager permission</label></div><Reservations schedule={schedule} demo changeDay={setDay} submit={async command=>{const updated=simulate(schedule,command);setCache(c=>({...c,[day]:updated}));}}/></>;
}
