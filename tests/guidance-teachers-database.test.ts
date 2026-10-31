import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

// Focused tests for the new module. Real foundation migrations; fictional identities only.
// This never connects to Supabase, Vercel, SMTP or any production API.
test('Guidance Teachers database: permissions, four slots, receipts, conflicts and history',async()=>{
 const db=new PGlite();let checks=0;
 const run=async(path:string)=>{try{await db.exec(await readFile(path,'utf8'));}catch(e){throw Error(path+': '+(e as Error).message);}};
 const expect=async(fn:()=>Promise<unknown>,code:string)=>{await assert.rejects(fn(),(e:unknown)=>(e as {code?:string}).code===code);checks++;};
 const ownerActivated=/contacts_private_owner_pilot_v1|worship_duty_(live_activation|live_setup|operations)/;
 const boundary='20261024170000_open_access_group_placement.sql';
 const auths=['99999999-9999-4999-8999-000000000900','99999999-9999-4999-8999-000000000901','99999999-9999-4999-8999-000000000902'];
 const sessions=['aaaaaaaa-aaaa-4aaa-8aaa-000000000900','aaaaaaaa-aaaa-4aaa-8aaa-000000000901','aaaaaaaa-aaaa-4aaa-8aaa-000000000902'];
 const claim=async(i:number)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[auths[i],JSON.stringify({session_id:sessions[i]})]);};
 const login=async(i:number)=>{await claim(i);await db.exec('set role authenticated');};
 const cmd=async(input:Record<string,unknown>)=>{const r=await db.query<{result:{ok:boolean;serviceId:string;version:number}}>('select public.guidance_teachers_command($1::jsonb) as result',[JSON.stringify(input)]);return r.rows[0].result;};
 const read=async(date:string)=>{const r=await db.query<{result:{canView:boolean;canManage:boolean;services:{id:string;slots:{memberId:string|null}[]}[]}}>('select public.guidance_teachers_workspace($1::date) as result',[date]);return r.rows[0].result;};
 try{
  await run('supabase/tests/bootstrap.sql');
  const earlier=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&p<boundary&&!ownerActivated.test(p)).sort();
  for(const p of earlier)await run('supabase/migrations/'+p);
  await db.exec("update app_private.enrollment_settings set enabled=true,allowed_email_domains=array['example.invalid'],owner_email='owner@example.invalid'");
  const memberIds:string[]=[];
  for(let i=0;i<3;i++){
   await db.query("insert into auth.users(id,email,email_confirmed_at) values($1::uuid,$2,now()-interval '2 days')",[auths[i],i===0?'owner@example.invalid':`teacher${i}@example.invalid`]);
   await db.query("insert into auth.sessions(id,user_id,created_at) values($1::uuid,$2::uuid,now()-interval '1 hour')",[sessions[i],auths[i]]);
   await claim(i);await db.query('select public.complete_self_service_enrollment($1)',[i===0?'Owner Example':`Teacher ${i} Example`]);
   const r=await db.query<{id:string}>('select app_private.own_account_member_id() as id');memberIds.push(r.rows[0].id);
   await db.query("update public.members set status='active' where id=$1::uuid",[memberIds[i]]);
  }
  await db.exec("select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','',false)");
  for(const p of ['20261014224708_contacts_private_owner_pilot_v1.sql','20261024160200_worship_duty_live_activation.sql','20261024160300_worship_duty_live_setup.sql','20261024160400_worship_duty_operations.sql',boundary])await run('supabase/migrations/'+p);
  const migration=(await readdir('supabase/migrations')).find(p=>p.endsWith('_guidance_teachers.sql'));
  await run(migration?'supabase/migrations/'+migration:'docs/guidance-teachers/schema.sql');
  const count=await db.query<{n:number}>('select count(*)::int n from app_private.guidance_services');assert.equal(count.rows[0].n,0);checks++;
  const date=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  await db.exec('set role anon');await expect(()=>read(date),'42501');
  await login(1);let w=await read(date);assert.equal(w.canView,false);assert.deepEqual(w.services,[]);checks+=2;
  const create={op:'create',requestId:randomUUID(),title:'Test Morning',date,startTime:'10:00',endTime:'11:00'};
  await expect(()=>cmd(create),'42501');await login(0);
  const first=await cmd(create);assert(first.ok);checks++;
  const again=await cmd(create);assert.deepEqual(first,again);checks++;
  await expect(()=>cmd({...create,title:'Different request'}),'22023');
  w=await read(date);assert.equal(w.services.length,1);assert.equal(w.services[0].slots.length,4);checks+=2;
  const assign=(serviceId:string,expectedVersion:number,memberId:string|null,location='main',position=1)=>({op:'assign',requestId:randomUUID(),serviceId,expectedVersion,memberId,location,position});
  const a=await cmd(assign(first.serviceId,1,memberIds[1]));assert.equal(a.version,2);checks++;
  await login(1);w=await read(date);assert(w.canView);assert(!w.canManage);assert.equal(w.services[0].slots.filter(s=>s.memberId===memberIds[1]).length,1);checks+=3;
  await expect(()=>db.query('select public.guidance_teachers_candidates($1::uuid,$2)',[first.serviceId,'']),'42501');
  await expect(()=>cmd(assign(first.serviceId,2,memberIds[2],'small',1)),'42501');
  await login(0);
  await expect(()=>cmd(assign(first.serviceId,2,memberIds[1],'small',1)),'23505');
  await expect(()=>cmd(assign(first.serviceId,1,memberIds[2],'small',1)),'40001');
  await expect(()=>cmd(assign(first.serviceId,2,memberIds[2],'main',3)),'22023');
  await expect(()=>cmd({...assign(first.serviceId,2,memberIds[2]),actorId:memberIds[0]}),'22023');
  const b=await cmd(assign(first.serviceId,2,memberIds[2],'small',1));assert.equal(b.version,3);checks++;
  const second=await cmd({...create,requestId:randomUUID(),title:'Test Overlap',startTime:'10:30',endTime:'11:30'});
  await expect(()=>cmd(assign(second.serviceId,1,memberIds[1])),'23505');
  const third=await cmd({...create,requestId:randomUUID(),title:'Test Adjacent',startTime:'11:00',endTime:'12:00'});
  const c=await cmd(assign(third.serviceId,1,memberIds[1]));assert.equal(c.version,2);checks++;
  await expect(()=>cmd({op:'edit',requestId:randomUUID(),serviceId:first.serviceId,expectedVersion:3,title:'Test Morning',date,startTime:'10:00',endTime:'11:15'}),'23505');
  const candidates=await db.query<{r:{members:{id:string;unavailable:boolean}[]}}>('select public.guidance_teachers_candidates($1::uuid,$2) r',[second.serviceId,'Teacher']);
  assert.equal(candidates.rows[0].r.members.length,2);assert(candidates.rows[0].r.members.every(m=>m.unavailable));assert.deepEqual(Object.keys(candidates.rows[0].r.members[0]).sort(),['id','name','unavailable']);checks+=3;
  const cancel={op:'cancel',requestId:randomUUID(),serviceId:second.serviceId,expectedVersion:1};const cancelled=await cmd(cancel);assert.deepEqual(await cmd(cancel),cancelled);checks++;
  w=await read(date);assert.equal(w.services.length,2);checks++;
  await cmd(assign(first.serviceId,3,null));
  await cmd({op:'cancel',requestId:randomUUID(),serviceId:third.serviceId,expectedVersion:2});
  await login(1);assert.equal((await read(date)).canView,false);checks++;
  await login(2);assert.equal((await read(date)).canView,true);checks++;
  await expect(()=>db.query('select * from app_private.guidance_slots'),'42501');
  await db.exec('reset role');
  const retained=await db.query<{n:number}>('select count(*)::int n from app_private.guidance_slots where service_id=$1::uuid',[third.serviceId]);assert.equal(retained.rows[0].n,4);checks++;
  const rls=await db.query<{n:number}>("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app_private' and c.relname in ('guidance_services','guidance_slots','guidance_receipts','guidance_audit') and c.relrowsecurity");assert.equal(rls.rows[0].n,4);checks++;
  const wrappers=await db.query<{n:number}>("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'guidance_teachers_%' and not p.prosecdef");assert.equal(wrappers.rows[0].n,3);checks++;
  const history=await db.query<{n:number}>('select count(*)::int n from app_private.guidance_audit');assert.equal(history.rows[0].n,9);checks++;
  const activity=await db.query<{n:number}>("select count(*)::int n from app_private.module_activities where module_id=app_private.guidance_module_id() and status='scheduled'");assert.equal(activity.rows[0].n,1);checks++;
  console.log(`Guidance Teachers focused database assertions: ${checks}`);
 }finally{await db.close();}
});
