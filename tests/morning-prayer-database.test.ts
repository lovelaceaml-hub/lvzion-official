import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

// No hosted connection, credentials, provider calls or real member records.
test('Morning Prayer SQL review candidate with the actual member foundation',{timeout:120000},async t=>{
 const db=new PGlite();
 const id=(prefix:string,n:number)=>`${prefix.repeat(8)}-${prefix.repeat(4)}-4${prefix.repeat(3)}-8${prefix.repeat(3)}-${String(n).padStart(12,'0')}`;
 const member=(n:number)=>id('4',n),user=(n:number)=>id('a',n),session=(n:number)=>id('b',n);
 const series=id('c',1),moduleId=id('d',1),occ=(n:number)=>id('e',n),mat=id('f',1);
 type Result={version:number;requestIds:string[];materialId:string|null};
 const owner=()=>db.exec('reset role');
 async function scalar<T=unknown>(sql:string,params:unknown[]=[]):Promise<T>{const result=await db.query<Record<string,T>>(sql,params);return Object.values(result.rows[0])[0];}
 async function as(n:number){await owner();await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user(n),JSON.stringify({session_id:session(n)})]);await db.exec('set role authenticated');}
 async function version(){await owner();return Number(await scalar('select version from mpg_private.series where id=$1',[series]));}
 async function call(n:number,action:object,expected?:number,key=randomUUID()):Promise<Result>{const v=expected??await version();await as(n);return scalar<Result>('select public.mpg_command($1,$2,$3,$4::jsonb)',[series,v,key,JSON.stringify(action)]);}
 const deny=(fn:()=>Promise<unknown>,code='42501')=>assert.rejects(fn,(e:unknown)=>!!e&&typeof e==='object'&&'code'in e&&e.code===code);
 async function workspace(n:number){await as(n);return scalar<any>("select public.mpg_workspace($1,current_date,current_date+40)",[series]);}
 const body={title:'Fictional PWP week',summary:'Placeholder awaiting an approved source.',items:['Fictional example only'],sourceLabel:'Fictional reviewed source'};
 try{
  for(const f of ['supabase/tests/bootstrap.sql','supabase/migrations/20261014020617_member_system_foundation.sql','supabase/migrations/20261014043055_member_command_hardening.sql','supabase/migrations/20261014045521_member_onboarding.sql','supabase/migrations/20261014074214_module_runtime_foundation.sql','supabase/seed/fictional_members.sql','docs/morning-prayer/schema-review.sql'])await db.exec(await readFile(f,'utf8'));
  for(let n=101;n<=109;n++){
   await db.query('insert into auth.users(id,email,email_confirmed_at)values($1,$2,now())',[user(n),`fictional-mpg-${n}@example.invalid`]);
   await db.query('insert into auth.sessions(id,user_id)values($1,$2)',[session(n),user(n)]);
   await db.query('insert into app_private.account_links(member_id,auth_user_id,username)values($1,$2,$3)',[member(n),user(n),`mpg_fixture_${n}`]);
  }
  await db.query("insert into app_private.app_modules(id,module_key,display_name,short_name,route_path,status,approved_at)values($1,'morning-prayer-test','Fictional prayer','Prayer','/modules/morning-prayer-test','approved',now())",[moduleId]);
  for(let n=101;n<=109;n++)await db.query("insert into app_private.module_access_grants(member_id,module_id,permission,reason)values($1,$2,'manager','Fictional test grant')",[member(n),moduleId]);
  await db.query("insert into mpg_private.series(id,module_id,name,enabled,join_window_minutes)values($1,$2,'Fictional Morning Prayer',true,10)",[series,moduleId]);
  const grants:Record<number,string[]>={101:['view_schedule','volunteer_host','join_gathering','view_materials'],102:['view_schedule','review_requests'],103:['view_schedule','volunteer_host','view_materials'],104:[],105:[],106:['view_schedule','volunteer_host'],107:['view_schedule','manage_schedule'],108:['view_schedule','edit_materials','view_materials'],109:['view_schedule','publish_materials','view_materials']};
  for(const [n,caps] of Object.entries(grants)){for(const cap of caps)await db.query("insert into mpg_private.grants(series_id,member_id,capability,reason)values($1,$2,$3,'Fictional explicit capability')",[series,member(Number(n)),cap]);if(caps.includes('volunteer_host'))await db.query('insert into mpg_private.host_eligibility(series_id,member_id,enabled)values($1,$2,true)',[series,member(Number(n))]);}
  for(let n=1;n<=7;n++)await db.query("insert into mpg_private.occurrences(id,series_id,original_date,local_date,starts_at,ends_at,timezone,schedule_verified,host_id,host_confirmed,kind)values($1,$2,current_date+$3::int,current_date+$3::int,(current_date+$3::int)+time '14:00',(current_date+$3::int)+time '14:30','UTC',$4,$5,$6,$7)",[occ(n),series,n,n!==6,n===3?member(101):n===4?member(103):null,n===3||n===4,n===5?'app_day':'gathering']);
  await db.query("insert into mpg_private.materials(id,series_id,material_key,kind)values($1,$2,'pwp-week-3','pwp')",[mat,series]);
  await t.test('all fourteen named tables protected; no public definer functions',async()=>{await owner();const rows=(await db.query<{relname:string;relrowsecurity:boolean}>("select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mpg_private'and c.relkind='r'")).rows;assert.equal(rows.length,14);assert.ok(rows.every(r=>r.relrowsecurity));assert.equal(Number(await scalar("select count(*)from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname like 'mpg_%'and p.prosecdef")),0);});
  await t.test('anonymous and raw-table access denied',async()=>{await owner();await db.exec('set role anon');await deny(()=>db.query('select public.mpg_workspace($1,current_date,current_date+30)',[series]));await as(102);for(const table of ['request_notes','grants','access_references','occurrences'])await deny(()=>db.query(`select * from mpg_private.${table}`));await deny(()=>db.query("select mpg_private.allowed($1,'view_schedule',$2)",[series,member(102)]));});
  await t.test('generic module manager, technical and pastoral titles confer no MPG authority',async()=>{for(const n of [104,105])await deny(()=>workspace(n));await deny(()=>workspace(106));});
  await t.test('cross-group host names hidden; coordinator scoped access is explicit',async()=>{const w=await workspace(101);assert.equal(w.occurrences.find((o:any)=>o.id===occ(4)).host,'Assigned host');assert.equal(w.occurrences.find((o:any)=>o.id===occ(3)).host,'You');assert.equal(w.occurrences.some((o:any)=>'host_id'in o||'hostId'in o),false);assert.notEqual((await workspace(102)).occurrences.find((o:any)=>o.id===occ(4)).host,'Assigned host');});
  await t.test('multi-date request rolls back completely when one date has a host',async()=>{const v=await version();await deny(()=>call(101,{type:'volunteer',occurrenceIds:[occ(1),occ(3)]},v),'40001');assert.equal(await version(),v);assert.equal(Number(await scalar('select count(*)from mpg_private.host_requests')),0);});
  await t.test('app day and unverified occurrences cannot be volunteered',async()=>{for(const n of [5,6])await deny(()=>call(101,{type:'volunteer',occurrenceIds:[occ(n)]}),'22023');});
  const firstV=await version(),key=randomUUID(),action={type:'volunteer',occurrenceIds:[occ(1),occ(2)]};
  const request=await call(101,action,firstV,key);
  await t.test('volunteer request pending, exact retry idempotent, changed retry rejected',async()=>{assert.equal(request.requestIds.length,2);assert.deepEqual(await call(101,action,firstV,key),request);await deny(()=>call(101,{type:'volunteer',occurrenceIds:[occ(7)]},firstV,key),'22023');await owner();assert.equal(await scalar('select host_id from mpg_private.occurrences where id=$1',[occ(1)]),null);});
  await t.test('duplicate pending request refused',async()=>await deny(()=>call(101,{type:'volunteer',occurrenceIds:[occ(1)]}),'23505'));
  const rival=await call(103,{type:'volunteer',occurrenceIds:[occ(1)]});
  await t.test('cannot withdraw or approve another member request without permission',async()=>{await deny(()=>call(103,{type:'withdraw',requestId:request.requestIds[0]}));await deny(()=>call(101,{type:'review',requestId:request.requestIds[0],decision:'approve'}));});
  const reviewV=await version();
  await call(102,{type:'review',requestId:request.requestIds[0],decision:'approve'},reviewV);
  await t.test('approval assigns exactly one host and supersedes competitor; stale approval rejected',async()=>{await owner();assert.equal(await scalar('select host_id from mpg_private.occurrences where id=$1',[occ(1)]),member(101));assert.equal(await scalar('select status from mpg_private.host_requests where id=$1',[rival.requestIds[0]]),'superseded');await deny(()=>call(102,{type:'review',requestId:rival.requestIds[0],decision:'approve'},reviewV),'40001');});
  const release=await call(101,{type:'request_change',occurrenceId:occ(3),note:'PRIVATE_FICTIONAL_REASON'});
  await t.test('change request preserves host and limits private reason to owner/reviewer',async()=>{await owner();assert.equal(await scalar('select host_id from mpg_private.occurrences where id=$1',[occ(3)]),member(101));assert.match(JSON.stringify(await workspace(101)),/PRIVATE_FICTIONAL_REASON/);assert.match(JSON.stringify(await workspace(102)),/PRIVATE_FICTIONAL_REASON/);assert.doesNotMatch(JSON.stringify(await workspace(103)),/PRIVATE_FICTIONAL_REASON/);assert.doesNotMatch(JSON.stringify(await workspace(107)),/PRIVATE_FICTIONAL_REASON/);});
  await call(102,{type:'review',requestId:release.requestIds[0],decision:'approve'});
  await t.test('approved change reopens host date with retained history',async()=>{await owner();assert.equal(await scalar('select host_id from mpg_private.occurrences where id=$1',[occ(3)]),null);assert.equal(Number(await scalar('select count(*)from mpg_private.assignment_history where occurrence_id=$1',[occ(3)])),1);});
  await call(101,{type:'withdraw',requestId:request.requestIds[1]});
  await t.test('withdrawal terminal; history append-only',async()=>{await deny(()=>call(101,{type:'withdraw',requestId:request.requestIds[1]}),'40001');await owner();await deny(()=>db.query('delete from mpg_private.assignment_history'));await deny(()=>db.query('delete from mpg_private.audit_events'));});
  await t.test('schedule manager cannot review requests, reviewer cannot change schedule',async()=>{await deny(()=>call(107,{type:'review',requestId:request.requestIds[0],decision:'approve'}));await deny(()=>call(102,{type:'schedule',occurrenceId:occ(7),mode:'cancel'}));});
  await call(107,{type:'assign',occurrenceId:occ(3),memberId:member(101)});
  await t.test('manual assignment requires the assigned host to confirm',async()=>{await owner();assert.equal(await scalar('select host_confirmed from mpg_private.occurrences where id=$1',[occ(3)]),false);await deny(()=>call(103,{type:'confirm_host',occurrenceId:occ(3)}));await call(101,{type:'confirm_host',occurrenceId:occ(3)});await owner();assert.equal(await scalar('select host_confirmed from mpg_private.occurrences where id=$1',[occ(3)]),true);});
  await owner();const start=await scalar<string>("select to_char(starts_at+interval '30 minutes','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')from mpg_private.occurrences where id=$1",[occ(3)]),end=await scalar<string>("select to_char(ends_at+interval '30 minutes','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')from mpg_private.occurrences where id=$1",[occ(3)]);
  await call(107,{type:'schedule',occurrenceId:occ(3),mode:'move',startsAt:start,endsAt:end});
  await t.test('moving time preserves occurrence identity but invalidates confirmation/access',async()=>{await owner();const o=(await db.query<any>('select *from mpg_private.occurrences where id=$1',[occ(3)])).rows[0];assert.equal(o.host_id,member(101));assert.equal(o.host_confirmed,false);assert.equal(o.schedule_verified,false);assert.equal(o.access_epoch,2);await as(101);assert.equal(await scalar('select public.mpg_join_ready($1)',[occ(3)]),false);});
  await t.test('credentials and authentication cannot be supplied in command payloads',async()=>{await deny(()=>call(101,{type:'volunteer',occurrenceIds:[occ(7)],actorId:member(102)}),'22023');await deny(()=>call(107,{type:'schedule',occurrenceId:occ(7),mode:'verify',startsAt:start}),'22023');});
  const draft=await call(108,{type:'material_draft',key:'pwp-week-3',body,sourceChecked:true});
  await t.test('PWP edit and publication independent; draft never leaks into member projection',async()=>{assert.equal((await workspace(101)).materials.length,0);await deny(()=>call(108,{type:'material_publish',materialId:draft.materialId}));await deny(()=>call(109,{type:'material_draft',key:'pwp-week-3',body,sourceChecked:true}));});
  await call(109,{type:'material_publish',materialId:draft.materialId});
  const correction=await call(108,{type:'material_draft',key:'pwp-week-3',body:{...body,title:'Corrected fictional week'},sourceChecked:true});
  await t.test('PWP correction preserves prior publication until separately published',async()=>assert.equal((await workspace(101)).materials[0].revision,1));
  await call(109,{type:'material_publish',materialId:correction.materialId});
  await t.test('older material cannot overwrite newer publication; replacement provenance retained',async()=>{await deny(()=>call(109,{type:'material_publish',materialId:draft.materialId}),'40001');await owner();assert.equal(await scalar("select previous_material_version_id from mpg_private.audit_events where action='material_publish'order by version desc limit 1"),draft.materialId);});
  const incomplete=await call(108,{type:'material_draft',key:'pwp-week-3',body,sourceChecked:false});
  await t.test('incomplete and unsafe materials fail closed',async()=>{await deny(()=>call(109,{type:'material_publish',materialId:incomplete.materialId}),'22023');await deny(()=>call(108,{type:'material_draft',key:'pwp-week-3',body:{...body,summary:'person@example.invalid'},sourceChecked:true}),'22023');});
  await t.test('revoked host eligibility prevents approval',async()=>{const r=await call(103,{type:'volunteer',occurrenceIds:[occ(7)]});await owner();await db.query('update mpg_private.host_eligibility set enabled=false where member_id=$1',[member(103)]);await deny(()=>call(102,{type:'review',requestId:r.requestIds[0],decision:'approve'}));});
  await t.test('session revocation immediately denies reads and idempotent replay',async()=>{await owner();await db.query('update app_private.account_links set technical_enabled=false where member_id=$1',[member(101)]);await deny(()=>workspace(101));await deny(()=>call(101,action,firstV,key));});
  await t.test('all automatic integration remains absent',async()=>{await owner();assert.equal(Number(await scalar('select count(*)from mpg_private.source_candidates')),0);assert.equal(Number(await scalar('select count(*)from mpg_private.access_references')),0);assert.equal(Number(await scalar("select count(*)from pg_namespace where nspname='cron'")),0);});
 }finally{await db.close();}
});
