import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccessEpoch,refreshBookingDay,SupersededRead} from '../lib/study-rooms/read-guard.ts';

test('current private read ticket is accepted',()=>{const a=createAccessEpoch(),t=a.capture();assert.equal(a.current(t),true);assert.doesNotThrow(()=>a.assert(t));});
test('revocation invalidates every earlier read ticket',()=>{const a=createAccessEpoch(),first=a.capture(),second=a.capture();a.invalidate();assert.equal(a.current(first),false);assert.throws(()=>a.assert(second),SupersededRead);});
test('a new explicitly retried read can complete after revocation',()=>{const a=createAccessEpoch();a.invalidate();const t=a.capture();assert.doesNotThrow(()=>a.assert(t));a.invalidate();assert.throws(()=>a.assert(t),SupersededRead);});
test('late successful response cannot republish a private result',async()=>{const a=createAccessEpoch();let publish=false;let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});const ticket=a.capture();const read=pending.then(()=>{a.assert(ticket);publish=true;});a.invalidate();release();await assert.rejects(read,SupersededRead);assert.equal(publish,false);});
test('an independent access epoch is not affected by another instance',()=>{const a=createAccessEpoch(),b=createAccessEpoch();a.invalidate();assert.equal(b.current(0),true);});
test('refresh keeps the selected booking day inside the horizon',()=>{assert.equal(refreshBookingDay('2026-10-14','2026-10-14'),'2026-10-14');assert.equal(refreshBookingDay('2026-10-17','2026-10-14'),'2026-10-17');});
test('refresh advances a yesterday selection at local midnight',()=>{assert.equal(refreshBookingDay('2026-10-14','2026-10-15'),'2026-10-15');});
test('refresh rejects the first date outside a four-day window',()=>{assert.equal(refreshBookingDay('2026-10-18','2026-10-14'),'2026-10-14');});
test('refresh handles month, year and leap-day boundaries',()=>{assert.equal(refreshBookingDay('2026-12-31','2027-01-01'),'2027-01-01');assert.equal(refreshBookingDay('2028-02-29','2028-03-01'),'2028-03-01');assert.equal(refreshBookingDay('2027-01-02','2026-12-31'),'2027-01-02');});
test('refresh never accepts an invalid date or horizon',()=>{for(const n of [0,-1,32,1.5,NaN])assert.throws(()=>refreshBookingDay('2026-10-14','2026-10-14',n));assert.throws(()=>refreshBookingDay('2026-02-30','2026-03-01'));assert.throws(()=>refreshBookingDay('2026-10-14','not-a-date'));});
