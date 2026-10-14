import test from 'node:test';import assert from 'node:assert/strict';
import {parseDisplaySnapshotR2,parseOperatingHours,standardOperatingHours,withinOperatingHours,minuteValue,timeValue,overrideForDisplay} from '../lib/continuous-display/operations.ts';
const demo={paired:true,screen:'Test TV',version:1,
 serverTime:'2026-10-14T18:00:00.000Z',leaseUntil:'2026-10-14T18:00:30.000Z',
 slides:[{id:'welcome',kind:'announcement',style:'editorial',title:'Synthetic',body:'Not church content',duration:12}]};
test('display R2: operating hours are seven unique, structured days',()=>{
 assert.equal(parseOperatingHours(standardOperatingHours()).length,7);
 for(const invalid of [null,{},[null],Array(6).fill(null),[
  ...standardOperatingHours().slice(0,6),{...standardOperatingHours()[0]}
 ],[{day:0,start:0,end:1440,enabled:true,privateMember:'x'}]])
  assert.throws(()=>parseOperatingHours(invalid));
});
test('display R2: anytime mode and disabled days are deterministic',()=>{
 assert.equal(withinOperatingHours([],Date.parse('2026-10-14T18:00:00Z')),true);
 const hours=standardOperatingHours();hours[3].enabled=false;
 assert.equal(withinOperatingHours(hours,Date.parse('2026-10-14T18:00:00Z')),false);
});
test('display R2: closed-open daily hour boundaries',()=>{
 const hours=standardOperatingHours();
 assert.equal(withinOperatingHours(hours,Date.parse('2026-10-14T13:59:00Z')),false);
 assert.equal(withinOperatingHours(hours,Date.parse('2026-10-14T14:00:00Z')),true);
 assert.equal(withinOperatingHours(hours,Date.parse('2026-10-15T06:00:00Z')),false);
});
test('display R2: DST start and end use Las Vegas local wall time',()=>{
 const hours=standardOperatingHours();
 assert.equal(withinOperatingHours(hours,Date.parse('2026-03-08T13:59:00Z')),false);
 assert.equal(withinOperatingHours(hours,Date.parse('2026-03-08T14:00:00Z')),true);
 assert.equal(withinOperatingHours(hours,Date.parse('2026-11-01T14:59:00Z')),false);
 assert.equal(withinOperatingHours(hours,Date.parse('2026-11-01T15:00:00Z')),true);
});
test('display R2: time fields validate and format safely',()=>{
 assert.equal(minuteValue('07:30'),450);assert.equal(timeValue(450),'07:30');
 assert.equal(minuteValue('24:00'),1440);
 for(const invalid of ['07:80','25:00','invalid'])assert.throws(()=>minuteValue(invalid));
});
test('display R2: backward-compatible neutral screen parser',()=>{
 const result=parseDisplaySnapshotR2(demo);
 assert.deepEqual(result.operatingHours,[]);assert.equal(result.overrideSlideId,null);
});
test('display R2: private root projection, excess lease and incomplete overrides reject',()=>{
 for(const raw of [{...demo,privatePhone:'secret'},{...demo,overrideSlideId:'welcome'},
 {...demo,overrideSlideId:'unreviewed',overrideUntil:'2026-10-14T18:05:00.000Z'}]){
  assert.throws(()=>parseDisplaySnapshotR2(raw));
 }
});
test('display R2: current approved temporary notice is selectable but expires',()=>{
 const r=parseDisplaySnapshotR2({...demo,overrideSlideId:'welcome',overrideUntil:'2026-10-14T18:01:00.000Z'});
 assert.equal(overrideForDisplay(r,Date.parse('2026-10-14T18:00:30Z'))?.id,'welcome');
 assert.equal(overrideForDisplay(r,Date.parse('2026-10-14T18:01:00Z')),null);
});
