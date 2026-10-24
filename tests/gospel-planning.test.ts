import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {addDays,commandFailure,ContractError,mondayOf,nextAction,parseCommand,rangeDates,sessionStatus,vegasDay,weekKey,
 type Participant,type Session} from '../lib/gospel-planning/contract.ts';
import {moduleStyleFor} from '../lib/module-styles.ts';

const id=(n:number)=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
const rid='51000000-0000-4000-8000-000000000001';
const cmd=(action:string,payload:Record<string,unknown>)=>parseCommand({action,requestId:rid,payload});
const range={date:'2026-10-28',from:'15:00',to:'17:00',repeatWeeks:4,skip:['2026-11-11']};

test('commands accept only their own fields; actor, role and scope fields are rejected',()=>{
 assert.deepEqual(cmd('availability.save',{expected:0,ranges:[range]}).payload,{expected:0,ranges:[range]});
 for(const extra of [{memberId:id(1)},{actorId:id(1)},{groupId:id(2)},{role:'group_leader'}])
  assert.throws(()=>cmd('availability.save',{expected:0,ranges:[],...extra}),ContractError);
 assert.throws(()=>parseCommand({action:'availability.save',requestId:rid,payload:{expected:0,ranges:[]},memberId:id(1)}),ContractError);
 assert.throws(()=>parseCommand({action:'session.delete',requestId:rid,payload:{}}),ContractError);
 assert.throws(()=>parseCommand({action:'availability.save',requestId:'not-a-uuid',payload:{expected:0,ranges:[]}}),ContractError);
 // A group-scoped action may name a group the member leads; the database checks the appointment.
 assert.equal(cmd('plan.save',{week:'2026-10-26',expected:0,review:'x',plan:'x',nextAction:'',groupId:id(2)}).payload.groupId,id(2));
 assert.throws(()=>cmd('plan.save',{week:'2026-10-26',expected:0,review:'x',plan:'x',nextAction:'',groupId:'not-a-uuid'}),ContractError);
 assert.throws(()=>cmd('session.respond',{id:id(3),expected:1,expectedResponse:0,response:'accepted',groupId:id(2)}),ContractError);
});

test('availability ranges stay small, ordered and bounded',()=>{
 assert.deepEqual(rangeDates(range),['2026-10-28','2026-11-04','2026-11-18']);
 assert.throws(()=>cmd('availability.save',{expected:0,ranges:[{...range,to:'14:00'}]}),/end must be after/);
 assert.throws(()=>cmd('availability.save',{expected:0,ranges:[{...range,from:'15:07'}]}),/five-minute/);
 assert.throws(()=>cmd('availability.save',{expected:0,ranges:[{...range,repeatWeeks:5}]}),/one to four/);
 assert.throws(()=>cmd('availability.save',{expected:0,ranges:[{...range,skip:['2026-11-12']}]}),/repeating weeks/);
 assert.throws(()=>cmd('availability.save',{expected:0,ranges:[{...range,repeatWeeks:1,skip:['2026-10-28']}]}),/at least one week/);
 assert.throws(()=>cmd('availability.save',{expected:0,ranges:Array(15).fill(range)}),/at most 14/);
 assert.throws(()=>cmd('availability.save',{expected:-1,ranges:[]}),ContractError);
});

test('sessions need two or three distinct partners, a place and valid times',()=>{
 const base={date:'2026-10-28',from:'10:00',to:'11:00',locationId:id(900),participants:[id(1),id(2)]};
 assert.deepEqual(cmd('session.create',base).payload,base);
 assert.throws(()=>cmd('session.create',{...base,participants:[id(1)]}),/one or two partners/);
 assert.throws(()=>cmd('session.create',{...base,participants:[id(1),id(2),id(3),id(4)]}),/one or two partners/);
 assert.throws(()=>cmd('session.create',{...base,participants:[id(1),id(1)]}),/each partner once/);
 assert.throws(()=>cmd('session.create',{...base,date:'2026-02-30'}),/valid date/);
 assert.throws(()=>cmd('session.revise',{...base,id:id(5)}),ContractError);
 assert.equal(cmd('session.respond',{id:id(5),expected:2,expectedResponse:0,response:'accepted'}).payload.response,'accepted');
 assert.throws(()=>cmd('session.respond',{id:id(5),expected:2,expectedResponse:0,response:'maybe'}),ContractError);
});

