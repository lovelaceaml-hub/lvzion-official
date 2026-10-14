import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Contacts private owner release: authorized reads, mutations, DNC and isolation',async()=>{
 const db=new PGlite();let checks=0;
 const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const owner=id(11),auth=id(12),session=id(13),other=id(21),auth2=id(22),session2=id(23),contact=id(101);
 const must=(v:unknown,label:string)=>{assert.ok(v,label);checks++;};
 const deny=async(f:()=>Promise<unknown>,code='42501')=>{await assert.rejects(f,(e:unknown)=>(e as{code?:string}).code===code);checks++;};
 const actor=async(who=auth,sid=session)=>{
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [who,JSON.stringify({sub:who,session_id:sid})]);
  await db.exec('set role authenticated');
 };
 const rpc=async<T>(sql:string,args:unknown[]=[])=> (await db.query<{result:T}>(sql,args)).rows[0].result;
 const command=async(version:number,request:number,op:string,data:Record<string,unknown>={})=>
  rpc<{id:string;version:number}>('select public.contacts_command_r3($1,$2,$3,$4,$5::jsonb) result',
   [contact,version,id(request),op,JSON.stringify(data)]);
 try {
  // Shared synthetic bootstrap defines the auth administrator role.
  for(const p of [
   'supabase/tests/bootstrap.sql',
   'supabase/migrations/20261014020617_member_system_foundation.sql',
   'supabase/migrations/20261014043055_member_command_hardening.sql',
   'supabase/migrations/20261014045521_member_onboarding.sql',
   'supabase/migrations/20261014074214_module_runtime_foundation.sql',
   'supabase/migrations/20261014155148_self_service_unassigned_enrollment.sql',
   'supabase/migrations/20261014190128_production_owner_setup.sql'
  ])await db.exec(await readFile(p,'utf8'));
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())",
   [auth,'fake-owner@example.invalid',auth2,'fake-other@example.invalid']);
  await db.query("insert into auth.sessions(id,user_id) values($1,$2),($3,$4)",[session,auth,session2,auth2]);
  await db.query("insert into public.members(id,display_name,status) values($1,'Fictional Owner','intake')",[owner]);
  await db.query("insert into app_private.account_links(member_id,auth_user_id,username) values($1,$2,'test_owner')",[owner,auth]);
  await db.query("insert into app_private.bootstrap_receipts(auth_user_id) values($1)",[auth]);
  await db.query("insert into app_private.role_assignments(member_id,role_key,appointed_by) values($1,'member_administrator',$1)",[owner]);
  await db.exec(await readFile('supabase/migrations/20261014224708_contacts_private_owner_pilot_v1.sql','utf8'));
  const tabs=(await db.query<{tablename:string,rowsecurity:boolean}>(
    "select tablename,rowsecurity from pg_tables where schemaname='contacts_private' order by tablename")).rows;
  must(tabs.length===6&&tabs.every(t=>t.rowsecurity),'all private tables are protected');
  for(const tab of tabs)for(const role of ['anon','authenticated','service_role']){
   const result=await db.query<{allowed:boolean}>('select has_table_privilege($1,$2,$3) allowed',
    [role,'contacts_private.'+tab.tablename,'SELECT']);
   must(result.rows[0].allowed===false,'no direct client table grant');
  }
  must((await db.query<{n:number}>('select count(*) n from app_private.module_access_grants')).rows[0].n===1,'one explicit owner grant');
  await actor();
  const workspace=await rpc<{member_id:string;can_create:boolean;contacts:unknown[]}>('select public.contacts_workspace_r3(null) result');
  must(workspace.member_id===owner&&workspace.can_create&&workspace.contacts.length===0,'verified unassigned bootstrap owner can use module');
  await deny(()=>db.exec('select * from contacts_private.records'));
  let receipt=await command(0,120,'create',{name:'Fictional contact',phone:'202-555-0142',preferred:'phone'});
  must(receipt.version===1,'created contact');
  must((await command(0,120,'create',{preferred:'phone',phone:'202-555-0142',name:'Fictional contact'})).version===1,
   'identical retry does not write again');
  await deny(()=>command(0,120,'create',{name:'Different person'}),'40001');
  await deny(()=>command(1,121,'share',{target:other}),'22023');
  receipt=await command(1,122,'interact',{visibility:'author',text:'Fictional private note'});
  must(receipt.version===2,'recorded author-only note');
  const due=new Date(Date.now()+86400000).toISOString();
  receipt=await command(2,123,'schedule',{target:owner,due,text:'Fictional next step'});
  must(receipt.version===3,'scheduled own follow-up');
  const detail=await rpc<{interactions:unknown[];follow_ups:unknown[];methods:unknown[]}>(
   'select public.contacts_detail_r3($1) result',[contact]);
  must(detail.interactions.length===1&&detail.follow_ups.length===1&&detail.methods.length===1,'private detail');
  receipt=await command(3,124,'complete',{target:id(123)});
  must(receipt.version===4,'completed action');
  await deny(()=>command(3,125,'edit',{preferred:'text'}),'40001');
  receipt=await command(4,126,'dnc');must(receipt.version===5,'DNC');
  await deny(()=>command(5,127,'status',{lifecycle:'active'}),'22023');
  receipt=await command(5,128,'archive');must(receipt.version===6,'archived');
  receipt=await command(6,129,'restore');must(receipt.version===7,'restored without clearing DNC');
  must((await command(6,129,'restore')).version===7,'restore is idempotent');
  await deny(()=>command(7,130,'schedule',{target:owner,due:new Date(Date.now()+86400000).toISOString(),text:'Must not run'}));
  const dnc=await rpc<{do_not_contact:boolean;lifecycle:string;archived:boolean}>('select public.contacts_detail_r3($1) result',[contact]);
  must(dnc.do_not_contact&&dnc.lifecycle==='closed'&&!dnc.archived,'DNC remains closed');
  await db.exec('reset role');
  await db.query("insert into public.age_categories(id,name) values($1,'Fictional age')",[id(31)]);
  await db.query("insert into public.church_groups(id,age_category_id,name) values($1,$2,'Fictional group')",[id(32),id(31)]);
  await db.query("insert into public.church_units(id,group_id,name) values($1,$2,'Fictional unit')",[id(33),id(32)]);
  await db.exec('begin');
  await db.query("insert into public.members(id,display_name,status) values($1,'Fictional Other','active')",[other]);
  await db.query("insert into public.member_placements(member_id,group_id,unit_id) values($1,$2,$3)",[other,id(32),id(33)]);
  await db.exec('commit');
  await db.query("insert into app_private.account_links(member_id,auth_user_id,username) values($1,$2,'test_other')",[other,auth2]);
  await db.query("insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by) select $1,id,'viewer','Fictional separate explicit grant',$2 from app_private.app_modules where module_key='contacts'",[other,owner]);
  await actor(auth2,session2);
  must((await rpc<{contacts:unknown[]}>('select public.contacts_workspace_r3(null) result')).contacts.length===0,
   'different authorized account still cannot see another owner’s records');
  await deny(()=>db.query('select public.contacts_detail_r3($1)',[contact]));
  await deny(()=>command(7,131,'interact',{text:'Must fail',visibility:'author'}));
  await db.exec('reset role');
  await db.query("update app_private.module_access_grants set ended_at=clock_timestamp() where member_id=$1",[owner]);
  await actor();
  await deny(()=>db.exec('select public.contacts_workspace_r3(null)'));
  await db.exec('reset role');
  must(Number((await db.query<{n:number}>('select count(*) n from contacts_private.audit_events')).rows[0].n)===7,'audit exactly once per mutation');
  console.log('Contacts private pilot: '+checks+' assertions pass in disposable PGlite.');
 }finally{await db.close();}
});
