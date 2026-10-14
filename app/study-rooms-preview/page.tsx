'use client';
import {useEffect,useRef,useState} from 'react';
import Reservations from '../../components/study-rooms/reservations';
import {demoSchedule,simulate,vegasDay,serviceBlocks,addDay,bookingResources} from '../../lib/study-rooms/domain';
import {simulateAdmin} from '../../lib/study-rooms/admin';
import {previewHistory} from '../../lib/study-rooms/history';
import type {Booking,Schedule} from '../../lib/study-rooms/domain';
import type {AdminData} from '../../lib/study-rooms/admin';
export default function StudyRoomsPreview(){
 const [today,setToday]=useState(''),[day,setDay]=useState(''),[manager,setManager]=useState(false),[minute,setMinute]=useState(540),[bookings,setBookings]=useState<Booking[]>([]),[admin,setAdmin]=useState<AdminData>({resources:[],closures:[]});
 const receipts=useRef(new Map<string,string>());
 useEffect(()=>{const key=vegasDay(),seed=demoSchedule(key,key);setToday(key);setDay(key);setBookings([...seed.bookings.map(b=>({...b,version:1})),{id:'93000000-0000-4000-8000-000000000003',resourceId:seed.resources[2].id,resourceIds:[seed.resources[2].id,seed.resources[4].id],day:addDay(key,-1),start:780,end:840,state:'cancelled',mine:true,label:'You · fictional member',purpose:'other',detail:'Fictional historical example',hold:false,version:2,cancelReason:'Fictional plans changed'}]);setAdmin({resources:seed.resources.map(r=>({...r,active:true,version:1})),closures:[]});},[]);
 if(!day)return <main className="sr-app"><p>Loading fictional reservation preview…</p></main>;
 function schedule(date:string):Schedule{return {day:date,today,nowMinute:minute,open:600,close:1380,step:30,horizon:4,resources:admin.resources,canManage:manager,bookings,blocks:[...serviceBlocks(date),...admin.closures.filter(c=>c.active&&c.day===date).map(c=>({start:c.start,end:c.end,resourceId:c.resourceId,label:'Scheduled closure'}))]};}
 return <><div className="sr-preview-controls"><label><input type="checkbox" checked={manager} onChange={e=>setManager(e.target.checked)}/> Preview explicit reservation-manager permission</label><p><label>Simulated time<select aria-label="Simulated time" value={minute} onChange={e=>setMinute(Number(e.target.value))}><option value="540">9:00 AM</option><option value="975">4:15 PM — test early release</option></select></label></p></div>
 <Reservations schedule={schedule(day)} demo changeDay={setDay} loadDay={async date=>schedule(date)} loadHistory={async query=>previewHistory(bookings.map(b=>({...b,resourceNames:bookingResources(b).map(id=>admin.resources.find(r=>r.id===id)?.name??'Resource')})),query,manager)} admin={admin} saveAdmin={async c=>{setAdmin(simulateAdmin(admin,schedule(day),c));}} submit={async command=>{
  const payload=JSON.stringify(command),previous=receipts.current.get(command.requestId);if(previous){if(previous!==payload)throw Error('Request identifier already used.');return;}
  const updated=simulate(schedule(command.day??day),command);setBookings(updated.bookings);receipts.current.set(command.requestId,payload);
 }}/></>;
}
