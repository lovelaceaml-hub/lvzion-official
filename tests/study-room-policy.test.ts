import test from 'node:test';
import assert from 'node:assert/strict';
import {RESOURCES,BOOKING_RULES,bookingWindow,checkBooking,dateIsValid,freeUnits,minutes,overlaps,sampleReservations,serviceBlocks,timeOptions,formattedTime} from '../lib/study-room-policy.ts';
import type {BookingRequest,Reservation} from '../lib/study-room-policy.ts';
const today='2026-10-14';
const ctx={today,localTime:'10:00'};
const defaultReq:BookingRequest={date:today,start:'12:00',end:'13:00',purpose:'contact',detail:'Example contact',resources:['room']};
const check=(updates:Partial<BookingRequest>={},bookings:Reservation[]=[])=>
 checkBooking({...defaultReq,...updates},bookings,ctx);

test('legacy resource quantities are retained in fictional policy',()=>{
 assert.equal(RESOURCES.room.units.length,4);assert.equal(RESOURCES.whiteboard.units.length,5);
 assert.equal(RESOURCES.tv.units.length,3);
});
test('booking window is today plus three more days',()=>assert.deepEqual(bookingWindow(today),['2026-10-14','2026-10-15','2026-10-16','2026-10-17']));
test('dates reject invalid/rollover syntax',()=>{
 assert.equal(dateIsValid('2026-02-30'),false);
 assert.equal(dateIsValid('2026-10-14'),true);
 assert.equal(dateIsValid('2026-1-1'),false);
});
test('30 minute grid from 10 AM to 11 PM is preserved',()=>{
 const options=timeOptions();
 assert.equal(options[0],'10:00');assert.equal(options.at(-1),'23:00');assert.equal(options.length,27);
 assert.equal(BOOKING_RULES.slotMinutes,30);
});
test('clock rejects malformed format',()=>assert.throws(()=>minutes('12:99')));
test('back-to-back reservations do not overlap',()=>{
 assert.equal(overlaps('12:00','13:00','13:00','14:00'),false);
 assert.equal(overlaps('12:00','13:01','13:00','14:00'),true);
});
test('Wednesday evening service is excluded',()=>{
 assert.deepEqual(serviceBlocks(today).map(s=>s.start),['19:30']);
 assert.equal(check({start:'19:00',end:'20:00'}).ok,false);
});
test('Saturday service times are excluded',()=>{
 const date='2026-10-17';
 assert.equal(serviceBlocks(date).length,3);
 assert.equal(check({date,start:'10:30',end:'11:30'}).ok,false);
 assert.equal(check({date,start:'15:30',end:'16:00'}).ok,true);
});
test('days with no services support normal hours',()=>assert.equal(serviceBlocks('2026-10-15').length,0));
test('cannot book before 10am or after 11pm',()=>{
 assert.equal(check({start:'09:30'}).ok,false);
 assert.equal(check({start:'22:30',end:'23:30'}).ok,false);
});
test('cannot book an already started half-hour slot',()=>{
 assert.equal(check({start:'10:00',end:'10:30'}).ok,false);
 assert.equal(check({start:'10:30',end:'11:00'}).ok,true);
});
test('cannot reserve invalid dates or unapproved categories',()=>{
 assert.equal(check({date:'2026-10-19'}).ok,false);
 assert.equal(check({purpose:'blocked' as never}).ok,false);
});
test('cannot reserve zero, duplicate, or invented resource kinds',()=>{
 assert.equal(check({resources:[]}).ok,false);
 assert.equal(check({resources:['room','room']}).ok,false);
 assert.equal(check({resources:['visitor' as never]}).ok,false);
});
test('all requested resources must be available together',()=>{
 const b:Reservation[]=[{id:'x',date:today,start:'12:00',end:'13:00',purpose:'blocked',detail:'',memberLabel:'Reserved',status:'active',owner:'admin',assignments:{tv:'tv-1'}}];
 const out=check({resources:['room','whiteboard','tv']},b);
 assert.equal(out.ok,true);
 if(out.ok){assert.equal(out.assignments.room,'room-1');assert.equal(out.assignments.whiteboard,'wb-1');assert.equal(out.assignments.tv,'tv-2');}
});
test('same resource unit cannot be double booked',()=>{
 const busy:Reservation[]=RESOURCES.room.units.map((u,i)=>({id:String(i),date:today,start:'12:00',end:'13:00',purpose:'other',detail:'Sample',memberLabel:'Example',status:'active',owner:'demo-other',assignments:{room:u.id}}));
 assert.equal(freeUnits('room',today,'12:00','13:00',busy).length,0);
 const result=check({},busy);assert.equal(result.ok,false);
 if(!result.ok)assert.equal(result.code,'unavailable');
});
test('priority cannot silently displace ordinary bookings',()=>{
 const busy:Reservation[]=RESOURCES.room.units.map((u,i)=>({id:String(i),date:today,start:'12:00',end:'13:00',purpose:'other',detail:'Sample',memberLabel:'Example',status:'active',owner:'demo-other',assignments:{room:u.id}}));
 const r=check({purpose:'contact'},busy);assert.equal(r.ok,false);
 if(!r.ok)assert.match(r.message,/require separate review/);
});
test('an admin hold cannot be taken or silently cancelled',()=>{
 const hold:Reservation={id:'hold',date:today,start:'12:00',end:'13:00',purpose:'blocked',detail:'',memberLabel:'Reserved',status:'active',owner:'admin',assignments:{room:'room-1'}};
 assert.equal(freeUnits('room',today,'12:00','13:00',[hold]).some(u=>u.id==='room-1'),false);
});
test('cancelled bookings cease blocking their unit',()=>{
 const b=sampleReservations(today)[0];const same={...b,status:'cancelled' as const};
 assert.equal(freeUnits('room',today,'13:00','14:00',[same]).length,4);
});
test('long contact/detail names are rejected',()=>{
 assert.equal(check({detail:'x'.repeat(121)}).ok,false);
 assert.equal(check({purpose:'other',detail:'x'.repeat(240)}).ok,true);
});
test('time formatting uses normal AM and PM',()=>{
 assert.equal(formattedTime('10:00'),'10 AM');
 assert.equal(formattedTime('12:30'),'12:30 PM');
 assert.equal(formattedTime('23:00'),'11 PM');
});
test('fictional seed contains holds and multiple resource assignments',()=>{
 const bookings=sampleReservations(today);assert.ok(bookings.some(b=>b.owner==='admin'&&b.purpose==='blocked'));
 assert.ok(bookings.some(b=>Object.keys(b.assignments).length>1));
});
