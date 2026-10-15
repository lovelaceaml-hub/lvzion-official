import test from 'node:test';
import assert from 'node:assert/strict';
import {actionNotices,activitiesForPreview,addCalendarDays,cleanFavorites,conceptModules,greeting,initials,localDay,localTime,mondayOf,nowIndex,monthCells,reorderFavorite,toggleFavorite,weekDays} from '../lib/member-experience.ts';
import {demoWorkspace,id,initialDemo}from'../lib/demo.ts';

test('Las Vegas local day differs correctly from UTC around midnight',()=>{
 assert.equal(localDay(new Date('2026-10-14T05:00:00Z')),'2026-10-13');
 assert.equal(localDay(new Date('2026-12-01T07:30:00Z')),'2026-11-30');
});
test('Monday week follows calendar dates across month rollover',()=>{
 assert.equal(mondayOf('2026-10-13'),'2026-10-12');
 assert.deepEqual(weekDays('2026-10-31'),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
});
test('calendar has exactly 42 accessible cells across DST changes',()=>{
 const cells=monthCells('2026-11-10');assert.equal(cells.length,42);
 assert.equal(new Set(cells.map(c=>c.date)).size,42);assert.equal(cells.filter(c=>c.inMonth).length,30);
 assert.equal(addCalendarDays('2026-10-31',1),'2026-11-01');
});
test('nonsense calendar dates are rejected',()=>assert.throws(()=>monthCells('2026-02-99')));
test('preview activities are explicitly fictional with no official app id',()=>{
 const items=activitiesForPreview('2026-10-13');assert.equal(items.length,4);
 assert(items.every(e=>e.source==='fictional'&&!e.moduleId&&e.title.startsWith('Example ')));
});
test('concepts are not approved applications',()=>assert(conceptModules().every(a=>a.status==='fictional-concept')));
test('favorites cannot include unauthorized or missing module ids',()=>{
 const apps=conceptModules();
 assert.deepEqual(cleanFavorites(['concept-a','bad-id','concept-a','concept-c'],apps),['concept-a','concept-c']);
 assert.deepEqual(toggleFavorite(['concept-a'],'unapproved',apps),['concept-a']);
});
test('favorite cap and ordering is preserved',()=>{
 const apps=Array.from({length:12},(_,i)=>({...conceptModules()[0],id:'concept-'+i}));
 const favorites=apps.slice(0,8).map(a=>a.id);
 assert.deepEqual(toggleFavorite(favorites,'concept-9',apps),favorites);
 assert.deepEqual(reorderFavorite(favorites,'concept-2',-1,apps).slice(0,4),['concept-0','concept-2','concept-1','concept-3']);
 assert.deepEqual(toggleFavorite(favorites,'concept-2',apps),favorites.filter(x=>x!=='concept-2'));
});
test('ordinary members never see organizational requests',()=>{
 const ordinary=demoWorkspace(initialDemo(),id(4,107));
 assert.equal(actionNotices(ordinary).length,0);
});
test('authorized staff see generic alerts without email or member name',()=>{
 const staff=demoWorkspace(initialDemo(),id(4,105));
 const notes=actionNotices(staff);
 assert(notes.some(n=>n.source==='access-request'));
 assert(!JSON.stringify(notes).includes('@example.invalid'));
 assert(!JSON.stringify(notes).includes('Isla Example'));
});

test('home greeting and now mark follow the church clock',()=>{
 assert.equal(localTime(new Date('2026-10-14T13:12:00Z')),'06:12');
 assert.equal(localTime(new Date('2026-12-01T07:30:00Z')),'23:30');
 assert.equal(greeting('06:12'),'Good morning');
 assert.equal(greeting('12:00'),'Good afternoon');
 assert.equal(greeting('17:00'),'Good evening');
 assert.equal(greeting('02:00'),'Good evening');
 const day=[{startTime:'05:00'},{startTime:'19:00'},{startTime:'20:00'}];
 assert.equal(nowIndex(day,'06:12'),1);
 assert.equal(nowIndex(day,'04:00'),0);
 assert.equal(nowIndex(day,'21:00'),3);
 assert.equal(initials('eira  example member'),'EE');
});
