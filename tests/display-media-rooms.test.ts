import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDisplaySlides,parseDisplayRooms} from '../lib/continuous-display/live-contract.ts';
import {parseDisplaySnapshotR2} from '../lib/continuous-display/operations.ts';
import {churchToday,projectRooms} from '../lib/continuous-display/rooms.ts';
const media='0123456789abcdef0123456789abcdef';
test('picture, video and rooms slides follow their own rules',()=>{
 const ok=parseDisplaySlides([
  {id:'pic-1',kind:'image',style:'editorial',title:'Flyer',media:media+'.jpg',duration:10},
  {id:'vid-1',kind:'video',style:'editorial',title:'Shake Nevada',media:media+'.mp4',fit:'cover',body:'Join us',duration:61},
  {id:'rooms-1',kind:'rooms',style:'editorial',title:'Study rooms today',duration:20}
 ]);
 assert.equal(ok.length,3);
 const bad=(slide:Record<string,unknown>,message:RegExp)=>assert.throws(()=>parseDisplaySlides([{id:'x-1',style:'editorial',title:'T',...slide}]),message);
 bad({kind:'image',duration:10},/Upload a picture/);
 bad({kind:'image',media:media+'.mp4',duration:10},/Upload a picture/);
 bad({kind:'video',media:'../../etc.mp4',duration:10},/Upload a video/);
 bad({kind:'video',media:media+'.mp4',duration:901},/5 to 900 seconds/);
 bad({kind:'rooms',duration:20,media:media+'.jpg'},/Only picture and video/);
 bad({kind:'rooms',duration:20,rows:[]},/Unknown or private/);
 bad({kind:'announcement',duration:15},/concise/);
 bad({kind:'announcement',body:'Hi',duration:61},/8 to 60 seconds/);
 bad({kind:'image',media:media+'.png',fit:'stretch',duration:10},/fills the screen/);
});
test('room feed reaches the TV as room and time only, today only',()=>{
 const feed={version:1,config:{resources:{room:{units:[{id:'room-1',name:'Room 1'},{id:'room-2',name:'Room 2'}]}}},
  bookings:[
   {date:'2026-11-14',start:'16:00',end:'17:30',room:'room-1',name:'Private Person'},
   {date:'2026-11-14',start:'11:00',end:'14:00',room:'room-2',name:'Private Person'},
   {date:'2026-11-15',start:'11:00',end:'12:00',room:'room-1',name:'Private Person'},
   {date:'2026-11-14',start:'12:00',end:'11:00',room:'room-1',name:'Backwards'},
   {date:'2026-11-14',start:'12:00',end:'13:00',room:'tv-1',name:'Not a room'}
  ]};
 const rooms=projectRooms(feed,'2026-11-14');
 assert.deepEqual(rooms,{date:'2026-11-14',bookings:[{room:'Room 2',start:'11:00',end:'14:00'},{room:'Room 1',start:'16:00',end:'17:30'}]});
 assert.ok(!JSON.stringify(rooms).includes('Private'));
 assert.throws(()=>parseDisplayRooms({date:'2026-11-14',bookings:[{room:'Room 1',start:'11:00',end:'12:00',name:'Someone'}]}),/Invalid room booking/);
 assert.equal(churchToday(Date.parse('2026-11-14T07:30:00Z')),'2026-11-13');
});
test('TV snapshot accepts room data and still rejects unknown fields',()=>{
 const now=Date.now(),base={paired:true,screen:'Lobby',version:3,serverTime:new Date(now).toISOString(),leaseUntil:new Date(now+30000).toISOString(),
  slides:[{id:'rooms-1',kind:'rooms',style:'editorial',title:'Study rooms today',duration:20}],operatingHours:[],overrideSlideId:null,overrideUntil:null,motionMode:'standard'};
 assert.equal(parseDisplaySnapshotR2(base).rooms,null);
 const withRooms=parseDisplaySnapshotR2({...base,rooms:{date:'2026-11-14',bookings:[{room:'Room 1',start:'11:00',end:'12:00'}]}});
 assert.equal(withRooms.rooms?.bookings.length,1);
 assert.throws(()=>parseDisplaySnapshotR2({...base,bookedBy:'x'}),/Unexpected private/);
});
test('Mother\'s Love: slide rules, and only the newest recognition id and time leave the feed',async()=>{
 const {latestRecognition}=await import('../lib/continuous-display/mothers-love.ts');
 const {parseDisplayMothersLove}=await import('../lib/continuous-display/live-contract.ts');
 assert.equal(parseDisplaySlides([{id:'ml-1',kind:'mothers-love',style:'editorial',title:"The Words of Mother's Love",duration:120}]).length,1);
 assert.throws(()=>parseDisplaySlides([{id:'ml-1',kind:'mothers-love',style:'editorial',title:'T',duration:10}]),/20 to 900 seconds/);
 assert.throws(()=>parseDisplaySlides([{id:'ml-1',kind:'mothers-love',style:'editorial',title:'T',duration:120,media:media+'.jpg'}]),/Only picture and video/);
 const feed={recognitions:[
  {id:'00000000-0000-4000-8000-000000000001',recipient:'Private Name',message:'Private message',status:'published',firstPublishedAt:'2026-11-13T20:00:00Z'},
  {id:'00000000-0000-4000-8000-000000000002',recipient:'Private Name',message:'Private message',status:'published',firstPublishedAt:'2026-11-13T21:00:00Z'},
  {id:'00000000-0000-4000-8000-000000000003',recipient:'Held',message:'Held',status:'held',firstPublishedAt:'2026-11-13T22:00:00Z'}]};
 const latest=latestRecognition(feed);
 assert.deepEqual(latest,{latestId:'00000000-0000-4000-8000-000000000002',latestAt:'2026-11-13T21:00:00.000Z'});
 assert.ok(!JSON.stringify(latest).includes('Private'));
 assert.deepEqual(latestRecognition({recognitions:[]}),{latestId:null,latestAt:null});
 assert.equal(parseDisplayMothersLove(null),null);
 assert.throws(()=>parseDisplayMothersLove({latestId:'x',latestAt:'2026-11-13T21:00:00Z',name:'Someone'}),/Invalid/);
});
test('take-turns groups play the next two each loop and every member comes around',async()=>{
 const {rotationView,MAX_DISPLAY_SLIDES}=await import('../lib/continuous-display/live-contract.ts');
 const s=(id:string,rotate=false)=>({id,kind:'announcement' as const,style:'editorial' as const,title:id,body:'b',duration:10,...(rotate?{rotate:true as const}:{})});
 const promos=Array.from({length:11},(_,i)=>s('promo-'+String(i+1).padStart(2,'0'),true));
 const list=[s('video'),s('ml'),...promos,s('rooms')];
 const ids=(loop:number)=>rotationView(list,loop).map(x=>x.id);
 assert.deepEqual(ids(0),['video','ml','promo-01','promo-02','rooms']);
 assert.deepEqual(ids(1),['video','ml','promo-03','promo-04','rooms']);
 assert.deepEqual(ids(5),['video','ml','promo-11','promo-01','rooms']);
 const seen=new Set<string>();for(let l=0;l<6;l++)ids(l).forEach(x=>seen.add(x));
 assert.equal(promos.every(p=>seen.has(p.id)),true);
 // A slide that does not take turns always plays; one rotating slide alone just plays.
 assert.deepEqual(rotationView([s('a'),s('b',true),s('c')],7).map(x=>x.id),['a','b','c']);
 assert.equal(MAX_DISPLAY_SLIDES,32);
 assert.equal(parseDisplaySlides(Array.from({length:32},(_,i)=>s('slide-'+i,true))).length,32);
 assert.throws(()=>parseDisplaySlides(Array.from({length:33},(_,i)=>s('slide-'+i))),/32/);
 assert.throws(()=>parseDisplaySlides([{...s('x-1'),rotate:false}]),/take-turns/);
});
