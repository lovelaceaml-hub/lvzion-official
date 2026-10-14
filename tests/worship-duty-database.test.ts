import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {allowedTogether} from '../lib/worship-duty/domain.ts';
import type {Duty} from '../lib/worship-duty/domain.ts';
// Entire suite runs inside disposable embedded PostgreSQL. No URL, password or hosted project is used.
const member=(n:number)=>`44444444-4444-4444-8444-${String(n).padStart(12,'0')}`;
const user=(n:number)=>`99999999-9999-4999-8999-${String(n).padStart(12,'0')}`;
const session=(n:number)=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`;
const moduleId='eeeeeeee-eeee-4eee-8eee-000000000001';
const first='dddddddd-dddd-4ddd-8ddd-000000000001',second='dddddddd-dddd-4ddd-8ddd-000000000002';
const song='ffffffff-ffff-4fff-8fff-000000000001';
test('worship PostgreSQL boundary, invariants and projections',async t=>{
 const db=new PGlite();
 try {
  for(const path of ['supabase/tests/bootstrap.sql','supabase/migrations/20261014020617_member_system_foundation.sql','supabase/migrations/20261014043055_member_command_hardening.sql','supabase/migrations/20261014045521_member_onboarding.sql','supabase/migrations/20261014074214_module_runtime_foundation.sql','supabase/migrations/20261014103007_worship_duty_review.sql','supabase/seed/fictional_members.sql'])await db.exec(await readFile(path,'utf8'));
  await db.exec(`
   insert into auth.users(id,email,email_confirmed_at) select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'demo-'||n||'@example.invalid',now() from generate_series(101,109) n;
   insert into auth.sessions(id,user_id,created_at) select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour' from generate_series(101,109) n;
   insert into app_private.account_links(member_id,auth_user_id,username) select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'demo_'||n from generate_series(101,109) n;
   insert into app_private.app_modules(id,module_key,display_name,short_name,route_path,status,approved_at) values('${moduleId}','worship-duty','Fictional Worship Duty','Duties','/modules/worship-duty','approved',now()-interval '1 day');
   insert into app_private.module_access_grants(member_id,module_id,permission,granted_at,reason) select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,'${moduleId}',case when n in (102,104,105,107,109) then 'manager' else 'viewer' end,now()-interval '1 day','Disposable fictional test grant' from generate_series(101,109) n;
   update app_private.worship_departments set department_id='66666666-6666-4666-8666-000000000001' where department_key='Usher Brothers';
   update app_private.worship_departments set department_id='66666666-6666-4666-8666-000000000002' where department_key='Worship';
   insert into public.department_memberships(member_id,department_id,started_at) select m.id,d.id,now()-interval '1 day' from public.members m cross join public.departments d on conflict do nothing;
   insert into app_private.worship_qualifications(member_id,duty_id) select m.id,d.id from public.members m cross join app_private.worship_duties d where m.id in ('${member(101)}','${member(102)}','${member(106)}','${member(107)}','${member(108)}','${member(109)}');
   insert into app_private.role_assignments(member_id,role_key,department_id,appointed_at) values('${member(107)}','department_manager','66666666-6666-4666-8666-000000000002',now()-interval '1 day');
   insert into app_private.worship_services(id,worship_type,period,begins_at,ends_at,status) values
    ('${first}','Sabbath Day','Morning',now()+interval '7 days',now()+interval '7 days 2 hours','published'),
    ('${second}','Third Day','Evening',now()+interval '8 days',now()+interval '8 days 2 hours','published');
   insert into app_private.worship_assignments(service_id,duty_id,member_id) values
    ('${first}','presider','${member(108)}'),('${first}','opening_prayer','${member(107)}'),('${first}','thanks_prayer','${member(101)}'),('${first}','usher_1','${member(101)}'),('${first}','closing_prayer','${member(109)}'),('${first}','lobby_security','${member(102)}'),('${second}','presider','${member(108)}');
   insert into app_private.worship_songs(id,code,title,duration_seconds) values('${song}','TEST-01','Fictional test song',180);
  `);
  const admin=()=>db.exec('reset role');
  const as=async(n:number,role='authenticated',extra:Record<string,unknown>={})=>{
   await admin();await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user(n),JSON.stringify({sub:user(n),session_id:session(n),...extra})]);
   await db.exec(`set role ${role==='anon'?'anon':'authenticated'}`);
  };
  const call=async(command:Record<string,unknown>)=>(await db.query<{result:Record<string,unknown>}>('select public.worship_command($1::jsonb) result',[JSON.stringify(command)])).rows[0].result;
  type Workspace={services:{id:string;version:number;assignments:{dutyId:string;isMine:boolean;filled:boolean;name:string;memberId:string|null;availabilityConflict:boolean|null}[]}[];programs:{serviceId:string;version:number;items:unknown[]}[];requests:{id:string;status:string;stale:boolean}[];manageDepartments:string[]};
  const home=async()=>(await db.query<{result:Workspace}>('select public.worship_workspace() result')).rows[0].result;
  const version=async(id=first)=>(await home()).services.find(s=>s.id===id)!.version;
  const deny=async(fn:()=>Promise<unknown>,code:string)=>{await assert.rejects(fn,(e:unknown)=>{assert.equal((e as {code?:string}).code,code,String(e));return true;});};
  await t.test('all 17 private tables have RLS and no API-role raw table grants',async()=>{
   const rows=(await db.query<{name:string;rls:boolean}>("select c.relname name,c.relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app_private' and c.relkind='r' and c.relname like 'worship_%'")).rows;
   assert.equal(rows.length,17);assert.equal(rows.every(r=>r.rls),true);
   await as(101);for(const row of rows)await deny(()=>db.query(`select * from app_private.${row.name} limit 1`),'42501');
   await deny(()=>db.query("select app_private.worship_allowed_together(array['usher_1'])"),'42501');
  });
  await t.test('anonymous callers cannot execute either RPC even with forged claims',async()=>{await as(101,'anon');await deny(home,'42501');await deny(()=>call({op:'assign',serviceId:first,dutyId:'usher_2',memberId:member(109),expectedVersion:0}),'42501');});
  await t.test('database and TypeScript agree on all 729 ordered pairs and reject every triple',async()=>{
   await admin();const pairs=(await db.query<{a:Duty;b:Duty;ok:boolean}>('select a.id a,b.id b,app_private.worship_allowed_together(array[a.id,b.id]) ok from app_private.worship_duties a cross join app_private.worship_duties b')).rows;
   assert.equal(pairs.length,729);for(const p of pairs)assert.equal(p.ok,allowedTogether([p.a,p.b]),`${p.a}/${p.b}`);
   const triples=(await db.query<{n:string}>('select count(*) n from app_private.worship_duties a cross join app_private.worship_duties b cross join app_private.worship_duties c where app_private.worship_allowed_together(array[a.id,b.id,c.id])')).rows;assert.equal(Number(triples[0].n),0);
  });
  await t.test('member projection hides other-group identities and all foreign availability',async()=>{
   await as(101);const projection=await home(),s=projection.services.find(s=>s.id===first)!;
   const p=s.assignments.find(a=>a.dutyId==='presider')!;assert.equal(p.name,'Assigned member');assert.equal(p.memberId,null);assert.equal(p.availabilityConflict,null);assert.equal(projection.programs.length,0);assert.equal(projection.manageDepartments.length,0);
   assert.equal(JSON.stringify(projection).includes('Hugo Example'),false);
  });
  await t.test('unit, group, pastoral, technical, or module-manager-only access grants no duty authority',async()=>{
   for(const n of [101,103,104,105,109]){await as(n,'authenticated',{user_metadata:{admin:true,department_manager:true}});await deny(()=>call({op:'assign',serviceId:first,dutyId:'usher_2',memberId:member(109),expectedVersion:0}),'42501');}
  });
  await t.test('a department leader cannot write another department',async()=>{await as(102);assert.deepEqual((await home()).manageDepartments,['Usher Brothers']);await deny(()=>call({op:'assign',serviceId:first,dutyId:'thanks_prayer',memberId:member(109),expectedVersion:0}),'42501');});
  await t.test('a compatible usher/prayer pair persists and emits only generic in-app notices',async()=>{
   await as(102);const result=await call({op:'assign',serviceId:first,dutyId:'usher_2',memberId:member(109),expectedVersion:0});assert.equal(result.version,1);
   await admin();assert.equal((await db.query<{n:string}>(`select count(*) n from app_private.worship_assignments where service_id='${first}' and member_id='${member(109)}'`)).rows[0].n,2);
   const notices=(await db.query<{n:string}>('select count(*) n from app_private.module_notices')).rows;assert.equal(Number(notices[0].n),1);
  });
  await t.test('third duties, Opening Prayer pairs, inactive/unqualified members and inapplicable duties fail',async()=>{
   await as(102);for(const target of [101,107,106,103])await deny(()=>call({op:'assign',serviceId:first,dutyId:'usher_2',memberId:member(target),expectedVersion:1}),'23514');
   await as(107);await deny(()=>call({op:'assign',serviceId:second,dutyId:'thanks_prayer',memberId:member(101),expectedVersion:0}),'23514');
  });
  await t.test('compare-and-swap rejects stale saves and missing explicit clear values',async()=>{await as(102);await deny(()=>call({op:'assign',serviceId:first,dutyId:'usher_2',memberId:null,expectedVersion:0}),'40001');await deny(()=>call({op:'assign',serviceId:first,dutyId:'usher_2',expectedVersion:1}),'22023');});
  await t.test('self availability is versioned, flags duties and does not release assignments',async()=>{
   await admin();const day=(await db.query<{day:string}>(`select to_char(begins_at at time zone 'America/Los_Angeles','YYYY-MM-DD') day from app_private.worship_services where id='${first}'`)).rows[0].day;
   await as(109);await call({op:'availability',day,unavailable:true,expectedVersion:0});const s=(await home()).services.find(s=>s.id===first)!;assert.equal(s.assignments.filter(a=>a.isMine).length,2);assert.equal(s.assignments.filter(a=>a.isMine).every(a=>a.availabilityConflict),true);
   await deny(()=>call({op:'availability',day,unavailable:false,expectedVersion:0}),'40001');
   await as(102);await deny(()=>call({op:'assign',serviceId:first,dutyId:'usher_2',memberId:member(109),expectedVersion:1}),'23514');
   await as(109);await call({op:'availability',day,unavailable:false,expectedVersion:1});
  });
  let firstRequest='';
  await t.test('self requests persist without releasing the duty and reject duplicates or forged ownership',async()=>{
   await as(101);firstRequest=(await call({op:'request',serviceId:first,dutyId:'usher_1',expectedVersion:1})).requestId as string;
   assert.equal((await home()).services.find(s=>s.id===first)!.assignments.find(a=>a.dutyId==='usher_1')!.isMine,true);
   await deny(()=>call({op:'request',serviceId:first,dutyId:'usher_1',expectedVersion:1}),'23505');
   await deny(()=>call({op:'request',serviceId:first,dutyId:'presider',expectedVersion:1}),'42501');
  });
  await t.test('request approval is department-scoped and leaving open preserves the other paired duty',async()=>{
   await as(107);await deny(()=>call({op:'resolve',requestId:firstRequest,decision:'open',expectedVersion:1}),'42501');
   await as(102);await call({op:'resolve',requestId:firstRequest,decision:'open',expectedVersion:1});
   await as(101);const s=(await home()).services.find(s=>s.id===first)!;assert.equal(s.assignments.find(a=>a.dutyId==='usher_1')!.filled,false);assert.equal(s.assignments.find(a=>a.dutyId==='thanks_prayer')!.isMine,true);
  });
  await t.test('request cell versions prevent an ABA reassignment from being approved as current',async()=>{
   await as(101);const requestId=(await call({op:'request',serviceId:first,dutyId:'thanks_prayer',expectedVersion:2})).requestId;
   await as(107);await call({op:'assign',serviceId:first,dutyId:'thanks_prayer',memberId:member(101),expectedVersion:2});
   await deny(()=>call({op:'resolve',requestId,decision:'open',expectedVersion:3}),'40001');
   await call({op:'resolve',requestId,decision:'close',expectedVersion:3});
   assert.equal((await home()).services.find(s=>s.id===first)!.assignments.find(a=>a.dutyId==='thanks_prayer')!.filled,true);
  });
  await t.test('only the requester can withdraw a pending request',async()=>{
   await as(101);const requestId=(await call({op:'request',serviceId:first,dutyId:'thanks_prayer',expectedVersion:3})).requestId;
   await as(109);await deny(()=>call({op:'withdraw',requestId}),'42501');
   await as(101);assert.equal((await call({op:'withdraw',requestId})).status,'withdrawn');
  });
  await t.test('assigned presider can save a service plan without acquiring scheduling authority',async()=>{
   await as(108);const result=await call({op:'program',serviceId:first,expectedVersion:3,expectedProgramVersion:0,status:'confirmed',items:[{section:'glory',position:1,songId:song},{section:'choir',position:1,songId:song}]});assert.equal(result.version,1);
   await deny(()=>call({op:'assign',serviceId:first,dutyId:'opening_prayer',memberId:member(108),expectedVersion:3}),'42501');
   await as(104);await deny(()=>call({op:'program',serviceId:first,expectedVersion:3,expectedProgramVersion:1,status:'draft',items:[]}),'42501');
  });
  await t.test('invalid/duplicate song items roll back the whole program rather than partially clear it',async()=>{
   await as(108);await deny(()=>call({op:'program',serviceId:first,expectedVersion:3,expectedProgramVersion:1,status:'draft',items:[{section:'glory',position:1,songId:song},{section:'glory',position:1,songId:song}]}),'23505');
   assert.equal((await home()).programs.find(p=>p.serviceId===first)!.items.length,2);
   await deny(()=>call({op:'program',serviceId:second,expectedVersion:0,expectedProgramVersion:0,status:'draft',items:[{section:'thanks',position:1,songId:song}]}),'23514');
  });
  await t.test('choir can be explicitly blank and another service never inherits its value',async()=>{
   await as(108);await call({op:'program',serviceId:second,expectedVersion:0,expectedProgramVersion:0,status:'draft',items:[]});
   await call({op:'program',serviceId:first,expectedVersion:3,expectedProgramVersion:1,status:'draft',items:[{section:'glory',position:1,songId:song}]});
   const p=(await home()).programs;assert.equal(p.find(p=>p.serviceId===second)!.items.length,0);assert.equal(p.find(p=>p.serviceId===first)!.items.length,1);
  });
  await t.test('started services and sung history are not editable through ordinary commands',async()=>{
   await admin();await db.exec(`update app_private.worship_services set begins_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' where id='${second}';update app_private.worship_programs set status='sung' where service_id='${first}';`);
   await as(108);await deny(()=>call({op:'program',serviceId:second,expectedVersion:0,expectedProgramVersion:1,status:'draft',items:[]}),'23514');await deny(()=>call({op:'program',serviceId:first,expectedVersion:3,expectedProgramVersion:2,status:'draft',items:[]}),'23514');
  });
  await t.test('revoking a department appointment immediately removes write authority',async()=>{
   await admin();await db.exec(`update app_private.role_assignments set ended_at=now() where member_id='${member(102)}' and role_key='department_manager' and ended_at is null`);
   await as(102);await deny(()=>call({op:'assign',serviceId:first,dutyId:'usher_2',memberId:null,expectedVersion:3}),'42501');
  });
  await t.test('revoked sessions, inactive members and withdrawn module grants fail closed',async()=>{
   await admin();await db.exec(`update app_private.account_links set session_valid_after=now() where member_id='${member(107)}';update app_private.module_access_grants set ended_at=now() where member_id='${member(109)}';`);
   await as(107);await deny(home,'42501');await as(106);await deny(home,'42501');await as(109);await deny(home,'42501');
  });
  await t.test('browser-supplied authority fields are rejected and audit is private',async()=>{
   await as(101);await deny(()=>call({op:'request',serviceId:first,dutyId:'thanks_prayer',expectedVersion:3,actorId:member(107),role:'department_manager'}),'22023');await deny(()=>db.query('select * from app_private.worship_audit'),'42501');
   await admin();const n=Number((await db.query<{n:string}>('select count(*) n from app_private.worship_audit')).rows[0].n);assert.ok(n>=10);assert.equal((await db.query('select * from app_private.worship_approved_pairs')).rows.length,0);
  });
 }finally{await db.close();}
});