test('one shared result: a correction needs a reason',()=>{
 assert.deepEqual(cmd('report.save',{id:id(5),expected:1,expectedReport:0,outcome:'completed',note:' Fictional '}).payload,{id:id(5),expected:1,expectedReport:0,outcome:'completed',note:'Fictional'});
 assert.throws(()=>cmd('report.save',{id:id(5),expected:1,expectedReport:1,outcome:'completed',note:''}),ContractError);
 assert.equal(cmd('report.save',{id:id(5),expected:1,expectedReport:1,outcome:'not-held',note:'',reason:'Fictional correction'}).payload.reason,'Fictional correction');
 assert.throws(()=>cmd('report.save',{id:id(5),expected:1,expectedReport:0,outcome:'attended',note:''}),ContractError);
});

test('group plan, updates, requests and setup commands are strict',()=>{
 assert.throws(()=>cmd('plan.save',{week:'2026-10-27',expected:0,review:'x',plan:'',nextAction:''}),/starts on Monday/);
 assert.throws(()=>cmd('plan.save',{week:'2026-10-26',expected:0,review:' ',plan:'',nextAction:''}),/Gospel Review or a Gospel Plan/);
 assert.equal(cmd('plan.save',{week:'2026-10-26',expected:0,review:'',plan:'Plan',nextAction:''}).payload.responsibleId,null);
 assert.throws(()=>cmd('update.create',{week:'2026-10-26',unitId:id(3),body:'',support:'',nextAction:''}),/required text/);
 assert.throws(()=>cmd('update.edit',{id:id(3),expected:1,body:'x',support:'',nextAction:'',status:'archived'}),ContractError);
 assert.throws(()=>cmd('request.respond',{id:id(3),expected:1,decision:'approve',body:'x'}),ContractError);
 assert.throws(()=>cmd('request.create',{week:'2026-10-26',reviewerId:id(3),body:'x'.repeat(1201)}),/1200/);
 assert.deepEqual(cmd('capability.grant',{memberId:id(1),capability:'oversee',groupId:id(2)}).payload,{memberId:id(1),capability:'oversee',groupId:id(2)});
 assert.throws(()=>cmd('capability.grant',{memberId:id(1),capability:'oversee'}),ContractError);
 assert.throws(()=>cmd('capability.grant',{memberId:id(1),capability:'publish',unitId:id(3)}),ContractError);
 assert.equal(cmd('capability.grant',{memberId:id(1),capability:'publish',groupId:id(2)}).payload.groupId,id(2));
 assert.equal(cmd('capability.grant',{memberId:id(1),capability:'schedule',unitId:id(3)}).payload.unitId,id(3));
 assert.throws(()=>cmd('capability.grant',{memberId:id(1),capability:'admin'}),ContractError);
 assert.throws(()=>cmd('location.add',{label:'x'}),/two characters/);
});

test('database errors become generic replies without details',()=>{
 assert.deepEqual(commandFailure({message:'GP_DENIED',code:'42501'}),{status:403,code:'GP_DENIED',error:'This action is not available to you right now. Your access or role may have changed.'});
 assert.equal(commandFailure({message:'permission denied for schema gp_private',code:'42501'}).status,403);
 assert.equal(commandFailure({message:'GP_STALE_REPORT',code:'40001'}).status,409);
 assert.equal(commandFailure({message:'GP_OVERLAP',code:'23P01'}).status,409);
 const unknown=commandFailure({message:'relation "gp_private.sessions" does not exist',code:'42P01'});
 assert.equal(unknown.status,503);assert.doesNotMatch(unknown.error,/gp_private|relation/);
 assert.equal(commandFailure(null).status,503);
});

const person=(p:Partial<Participant>):Participant=>({id:id(1),name:'Fictional Partner',self:false,response:'pending',responseVersion:0,reconfirm:false,covered:null,...p});
const session=(p:Partial<Session>):Session=>({id:id(9),version:1,start:'2026-10-28T17:00:00Z',end:'2026-10-28T18:00:00Z',phase:'published',
 location:{id:id(900),label:'Fictional Library Lobby',active:true},mine:true,canManage:false,canEdit:false,createdBySelf:false,
 participants:[person({self:true,id:id(2),name:'You'}),person({})],report:null,...p});
const before=Date.parse('2026-10-27T12:00:00Z'),after=Date.parse('2026-10-28T19:00:00Z');

