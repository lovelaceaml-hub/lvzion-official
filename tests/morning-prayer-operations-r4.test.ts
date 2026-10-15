import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

test('Morning Prayer R4: verified owner, member grants, atomic dates and Vault join',
 {timeout:120000},async t=>{
 const db=new PGlite();
 const id=(x:string,n:number)=>x.repeat(8)+'-'+x.repeat(4)+'-4'+x.repeat(3)+'-8'+x.repeat(3)+'-'+String(n).padStart(12,'0');
 const member=(n:number)=>id('4',n),user=(n:number)=>id('a',n),session=(n:number)=>id('b',n);
 async function owner(){await db.exec('reset role');}
 async function scalar<T=unknown>(sql:string,params:unknown[]=[]):Promise<T>{
  const q=await db.query<Record<string,T>>(sql,params);return Object.values(q.rows[0])[0];
 }
 async function as(n:number){await owner();
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user(n),JSON.stringify({session_id:session(n)})]);
  await db.exec('set role authenticated');
 }
 async function version(){await owner();return Number(await scalar('select version from mpg_private.series limit 1'));}
 async function call<T=unknown>(n:number,rpc:string,args:unknown[]):Promise<T>{
  await as(n);const marks=args.map((_,i)=>'$'+(i+1)).join(',');
  return scalar<T>('select public.'+rpc+'('+marks+')',args);
 }
 async function write(n:number,rpc:string,action:unknown,expected?:number,key=randomUUID()){
  const v=expected??await version();
  return call<Record<string,unknown>>(n,rpc,[v,key,JSON.stringify(action)]);
 }
 const denied=async(fn:()=>Promise<unknown>,code='42501')=>assert.rejects(fn,
  (e:unknown)=>typeof e==='object'&&e!==null&&'code'in e&&(e as {code:string}).code===code);
 const make=(days:number)=>{
  const d=new Date(Date.now()+days*86400000).toISOString().slice(0,10);
  return{date:d,startsAt:d+'T16:00:00Z',endsAt:d+'T16:30:00Z',timezone:'America/Los_Angeles',kind:'gathering'};
 };
 try{
  for(const path of ['supabase/tests/bootstrap.sql',
   'supabase/migrations/20261014020617_member_system_foundation.sql',
   'supabase/migrations/20261014043055_member_command_hardening.sql',
   'supabase/migrations/20261014045521_member_onboarding.sql',
   'supabase/migrations/20261014074214_module_runtime_foundation.sql',
   'supabase/migrations/20261014155148_self_service_unassigned_enrollment.sql',
   'supabase/migrations/20261014190128_production_owner_setup.sql']){
   // Existing bootstrap may or may not install this Supabase test-only role.
   if(path.includes('production_owner_setup'))await db.exec("do $begin if not exists(select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin; end if; end$;");
   await db.exec(await readFile(path,'utf8'));
  }
  await db.exec('create schema vault;create table vault.decrypted_secrets(id uuid primary key default gen_random_uuid(),decrypted_secret text not null);');
  await db.exec('create function vault.create_secret(new_secret text,new_name text default null,new_description text default null,new_key_id uuid default null) returns uuid language plpgsql as $$declare v uuid;begin insert into vault.decrypted_secrets(decrypted_secret)values(new_secret) returning id into v;return v;end$$;');
  await db.exec('create function vault.update_secret(secret_id uuid,new_secret text,new_name text default null,new_description text default null,new_key_id uuid default null) returns void language plpgsql as $$begin update vault.decrypted_secrets set decrypted_secret=new_secret where id=secret_id;end$$;');
  await db.exec("insert into public.age_categories(id,name)values('11111111-1111-4111-8111-000000000001','Example category');insert into public.church_groups(id,age_category_id,name)values('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','Example group');insert into public.church_units(id,group_id,name)values('33333333-3333-4333-8333-000000000001','22222222-2222-4222-8222-000000000001','Example unit');");
  for(let n=1;n<=3;n++){
   await db.query('insert into auth.users(id,email,email_confirmed_at)values($1,$2,now())',[user(n),'fictional-'+n+'@example.invalid']);
   await db.query('insert into auth.sessions(id,user_id)values($1,$2)',[session(n),user(n)]);
   await db.query('insert into public.members(id,display_name,status)values($1,$2,$3)',[member(n),'Fictional Member '+n,'intake']);
   await db.query('insert into app_private.account_links(member_id,auth_user_id,username)values($1,$2,$3)',[member(n),user(n),'fictional_member_'+n]);
  }
  for(let n=2;n<=3;n++){
   await db.query("insert into public.member_placements(member_id,group_id,unit_id,started_at)values($1,'22222222-2222-4222-8222-000000000001','33333333-3333-4333-8333-000000000001',now()-interval '1 day')",[member(n)]);
   await db.query("update public.members set status='active' where id=$1",[member(n)]);
  }
  await db.query('insert into app_private.bootstrap_receipts(auth_user_id)values($1)',[user(1)]);
  await db.exec(await readFile('supabase/migrations/20261014224129_morning_prayer_live_core.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261014231657_morning_prayer_operations_r4.sql','utf8'));
  await t.test('all fifteen private tables have RLS and bootstrapped owner is Unassigned',async()=>{
   await owner();const r=(await db.query<{relrowsecurity:boolean}>(
    "select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mpg_private' and c.relkind='r'")).rows;
   assert.equal(r.length,15);assert.ok(r.every(x=>x.relrowsecurity));
   assert.equal(await scalar('select status from app_private.app_modules where module_key=$1',['work-mission-prayer']),'approved');
   assert.equal(Number(await scalar('select count(*) from mpg_private.grants where ended_at is null')),7);
  });
  await t.test('anon cannot call member or management projections',async()=>{
   await owner();await db.exec('set role anon');
   await denied(()=>db.query('select public.mpg_owner_roster()'));
   await denied(()=>db.query('select * from mpg_private.access_references'));
  });
  await t.test('nonowner cannot use privileged roster, owner sees no email',async()=>{
   await as(2);await denied(()=>db.query('select public.mpg_owner_roster()'));
   await as(1);const profile=await scalar('select public.mpg_owner_roster()');
   assert.match(JSON.stringify(profile),/Fictional Member/);
   assert.doesNotMatch(JSON.stringify(profile),/@example.invalid/);
  });
  await t.test('own grant cannot be edited and nonowner cannot self-grant',async()=>{
   await denied(()=>write(1,'mpg_owner_access',{type:'revoke',memberId:member(1)}));
   await denied(()=>write(2,'mpg_owner_access',{type:'grant',memberId:member(2),capabilities:['view_schedule']}));
  });
  const grant={type:'grant',memberId:member(2),capabilities:['view_schedule','join_gathering','view_materials','volunteer_host','review_requests']};
  const original=await version(),key=randomUUID();
  const granted=await write(1,'mpg_owner_access',grant,original,key);
  await t.test('grants are explicit, exact retries idempotent',async()=>{
   assert.deepEqual(await write(1,'mpg_owner_access',grant,original,key),granted);
   await denied(()=>write(1,'mpg_owner_access',{type:'grant',memberId:member(2),capabilities:['view_schedule']},original,key),'22023');
   await owner();assert.equal(Number(await scalar('select count(*) from mpg_private.grants where member_id=$1 and ended_at is null',[member(2)])),5);
  });
  await t.test('host eligibility is separate and owner-controlled',async()=>{
   await owner();assert.equal(await scalar('select mpg_private.eligible(id,$1) from mpg_private.series limit 1',[member(2)]),false);
   await write(1,'mpg_owner_access',{type:'eligibility',memberId:member(2),enabled:true});
   await owner();assert.equal(await scalar('select mpg_private.eligible(id,$1) from mpg_private.series limit 1',[member(2)]),true);
  });
  const d1=make(7),d2=make(8),v=await version(),batchKey=randomUUID();
  const result=await call<Record<string,unknown>>(1,'mpg_bulk_schedule',[v,batchKey,JSON.stringify([d1,d2])]);
  await t.test('bulk dates are atomic, unverified and never duplicate silently',async()=>{
   assert.equal(result.count,2);
   assert.deepEqual(await call(1,'mpg_bulk_schedule',[v,batchKey,JSON.stringify([d1,d2])]),result);
   await owner();assert.equal(Number(await scalar('select count(*) from mpg_private.occurrences')),2);
   assert.equal(Number(await scalar('select count(*) from mpg_private.occurrences where schedule_verified')),0);
   const newVersion=await version();
   await denied(()=>call(1,'mpg_bulk_schedule',[newVersion,randomUUID(),JSON.stringify([d1,d1])]),'23505');
  });
  await owner();const occ=await scalar<string>('select id from mpg_private.occurrences order by starts_at limit 1');
  await t.test('meeting setup blocked before schedule and window verified',async()=>{
   await denied(()=>write(1,'mpg_meeting_settings',{type:'configure_meeting',occurrenceId:occ,url:'https://us06web.zoom.us/j/12345678901?pwd=Fictional1'}),'22023');
  });
  await write(1,'mpg_meeting_settings',{type:'set_window',windowMinutes:10});
  await write(1,'mpg_live_command',{type:'schedule',occurrenceId:occ,mode:'verify'});
  await write(1,'mpg_meeting_settings',{type:'configure_meeting',occurrenceId:occ,url:'https://us06web.zoom.us/j/12345678901?pwd=Fictional1'});
  await t.test('encrypted link is not returned in member home or audit',async()=>{
   await as(1);
   const home=await scalar('select public.mpg_live_home($1,$2)',[d1.date,d2.date]);
   assert.doesNotMatch(JSON.stringify(home),/Fictional1|us06web.zoom.us/);
   await owner();assert.equal(Number(await scalar('select count(*) from vault.decrypted_secrets')),1);
   const receipts=await db.query('select result from mpg_private.command_receipts');
   assert.doesNotMatch(JSON.stringify(receipts.rows),/Fictional1|us06web.zoom.us/);
  });
  await t.test('inside window, only authorized member obtains Vault link',async()=>{
   await owner();
   await db.query("update mpg_private.occurrences set starts_at=clock_timestamp()+interval '5 minutes',ends_at=clock_timestamp()+interval '35 minutes',local_date=(clock_timestamp() at time zone 'America/Los_Angeles')::date where id=$1",[occ]);
   await db.query("update mpg_private.access_references set expires_at=clock_timestamp()+interval '35 minutes' where occurrence_id=$1",[occ]);
   await as(2);
   const result=await scalar<{joinUrl:string}>('select public.mpg_live_join($1)',[occ]);
   assert.match(result.joinUrl,/^https:\/\/us06web[.]zoom[.]us\/j\//);
   await as(3);
   await denied(()=>db.query('select public.mpg_live_join($1)',[occ]));
  });
  await t.test('revoking verified Zoom access blocks even an eligible in-window member',async()=>{
   await write(1,'mpg_meeting_settings',{type:'revoke_meeting',occurrenceId:occ});
   await as(2);await denied(()=>db.query('select public.mpg_live_join($1)',[occ]));
   await owner();assert.equal(Number(await scalar('select count(*) from mpg_private.access_references where verified_at is not null')),0);
  });
  await t.test('revoking member removes grants and host eligibility, not history',async()=>{
   await write(1,'mpg_owner_access',{type:'revoke',memberId:member(2)});
   await owner();assert.equal(Number(await scalar('select count(*) from mpg_private.grants where member_id=$1 and ended_at is null',[member(2)])),0);
   await as(2);await denied(()=>db.query('select public.mpg_live_home($1,$2)',[d1.date,d2.date]));
  });
 }finally{await db.close();}
});