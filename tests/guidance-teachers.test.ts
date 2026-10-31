import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,dateValue,today,formatTime,isFuture,parseCommand,parseWorkspace,parseCandidates,GuidanceError} from '../lib/guidance-teachers/domain.ts';
import {handleGuidanceRequest,type Dependencies} from '../lib/guidance-teachers/http-handler.ts';
const id='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const create={op:'create',requestId:id,title:'Morning Worship',date:'2027-03-15',startTime:'10:00',endTime:'11:00'};
const slots=[{location:'main',position:1,memberId:id,name:'Teacher Example'},{location:'main',position:2,memberId:null,name:null},{location:'small',position:1,memberId:null,name:null},{location:'small',position:2,memberId:null,name:null}];
const workspace={date:'2027-03-15',viewerId:id,canView:true,canManage:false,services:[{id:other,title:'Morning Worship',date:'2027-03-15',startTime:'10:00',endTime:'11:00',version:1,slots}]};
function deps(data:unknown=workspace,error:{code?:string}|null=null):Dependencies{return {authorize:async()=>({rpc:async()=>({data,error})}),readBody:async r=>await r.json()};}
test('Las Vegas date, month rollover and leap day',()=>{
 assert.equal(today(new Date('2026-11-01T06:30:00Z')),'2026-10-31');assert.equal(addDays('2028-02-28',1),'2028-02-29');assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.equal(formatTime('14:30'),'2:30 PM');
 assert.throws(()=>dateValue('2027-02-29'));assert.throws(()=>dateValue('2027-02-31'));assert.throws(()=>dateValue('bad'));
});
test('daylight-saving transitions use Las Vegas wall clock',()=>{
 assert.equal(isFuture({date:'2026-11-01',startTime:'10:00'},new Date('2026-11-01T17:30:00Z')),true);
 assert.equal(isFuture({date:'2026-11-01',startTime:'10:00'},new Date('2026-11-01T18:00:00Z')),false);
 assert.equal(today(new Date('2027-03-14T07:59:00Z')),'2027-03-13');assert.equal(today(new Date('2027-03-14T08:00:00Z')),'2027-03-14');
});
test('command whitelist and valid times',()=>{
 assert.equal(parseCommand({...create,title:' Morning Worship '}).op,'create');
 for(const bad of [{...create,actorId:id},{...create,endTime:'09:00'},{...create,startTime:'25:00'},{...create,title:'x'},{...create,date:'2027-02-31'},{...create,requestId:'fake'}])assert.throws(()=>parseCommand(bad));
 assert.throws(()=>parseCommand({op:'assign',requestId:id,serviceId:other,expectedVersion:0,location:'main',position:3,memberId:id}));
 assert.throws(()=>parseCommand({op:'assign',requestId:id,serviceId:other,expectedVersion:-1,location:'main',position:1,memberId:id}));
 assert.equal(parseCommand({op:'assign',requestId:id,serviceId:other,expectedVersion:1,location:'small',position:2,memberId:null}).op,'assign');
});
test('workspace requires exactly two slots per sanctuary',()=>{
 assert.equal(parseWorkspace(workspace).services[0].slots.length,4);
 for(const changed of [slots.slice(1),[slots[0],slots[0],slots[2],slots[3]],[slots[0],{...slots[1],memberId:id,name:'Teacher Example'},slots[2],slots[3]]])assert.throws(()=>parseWorkspace({...workspace,services:[{...workspace.services[0],slots:changed}]}));
 assert.throws(()=>parseWorkspace({...workspace,canView:false}));assert.throws(()=>parseWorkspace({...workspace,date:'2027-03-16'}));
});
test('candidate contract bounds member list and availability',()=>{
 assert.equal(parseCandidates({serviceId:other,hasMore:false,members:[{id,name:'Teacher Example',unavailable:true}]}).members[0].unavailable,true);
 assert.throws(()=>parseCandidates({serviceId:other,hasMore:false,members:Array(51).fill({id,name:'Example',unavailable:false})}));
});
test('read response is private and never cacheable',async()=>{
 const r=await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers?date=2027-03-15'),deps());
 assert.equal(r.status,200);assert.match(r.headers.get('cache-control')??'',/private, no-store/);assert.equal(r.headers.get('vary'),'Cookie');
});
test('unauthenticated and unauthorized access are denied',async()=>{
 const a=deps();a.authorize=async()=>{throw new GuidanceError('Sign in.',401,'session');};
 assert.equal((await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers?date=2027-03-15'),a)).status,401);
 assert.equal((await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers?date=2027-03-15'),deps(null,{code:'42501'}))).status,403);
});
test('unexpected query and body fields cannot reach RPC',async()=>{
 const d=deps();d.authorize=async()=>({rpc:async()=>{throw Error('RPC should not run');}});
 for(const query of ['date=2027-03-15&date=2027-03-15','date=2027-03-15&actor='+id,'','kind=candidates&serviceId='+id+'&actor='+id])assert.equal((await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers?'+query),d)).status,400);
 assert.equal((await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers',{method:'POST',body:JSON.stringify({...create,actor:id})}),d)).status,400);
});
test('origin failure prevents a write',async()=>{
 const d=deps();d.readBody=async()=>{throw Error('Origin rejected');};
 assert.equal((await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers',{method:'POST',body:JSON.stringify(create)}),d)).status,400);
});
test('stale and duplicate assignments report conflict rather than success',async()=>{
 for(const code of ['40001','23505','23514'])assert.equal((await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers',{method:'POST',body:JSON.stringify(create)}),deps(null,{code}))).status,409);
});
test('write success verifies receipt and does not echo private data',async()=>{
 const r=await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers',{method:'POST',body:JSON.stringify(create)}),deps({ok:true,serviceId:other,internal:'must not leak'}));
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,serviceId:other});
});
test('malformed or mismatched results fail closed',async()=>{
 assert.equal((await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers?date=2027-03-16'),deps())).status,503);
 assert.equal((await handleGuidanceRequest(new Request('https://lvz.app/api/guidance-teachers?kind=candidates&serviceId='+other),deps({serviceId:id,members:[],hasMore:false}))).status,503);
});