test('session status keeps proposed, published, confirmed and completed apart',()=>{
 assert.equal(sessionStatus(session({phase:'proposal'}),before).label,'Proposed');
 assert.equal(nextAction(session({phase:'proposal'}),before),null);
 assert.equal(sessionStatus(session({}),before).label,'Awaiting you');
 assert.equal(nextAction(session({}),before),'respond');
 const waiting=session({participants:[person({self:true,response:'accepted'}),person({})]});
 assert.equal(sessionStatus(waiting,before).label,'Awaiting partner');
 assert.match(sessionStatus(waiting,before).detail,/Fictional Partner/);
 const confirmed=session({participants:[person({self:true,response:'accepted'}),person({response:'accepted'})]});
 assert.equal(sessionStatus(confirmed,before).label,'Confirmed');
 assert.equal(sessionStatus(session({participants:[person({self:true,response:'accepted'}),person({response:'declined'})]}),before).label,'Declined');
 assert.equal(sessionStatus(session({participants:[person({self:true,reconfirm:true}),person({reconfirm:true})]}),before).label,'Please reconfirm');
 assert.match(sessionStatus(session({phase:'proposal',participants:[person({self:true,reconfirm:true}),person({})]}),before).detail,/confirms again/);
 assert.equal(sessionStatus(confirmed,after).label,'Result needed');
 assert.equal(nextAction(confirmed,after),'report');
 assert.equal(sessionStatus(session({phase:'cancelled'}),before).label,'Cancelled');
 const report={version:1,outcome:'completed' as const,note:'',recordedAt:'2026-10-28T19:00:00Z',author:'Fictional Partner',authorSelf:false,corrected:false};
 assert.equal(sessionStatus({...confirmed,report},after).label,'Result recorded');
 assert.equal(nextAction({...confirmed,report},after),null);
});

test('a missing answer never becomes a cancellation or a result',()=>{
 const silent=session({participants:[person({self:true,response:'accepted'}),person({})]});
 const status=sessionStatus(silent,after);
 assert.equal(status.label,'Ended without full confirmation');
 assert.match(status.detail,/Nothing is assumed/);
 assert.equal(nextAction(silent,after),null);
 assert.notEqual(status.label,'Cancelled');
});

test('Las Vegas weeks and dates cross month, year and clock changes',()=>{
 assert.equal(mondayOf('2026-10-24'),'2026-10-19');
 assert.equal(mondayOf('2026-11-01'),'2026-10-26');
 assert.equal(mondayOf('2027-01-01'),'2026-12-28');
 assert.equal(addDays('2026-11-01',1),'2026-11-02');
 assert.equal(addDays('2027-03-14',-7),'2027-03-07');
 assert.equal(weekKey('2026-10-26'),'2026-10-26');
 assert.throws(()=>weekKey('2026-10-25'),ContractError);
 assert.equal(vegasDay(new Date('2026-10-25T06:30:00Z')),'2026-10-24');
 assert.equal(vegasDay(new Date('2026-10-25T07:30:00Z')),'2026-10-25');
 assert.equal(vegasDay(new Date('2026-11-01T08:30:00Z')),'2026-11-01');
});

test('module wears its registered Liquid Opal palette and module CSS uses tokens only',async()=>{
 assert.equal(moduleStyleFor('/modules/gospel-planning')?.key,'gospel-planning');
 assert.equal(moduleStyleFor('/modules/gospel-planning')?.atlas,'Liquid Opal, sky');
 const css=await readFile('components/gospel-planning/gospel-planning.css','utf8');
 assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b/i,'module CSS uses tokens, not raw colors');
 assert.doesNotMatch(css,/border-radius:\s*\d+px/,'module CSS uses radius tokens');
});

test('API routes enforce sign-in, same-origin JSON and the strict parser',async()=>{
 const command=await readFile('app/api/gospel-planning/command/route.ts','utf8');
 assert.match(command,/memberClient\(\)/);assert.match(command,/parseCommand\(await body\(request\)\)/);
 assert.doesNotMatch(command,/service|authAdminClient/i);
 const read=await readFile('app/api/gospel-planning/route.ts','utf8');
 assert.match(read,/memberClient\(\)/);assert.match(read,/weekKey/);
 const page=await readFile('app/modules/gospel-planning/page.tsx','utf8');
 assert.match(page,/FrameControls/);assert.doesNotMatch(page,/localStorage\.setItem/);
 for(const file of ['components/gospel-planning/preaching.tsx','components/gospel-planning/group.tsx'])
  assert.doesNotMatch(await readFile(file,'utf8'),/href=\{?["'`][^"'`]*\?/,'Contacts links carry no session or contact data');
});
