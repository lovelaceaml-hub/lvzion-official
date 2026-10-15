import test from 'node:test';
import assert from 'node:assert/strict';
import {validServiceRange,validReason,nextSlot,resourceNames,purposeLabel,startMinutes,endMinutes,uuidPattern,demoSchedule,parseBookingCommand} from '../lib/study-rooms/domain.ts';
import {parseAdminCommand} from '../lib/study-rooms/admin.ts';
import {parseStudyOperation} from '../lib/study-rooms/operations.ts';

test('service range accepts only half-hour intervals inside 10 AM to 11 PM',()=>{
 assert(validServiceRange(600,630));assert(validServiceRange(1350,1380));
 for(const [a,b] of [[570,600],[1350,1410],[630,630],[660,600],[615,660],[600,645],[600.5,660],['600',660],[600,null]])assert(!validServiceRange(a,b));
});
test('one range rule is shared by bookings, closures and the service calendar',()=>{
 const requestId=crypto.randomUUID(),resourceId='92000000-0000-4000-8000-000000000001';
 assert.throws(()=>parseBookingCommand({requestId,action:'reserve',resourceId,day:'2026-10-15',start:600,end:1410,purpose:'contact',detail:'X'}),/30-minute time range/);
 assert.throws(()=>parseAdminCommand({requestId,action:'closure.add',day:'2026-10-15',start:615,end:660,reason:'Fictional'}),/30-minute interval/);
 assert.throws(()=>parseStudyOperation({requestId,action:'day.replace',day:'2026-10-15',blocks:[{start:570,end:600,label:'Early'}],reason:'Fictional',expectedVersion:1}),/half-hour/);
});
test('reasons are 5 to 240 characters after trimming the minimum',()=>{
 assert(validReason('Valid'));assert(!validReason('    a   '));assert(!validReason('x'.repeat(241)));assert(!validReason(null));
});
test('time options, slot rounding, labels and names stay unchanged',()=>{
 assert.equal(startMinutes[0],600);assert.equal(startMinutes.at(-1),1350);assert.equal(endMinutes[0],630);assert.equal(endMinutes.at(-1),1380);
 assert.equal(nextSlot(975),990);assert.equal(nextSlot(990),990);
 assert.equal(purposeLabel('new-member'),'New Member');assert.equal(purposeLabel(undefined),undefined);
 const s=demoSchedule('2026-10-15');
 assert.equal(resourceNames(s.resources,[s.resources[0].id,s.resources[4].id]),'Room 1 + Board 1');
 assert.equal(resourceNames(s.resources,['missing'],'Resource'),'Resource');
 assert.equal(resourceNames(s.resources,['missing']),'');
 assert(uuidPattern.test(crypto.randomUUID()));
});
