import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {WorshipError,firstSuggestion,parseCandidates,parseCommand,parseLookup,parseSongs,parseWorkspace,sqlError} from '../lib/worship-duty/api-contract.ts';
import {reviewEnabled} from '../lib/worship-duty/activation.ts';
import {createHttpTransport} from '../lib/worship-duty/client-transport.ts';
import {handleWorshipRequest} from '../lib/worship-duty/http-handler.ts';
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const assignment={op:'assign',serviceId:uuid,dutyId:'usher_1',memberId:null,expectedVersion:0};
test('R2 commands reject forged authority, ambiguous clears and malformed versions',()=>{
 assert.equal(parseCommand(assignment).op,'assign');
 for(const value of [{...assignment,actorId:uuid},{...assignment,role:'admin'},{...assignment,memberId:undefined},{...assignment,expectedVersion:-1},{...assignment,expectedVersion:'1'},{...assignment,serviceId:'other'},{...assignment,dutyId:'unknown'}])assert.throws(()=>parseCommand(value));
 assert.throws(()=>parseCommand({op:'availability',day:'2026-02-30',unavailable:true,expectedVersion:0}));
 assert.throws(()=>parseCommand({op:'resolve',requestId:uuid,decision:'replace',expectedVersion:0}));
 assert.throws(()=>parseCommand({op:'resolve',requestId:uuid,decision:'open',memberId:uuid,expectedVersion:0}));
});
test('R2 song commands enforce unique slots, positions and bounds',()=>{
 const command={op:'program',serviceId:uuid,expectedVersion:0,expectedProgramVersion:0,status:'draft',items:[{section:'glory',position:1,songId:uuid}]};
 assert.equal(parseCommand(command).op,'program');
 for(const items of [[...command.items,...command.items],[{section:'glory',position:2,songId:uuid}],[{section:'preparation',position:21,songId:uuid}],[{section:'glory',position:1,songId:uuid,owner:uuid}]])assert.throws(()=>parseCommand({...command,items}));
 assert.throws(()=>parseCommand({...command,status:'sung'}));
});
test('R2 lookup schemas and deployment gate fail closed',()=>{
 assert.deepEqual(parseLookup({kind:'songs',serviceId:uuid}),{kind:'songs',serviceId:uuid});
 assert.throws(()=>parseLookup({kind:'candidates',serviceId:uuid,dutyId:'usher_1',departmentId:uuid}));
 assert.throws(()=>parseLookup({kind:'songs',serviceId:uuid,search:'x'.repeat(81)}));
 assert.equal(reviewEnabled({}),false);assert.equal(reviewEnabled({LVZ_WORSHIP_DUTY_ENABLED:'true',VERCEL_ENV:'production'}),false);assert.equal(reviewEnabled({LVZ_WORSHIP_DUTY_ENABLED:'true',VERCEL_ENV:'preview'}),true);
});
test('R2 HTTP refuses SQL calls after failed authorization, rejected body or duplicate queries',async()=>{
 let calls=0;const authorize=async()=>({rpc:async()=>{calls++;return{data:null,error:null};}}),url='https://preview.example/api/worship-duty';
 let r=await handleWorshipRequest(new Request(url),{authorize:async()=>{throw new WorshipError('Sign in required.',401,'session');},readBody:async()=>({})});assert.equal(r.status,401);
 r=await handleWorshipRequest(new Request(url,{method:'POST'}),{authorize,readBody:async()=>{throw new Error('Origin mismatch');}});assert.equal(r.status,400);
 r=await handleWorshipRequest(new Request(url,{method:'POST'}),{authorize,readBody:async()=>({...assignment,role:'admin'})});assert.equal(r.status,400);
 r=await handleWorshipRequest(new Request(url+'?kind=songs&kind=candidates&serviceId='+uuid),{authorize,readBody:async()=>({})});assert.equal(r.status,400);assert.equal(calls,0);
 assert.match(r.headers.get('cache-control')!,/private, no-store/);assert.equal(r.headers.get('vary'),'Cookie');
});
test('R2 successful HTTP writes return only confirmation and hide raw audit data',async()=>{
 let passed:unknown;
 const r=await handleWorshipRequest(new Request('https://preview.example/api/worship-duty',{method:'POST'}),{authorize:async()=>({rpc:async(name,args)=>{assert.equal(name,'worship_command');passed=args;return{data:{privateActor:'not-for-client'},error:null};}}),readBody:async()=>assignment});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});assert.deepEqual(passed,{p_command:assignment});
});
test('R2 database error mapping is sanitized and distinguishes stale writes',()=>{assert.equal(sqlError('42501').status,403);assert.equal(sqlError('40001').status,409);assert.equal(sqlError('23514').status,422);assert.equal(sqlError('PGRST202').status,503);assert.equal(sqlError('private_member_table').message.includes('private_member_table'),false);});
test('R2 HTTP transport sends cookies, disables caching, and never retries mutations',async()=>{
 let count=0;const fetcher:typeof fetch=async(_input,init)=>{count++;assert.equal(init?.credentials,'same-origin');assert.equal(init?.cache,'no-store');assert.equal(init?.redirect,'error');assert.equal(init?.method,'POST');throw new Error('Network interrupted after commit');};
 await assert.rejects(()=>createHttpTransport(fetcher).command(parseCommand(assignment)),(e:unknown)=>(e as WorshipError).code==='connection');assert.equal(count,1);
});
test('R2 transport rejects HTML, wrong-service responses and malformed projections',async()=>{
 const html:typeof fetch=async()=>new Response('<h1>Sign in</h1>',{headers:{'content-type':'text/html'}});await assert.rejects(()=>createHttpTransport(html).workspace());
 const wrong:typeof fetch=async()=>Response.json({kind:'candidates',serviceId:'bbbbbbbb-bbbb-4bbb-8bbb-000000000001',dutyId:'usher_1',version:0,candidates:[],hasMore:false});await assert.rejects(()=>createHttpTransport(wrong).candidates(uuid,'usher_1'));
 assert.throws(()=>parseWorkspace({memberId:uuid}));assert.throws(()=>parseCandidates({kind:'candidates',serviceId:uuid,dutyId:'usher_1',version:0,candidates:[],hasMore:'false'}));assert.throws(()=>parseSongs({kind:'songs',serviceId:uuid,songs:[{id:uuid,code:'1',title:'Test',seconds:0}],hasMore:false}));
});
test('R2 suggestions skip manual-only, ineligible and excluded members',()=>{
 const c=(n:number,eligible:boolean,manualOnly:boolean)=>({id:`bbbbbbbb-bbbb-4bbb-8bbb-00000000000${n}`,name:`Member ${n}`,eligible,manualOnly,reason:'available' as const,paired:false});
 const list=[c(1,false,false),c(2,true,true),c(3,true,false),c(4,true,false)];
 assert.equal(firstSuggestion(list)?.id,list[2].id);assert.equal(firstSuggestion(list,list[2].id)?.id,list[3].id);assert.equal(firstSuggestion(list.slice(0,2)),undefined);assert.equal(firstSuggestion(undefined),undefined);
});
const member=(n:number)=>`44444444-4444-4444-8444-${String(n).padStart(12,'0')}`;
const user=(n:number)=>`99999999-9999-4999-8999-${String(n).padStart(12,'0')}`;
const session=(n:number)=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`;
const moduleId='eeeeeeee-eeee-4eee-8eee-000000000002',serviceId='dddddddd-dddd-4ddd-8ddd-000000000003';
test('R2 PostgreSQL scoped lookups and HTTP projection integration',async t=>{
 const db=new PGlite();try{
  for(const path of ['supabase/tests/bootstrap.sql','supabase/migrations/20261014020617_member_system_foundation.sql','supabase/migrations/20261014043055_member_command_hardening.sql','supabase/migrations/20261014045521_member_onboarding.sql','supabase/migrations/20261014074214_module_runtime_foundation.sql','supabase/migrations/20261024160000_worship_duty_review.sql','supabase/migrations/20261024160100_worship_duty_authenticated_queries.sql','supabase/seed/fictional_members.sql'])await db.exec(await readFile(path,'utf8'));
  await db.exec(`
   insert into auth.users(id,email,email_confirmed_at) select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'r2-'||n||'@example.invalid',now() from generate_series(101,109) n;
   insert into auth.sessions(id,user_id,created_at) select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour' from generate_series(101,109) n;
   insert into app_private.account_links(member_id,auth_user_id,username) select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'r2_'||n from generate_series(101,109) n;
   insert into app_private.app_modules(id,module_key,display_name,short_name,route_path,status,approved_at) values('${moduleId}','worship-duty','Worship R2 Test','Duties','/modules/worship-duty','approved',now()-interval '1 day');
   insert into app_private.module_access_grants(member_id,module_id,permission,granted_at,reason) select id,'${moduleId}',case when id in ('${member(102)}','${member(104)}','${member(107)}') then 'manager' else 'viewer' end,now()-interval '1 day','Fictional R2 scoped verification' from public.members;
   update app_private.worship_departments set department_id='66666666-6666-4666-8666-000000000001' where department_key='Usher Brothers';
   update app_private.worship_departments set department_id='66666666-6666-4666-8666-000000000002' where department_key='Worship';
   insert into public.department_memberships(member_id,department_id,started_at) select m.id,d.id,now()-interval '1 day' from public.members m cross join public.departments d on conflict do nothing;
   insert into app_private.worship_qualifications(member_id,duty_id) values('${member(101)}','thanks_prayer'),('${member(101)}','usher_1'),('${member(109)}','usher_1'),('${member(108)}','presider');
   insert into app_private.role_assignments(member_id,role_key,department_id,appointed_at) values('${member(107)}','department_manager','66666666-6666-4666-8666-000000000002',now()-interval '1 day');
   insert into app_private.worship_roster_preferences(member_id,department_key,manual_only) values('${member(109)}','Usher Brothers',true);
   insert into app_private.worship_services(id,worship_type,period,begins_at,ends_at,status) values('${serviceId}','Sabbath Day','Morning',now()+interval '7 days',now()+interval '7 days 2 hours','published');
   insert into app_private.worship_assignments(service_id,duty_id,member_id) values('${serviceId}','presider','${member(108)}'),('${serviceId}','thanks_prayer','${member(101)}'),('${serviceId}','usher_1',null);
   insert into app_private.worship_songs(code,title,duration_seconds) select 'TEST-'||n,'Fictional song '||n,180 from generate_series(1,502) n;
  `);
  const as=async(n:number)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user(n),JSON.stringify({sub:user(n),session_id:session(n)})]);await db.exec('set role authenticated');};
  const lookup=async(query:unknown)=>(await db.query<{result:unknown}>('select public.worship_lookup($1::jsonb) result',[JSON.stringify(query)])).rows[0].result;
  const denied=async(fn:()=>Promise<unknown>,code='42501')=>assert.rejects(fn,(e:unknown)=>(e as {code:string}).code===code);
  await t.test('ordinary and technical members cannot enumerate candidates or songs',async()=>{for(const n of [101,103,104,105]){await as(n);await denied(()=>lookup({kind:'candidates',serviceId,dutyId:'usher_1'}));await denied(()=>lookup({kind:'songs',serviceId}));}});
  await t.test('candidates are department-scoped, qualified and retain manual-only and pairing indicators',async()=>{
   await as(102);const r=parseCandidates(await lookup({kind:'candidates',serviceId,dutyId:'usher_1'}));assert.equal(r.candidates.length,2);assert.equal(r.candidates.find(c=>c.id===member(101))?.paired,true);assert.equal(r.candidates.find(c=>c.id===member(109))?.manualOnly,true);assert.equal(r.candidates.every(c=>c.eligible),true);
   await denied(()=>lookup({kind:'candidates',serviceId,dutyId:'thanks_prayer'}));await denied(()=>lookup({kind:'candidates',serviceId,dutyId:'usher_1',actor:member(107)}),'22023');
  });
  await t.test('department leadership is not song-editor authority; Presider catalog is bounded and searchable',async()=>{
   await as(107);await denied(()=>lookup({kind:'songs',serviceId}));await as(108);const all=parseSongs(await lookup({kind:'songs',serviceId}));assert.equal(all.songs.length,500);assert.equal(all.hasMore,true);const exact=parseSongs(await lookup({kind:'songs',serviceId,search:'Fictional song 502'}));assert.equal(exact.songs.length,1);assert.equal(exact.hasMore,false);
  });
  await t.test('empty cells are not self-owned and hidden identities remain masked',async()=>{
   await as(101);const raw=(await db.query<{result:unknown}>('select public.worship_workspace_v2() result')).rows[0].result,s=parseWorkspace(raw).services[0];assert.equal(s.assignments.find(a=>a.dutyId==='usher_1')?.isMine,false);assert.equal(s.assignments.find(a=>a.dutyId==='presider')?.memberId,null);assert.equal(s.assignments.find(a=>a.dutyId==='presider')?.name,'Assigned member');assert.equal(parseWorkspace(raw).programs.length,0);
  });
  await t.test('HTTP handlers consume actual SQL projections without expanding privacy scope',async()=>{
   await as(102);const deps={authorize:async()=>({rpc:async(name:string,args?:Record<string,unknown>)=>{assert.ok(['worship_workspace_v2','worship_lookup'].includes(name));const rows=name==='worship_workspace_v2'?await db.query<{result:unknown}>('select public.worship_workspace_v2() result'):await db.query<{result:unknown}>('select public.worship_lookup($1::jsonb) result',[JSON.stringify(args?.p_query)]);return{data:rows.rows[0].result,error:null};}}),readBody:async()=>({})};
   const r=await handleWorshipRequest(new Request('https://preview.example/api/worship-duty?'+new URLSearchParams({kind:'candidates',serviceId,dutyId:'usher_1'})),deps);assert.equal(r.status,200);assert.equal(parseCandidates(await r.json()).candidates.length,2);const home=await handleWorshipRequest(new Request('https://preview.example/api/worship-duty'),deps);assert.equal(home.status,200);parseWorkspace(await home.json());
  });
  await t.test('ended grants and anonymous callers lose both query boundaries',async()=>{
   await db.exec(`reset role;update app_private.module_access_grants set ended_at=now() where member_id='${member(108)}';`);await as(108);await denied(()=>lookup({kind:'songs',serviceId}));await db.exec('reset role;set role anon');await denied(()=>db.query('select public.worship_workspace_v2()'));await denied(()=>lookup({kind:'songs',serviceId}));
  });
 }finally{await db.close();}
});
