import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const id=(n:number)=>`00000000-0000-4000-9000-${String(n).padStart(12,'0')}`;
test('Contacts R2 normalized database runtime: isolated proposed-policy exercise, never hosted',async()=>{
 const db=new PGlite();let checks=0,seq=5000;
 const ok=(v:unknown)=>{assert.ok(v);checks++;};
 const denied=async(f:()=>Promise<unknown>,code:string)=>{await assert.rejects(f,(e:unknown)=>(e as {code?:string}).code===code);checks++;};
 const actor=async(n:number)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id(n+100),JSON.stringify({sub:id(n+100),session_id:id(n+200)})]);await db.exec('set role authenticated');};
 const read=async(n:number,c=1000)=>{await actor(n);try{return (await db.query<{v:{version:number;name:string;methods:unknown[];interactions:{text:string;visibility:string}[];follow_ups:{id:string;state:string;reason:string}[];lifecycle:string;do_not_contact:boolean;archived:boolean}}>('select contacts_private.review_read($1) as v',[id(c)])).rows[0].v;}finally{await db.exec('reset role');}};
 const call=async(n:number,c:number,v:number,op:string,data:Record<string,unknown>={},request=++seq)=>{await actor(n);try{return (await db.query<{v:{id:string;version:number}}>('select contacts_private.review_command($1,$2,$3,$4,$5::jsonb) as v',[id(c),v,id(request),op,JSON.stringify(data)])).rows[0].v;}finally{await db.exec('reset role');}};
 const agenda=async(n:number)=>{await actor(n);try{return (await db.query<{v:unknown[]}>('select contacts_private.review_agenda() as v')).rows[0].v;}finally{await db.exec('reset role');}};
 try{
  for(const path of ['supabase/tests/bootstrap.sql','supabase/migrations/20261014020617_member_system_foundation.sql','supabase/migrations/20261014043055_member_command_hardening.sql','supabase/migrations/20261014045521_member_onboarding.sql','supabase/migrations/20261014074214_module_runtime_foundation.sql','docs/contacts/schema-review.sql','docs/contacts/runtime-review.sql'])await db.exec(await readFile(path,'utf8'));
  // Fixture creation is confined to this disposable process, not Supabase Auth provisioning.
  await db.exec(`insert into public.age_categories(id,name) values('${id(1)}','Test adults');insert into public.church_groups(id,age_category_id,name) values('${id(2)}','${id(1)}','Test group A'),('${id(3)}','${id(1)}','Test group B');insert into public.church_units(id,group_id,name) values('${id(4)}','${id(2)}','Test unit A'),('${id(5)}','${id(3)}','Test unit B');`);
  for(const n of [10,11,12,13,14,15])await db.exec(`insert into public.members(id,display_name,status) values('${id(n)}','Synthetic member ${n}','active');insert into public.member_placements(id,member_id,group_id,unit_id) values('${id(n+300)}','${id(n)}','${id(n===15?3:2)}','${id(n===15?5:4)}');insert into auth.users(id,email,email_confirmed_at) values('${id(n+100)}','synthetic${n}@example.invalid',now());insert into auth.sessions(id,user_id) values('${id(n+200)}','${id(n+100)}');insert into app_private.account_links(member_id,auth_user_id,username) values('${id(n)}','${id(n+100)}','synthetic_${n}');`);
  await db.exec(`insert into app_private.app_modules(id,module_key,display_name,short_name,route_path,status,approved_at) values('${id(500)}','contacts','Contacts','Contacts','/modules/contacts','approved',now());`);
  for(const n of [10,11,13,14,15])await db.exec(`insert into app_private.module_access_grants(member_id,module_id,reason) values('${id(n)}','${id(500)}','Isolated test grant');`);
  for(const [n,cap] of [[10,'create'],[15,'create'],[13,'aggregate_oversight'],[14,'handoff_steward']] as const)await db.exec(`insert into contacts_private.capabilities(member_id,placement_id,capability,group_id,approved_by) values('${id(n)}','${id(n+300)}','${cap}','${id(n===15?3:2)}','${id(10)}');`);
  await db.exec(`insert into app_private.role_assignments(member_id,role_key,group_id) values('${id(13)}','group_leader','${id(2)}');insert into app_private.role_assignments(member_id,role_key) values('${id(12)}','technical_admin');`);
  await denied(()=>call(10,1000,0,'create',{name:'Synthetic Avery'}),'42501');
  // Even adding entry-point grants cannot open the shipped literal-false runtime gate.
  await db.exec('grant usage on schema contacts_private to authenticated;grant execute on function contacts_private.review_command(uuid,bigint,uuid,text,jsonb),contacts_private.review_read(uuid),contacts_private.review_agenda(),contacts_private.review_duplicates(uuid) to authenticated');
  await denied(()=>call(10,1000,0,'create',{name:'Synthetic Avery'}),'42501');
  // TEST ONLY: never part of a migration or a hosted deployment.
  await db.exec("create or replace function contacts_private.review_is_approved() returns boolean language sql immutable security invoker set search_path='' as $$select true$$");
  let v=(await call(10,1000,0,'create',{name:'Synthetic Avery',phone:'202-555-0142'})).version;ok(v===1);
  await denied(()=>read(11),'42501');await denied(()=>read(12),'42501');await denied(()=>read(13),'42501');await denied(()=>read(14),'42501');
  await denied(()=>call(11,1099,0,'create',{name:'Unauthorized sample'}),'42501');
  await actor(10);await denied(()=>db.exec('select * from contacts_private.identities'),'42501');await db.exec('reset role');
  ok((await read(10)).methods.length===1);ok((await db.query('select id from public.members')).rows.length===6);
  v=(await call(10,1000,v,'interact',{text:'Earlier collaboration note',visibility:'collaborators'})).version;
  v=(await call(10,1000,v,'share',{target:id(11),methods:false})).version;
  ok((await read(11)).interactions.length===0);ok((await read(11)).methods.length===0);
  v=(await call(10,1000,v,'interact',{text:'Shared after grant',visibility:'collaborators'})).version;
  const privateRequest=++seq;v=(await call(10,1000,v,'interact',{text:'Author-only synthetic note',visibility:'author'},privateRequest)).version;
  ok((await read(11)).interactions.length===1);ok((await read(10)).interactions.length===3);
  await denied(()=>call(11,1000,v,'edit',{preferred:'phone'}),'42501');await denied(()=>call(11,1000,v,'share',{target:id(13)}),'42501');await denied(()=>call(10,1000,v,'share',{target:id(15)}),'42501');
  await denied(()=>call(10,1000,v,'edit',{name:'No',owner:id(11)}),'22023');await denied(()=>call(10,1000,v,'share',{target:id(11),methods:'true'}),'22023');
  const taskRequest=++seq;const future=new Date(Date.now()+86400000).toISOString();v=(await call(10,1000,v,'schedule',{target:id(11),due:future,text:'Agreed sample action'},taskRequest)).version;
  const beforeReschedule=v,newTask=++seq;v=(await call(11,1000,v,'reschedule',{target:id(taskRequest),due:new Date(Date.now()+172800000).toISOString()},newTask)).version;
  const tasks=(await read(11)).follow_ups;ok(tasks.length===2);ok(tasks.find(t=>t.id===id(taskRequest))?.reason==='rescheduled');ok(tasks.find(t=>t.id===id(newTask))?.state==='scheduled');
  ok((await agenda(11)).length===1);ok(!JSON.stringify(await agenda(11)).includes('Synthetic Avery'));ok(!JSON.stringify(await agenda(11)).includes('Agreed sample action'));
  const completeRequest=++seq,completeVersion=v;v=(await call(11,1000,v,'complete',{target:id(newTask)},completeRequest)).version;
  ok((await call(11,1000,completeVersion,'complete',{target:id(newTask)},completeRequest)).version===v);ok((await agenda(11)).length===0);ok((await read(10)).lifecycle==='new');
  await denied(()=>call(11,1000,completeVersion,'complete',{target:id(taskRequest)},completeRequest),'40001');await denied(()=>call(10,1000,beforeReschedule,'edit',{preferred:'phone'}),'40001');
  // Transaction rollback includes identity, record version, audit and receipt.
  await db.exec("create function contacts_private.test_audit_failure() returns trigger language plpgsql as $$begin raise exception 'Synthetic audit failure';end$$;create trigger test_audit_failure before insert on contacts_private.audit_events for each row execute function contacts_private.test_audit_failure()");
  await denied(()=>call(10,1000,v,'edit',{name:'Must roll back'}),'P0001');ok((await read(10)).name==='Synthetic Avery');ok((await read(10)).version===v);await db.exec('drop trigger test_audit_failure on contacts_private.audit_events');
  v=(await call(10,1000,v,'correct-interaction',{target:id(privateRequest),text:'Corrected author-only note'})).version;
  ok((await read(10)).interactions.length===4);ok((await read(11)).interactions.length===1);
  const pendingId=++seq;v=(await call(10,1000,v,'schedule',{target:id(11),due:future,text:'Another agreed action'},pendingId)).version;
  v=(await call(10,1000,v,'revoke',{target:id(11)})).version;await denied(()=>read(11),'42501');ok((await agenda(11)).length===0);ok((await read(10)).follow_ups.find(t=>t.id===id(pendingId))?.reason==='sharing_revoked');
  await denied(()=>call(11,1000,completeVersion,'complete',{target:id(newTask)},completeRequest),'42501');
  // Shared method/name in a different scope must not disclose that record's existence.
  await call(15,1001,0,'create',{name:'Synthetic Avery',phone:'202-555-0142'});
  await actor(10);ok((await db.query<{v:unknown[]}>('select contacts_private.review_duplicates($1) as v',[id(1000)])).rows[0].v.length===0);await db.exec('reset role');
  await call(10,1002,0,'create',{name:'Different synthetic person',phone:'202-555-0142'});
  await actor(10);ok((await db.query<{v:unknown[]}>('select contacts_private.review_duplicates($1) as v',[id(1000)])).rows[0].v.length===1);await db.exec('reset role');
  v=(await call(10,1000,v,'duplicate-distinct',{target:id(1002)})).version;ok((await db.query('select * from contacts_private.records')).rows.length===3);await denied(()=>call(10,1000,v,'duplicate-distinct',{target:id(1001)}),'42501');
  v=(await call(10,1000,v,'dnc')).version;await denied(()=>call(10,1000,v,'schedule',{target:id(10),due:future,text:'No'}),'42501');await denied(()=>call(10,1000,v,'status',{lifecycle:'active'}),'22023');
  v=(await call(10,1000,v,'archive')).version;ok((await read(10)).archived);v=(await call(10,1000,v,'restore')).version;const restored=await read(10);ok(!restored.archived&&restored.do_not_contact&&restored.lifecycle==='closed');
  await db.exec(`update public.members set status='inactive' where id='${id(10)}'`);await denied(()=>read(10),'42501');await denied(()=>read(11),'42501');
  v=(await call(14,1000,v,'reassign',{target:id(11)})).version;ok((await read(11)).interactions.length===2);await denied(()=>read(14),'42501');
  await denied(()=>call(11,1000,v,'correct-interaction',{target:id(privateRequest),text:'Not my note'}),'42501');
  await db.exec(`update public.members set status='active' where id='${id(10)}'`);await denied(()=>read(10),'42501');
  await db.exec(`update auth.sessions set not_after=now()-interval '1 second' where id='${id(211)}'`);await denied(()=>read(11),'42501');
  await db.exec(`update auth.sessions set not_after=null where id='${id(211)}';update app_private.app_modules set status='draft' where id='${id(500)}'`);await denied(()=>read(11),'42501');
  // Every successful mutation has one audit and hash receipt; failures added neither.
  const counts=await db.query<{audit:number;receipts:number}>("select (select count(*)::int from contacts_private.audit_events) audit,(select count(*)::int from contacts_private.command_receipts) receipts");ok(counts.rows[0].audit===counts.rows[0].receipts);
  const columns=await db.query<{column_name:string}>("select column_name from information_schema.columns where table_schema='contacts_private' and table_name='audit_events'");ok(!columns.rows.some(c=>/body|phone|email|name|payload|before_state|after_state/.test(c.column_name)));
  console.log(`CONTACTS R2 SQL: ${checks} permission, transaction and projection assertions passed. Disposable PGlite only.`);
 }finally{await db.close();}
});
