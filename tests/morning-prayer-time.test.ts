import test from 'node:test';
import assert from 'node:assert/strict';
import {vegasInstant,vegasToday,scheduleCandidates} from '../lib/morning-prayer/time.ts';
test('Vegas clock uses correct PDT and PST offsets',()=>{
 assert.equal(vegasInstant('2026-10-20','07:00'),'2026-10-20T14:00:00.000Z');
 assert.equal(vegasInstant('2026-11-03','07:00'),'2026-11-03T15:00:00.000Z');
});
test('Vegas rejects nonexistent and ambiguous DST local times',()=>{
 assert.throws(()=>vegasInstant('2027-03-14','02:30'),/invalid/);
 assert.throws(()=>vegasInstant('2026-11-01','01:30'),/ambiguous/);
});
test('Manual recurrence honors selected weekdays and excludes unselected',()=>{
 const x=scheduleCandidates('2026-10-19','2026-10-23',[1,3,5],'07:00','07:30','gathering','2026-10-14');
 assert.deepEqual(x.map(v=>v.date),['2026-10-19','2026-10-21','2026-10-23']);
});
test('No auto recurrence beyond bounded horizon and no guessed weekdays',()=>{
 assert.throws(()=>scheduleCandidates('2026-10-19','2027-08-02',[1],'07:00','07:30','gathering','2026-10-14'));
 assert.throws(()=>scheduleCandidates('2026-10-19','2026-10-21',[],'07:00','07:30','gathering','2026-10-14'));
});
