import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const owner='bbbbbbbb-bbbb-4bbb-8bbb-000000000001',other='bbbbbbbb-bbbb-4bbb-8bbb-000000000002';
const session='aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
test('production Worship owner setup, lifecycle, permissions and persistence',async t=>{
 const db=new PGlite();
 try{
  // Every current migration in hosted order, so Worship is audited against the real foundation it will run on.
  const ownerActivation=/contacts_private_owner_pilot_v1|worship_duty_(live_activation|live_setup|operations)/;
  const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&!ownerActivation.test(p)).sort();
  for(const p of ['supabase/tests/bootstrap.sql',...migrations.map(p=>'supabase/migrations/'+p)]){
   try{await db.exec(await readFile(p,'utf8'));}catch(e){throw new Error(p+': '+(e instanceof Error?e.message:String(e)));}
  }
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${owner}','owner@example.invalid',now()),('${other}','other@example.invalid',now());
   insert into auth.sessions(id,user_id) values('${session}','${owner}'),('aaaaaaaa-aaaa-4aaa-8aaa-000000000002','${other}');
   update app_private.enrollment_settings set enabled=true,allowed_email_domains=array['example.invalid'],owner_email='owner@example.invalid';`);
  const as=async(id=owner,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({sub:id,session_id:id===owner?session:'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'})]);await db.exec(`set role ${role}`);};
  await as();await db.query("select public.complete_self_service_enrollment('Owner Example')");await db.exec('reset role');
  for(const p of ['20261024160200_worship_duty_live_activation.sql','20261024160300_worship_duty_live_setup.sql','20261024160400_worship_duty_operations.sql'])await db.exec(await readFile('supabase/migrations/'+p,'utf8'));
  const home=async()=>(await db.query<{v:any}>('select public.worship_setup_workspace() v')).rows[0].v;
  const call=async(c:Record<string,unknown>)=>db.query('select public.worship_setup_command($1::jsonb)',[JSON.stringify(c)]);
  const deny=async(f:()=>Promise<unknown>,code:string)=>assert.rejects(f,(e:any)=>e.code===code,code);
  let id='';
  await t.test('verified Unassigned owner has explicit setup, manager and independent song access',async()=>{await as();const h=await home();assert.equal(h.departments.length,8);assert.equal(h.members.length,0);assert.equal(h.services.length,0);const w=(await db.query<{v:any}>('select public.worship_workspace_v2() v')).rows[0].v;assert.equal(w.manageDepartments.length,8);assert.equal(w.timezone,'America/Los_Angeles');});
  await t.test('anonymous and ordinary intake cannot setup or enumerate personnel',async()=>{await as(owner,'anon');await deny(home,'42501');await as(other);await db.query("select public.complete_self_service_enrollment('Other Example')");await deny(home,'42501');await deny(()=>call({op:'song',code:'A',title:'Example',seconds:180,expectedVersion:0}),'42501');});
  await t.test('service creation persists as draft and validates missing fields',async()=>{await as();await deny(()=>call({op:'create',worship:'Sabbath Day',period:null,startsAt:null,endsAt:null}),'22023');await call({op:'create',worship:'Sabbath Day',period:'Morning',startsAt:new Date(Date.now()+7*86400000).toISOString(),endsAt:new Date(Date.now()+7*86400000+7200000).toISOString()});const h=await home();id=h.services[0].id;assert.equal(h.services[0].status,'draft');assert.equal(h.services[0].version,0);});
  await t.test('browser authority and stale lifecycle writes rejected',async()=>{await deny(()=>call({op:'publish',serviceId:id,expectedVersion:0,actorId:owner}),'22023');await call({op:'publish',serviceId:id,expectedVersion:0});await deny(()=>call({op:'cancel',serviceId:id,expectedVersion:0}),'40001');assert.equal((await home()).services[0].status,'published');});
  await t.test('song catalog changes are versioned and persistent',async()=>{await call({op:'song',code:'TEST-01',title:'Example Song',seconds:180,expectedVersion:0});await deny(()=>call({op:'song',code:'TEST-02',title:'Other Song',seconds:120,expectedVersion:0}),'40001');const h=await home();assert.equal(h.songs.length,1);assert.equal(h.version,1);});
  await t.test('technical role alone does not establish setup access',async()=>{await db.exec('reset role');await db.exec(`begin;do $$declare c uuid;g uuid;u uuid;begin
   insert into public.age_categories(name) values('Fictional Category') returning id into c;
   insert into public.church_groups(name,age_category_id) values('Fictional Group',c) returning id into g;
   insert into public.church_units(name,group_id) values('Fictional Unit',g) returning id into u;
   insert into public.member_placements(member_id,group_id,unit_id) select member_id,g,u from app_private.account_links where auth_user_id='${other}';
   update public.members set status='active' where id=(select member_id from app_private.account_links where auth_user_id='${other}');
   insert into app_private.role_assignments(member_id,role_key) select member_id,'technical_admin' from app_private.account_links where auth_user_id='${other}';end $$;commit;`);await as(other);await deny(home,'42501');});
  await t.test('owner can approve participation and grant independent departmental and song authority',async()=>{await as();const m=(await home()).members[0].id;
   await call({op:'participation',memberId:m,department:'Usher Brothers',enabled:true,expectedVersion:1});
   await call({op:'access',memberId:m,enabled:true,expectedVersion:2});
   await call({op:'qualify',memberId:m,dutyId:'usher_1',enabled:true,expectedVersion:3});
   await call({op:'manager',memberId:m,department:'Usher Brothers',enabled:true,expectedVersion:4});
   await call({op:'song_editor',memberId:m,enabled:true,expectedVersion:5});
   const h=await home();assert.equal(h.version,6);assert.deepEqual(h.members[0].managerDepartments,['Usher Brothers']);assert.equal(h.members[0].songEditor,true);
   await as(other);const w=(await db.query<{v:any}>('select public.worship_workspace_v2() v')).rows[0].v;assert.deepEqual(w.manageDepartments,['Usher Brothers']);await deny(home,'42501');
  });
  await t.test('reviewed batches are atomic, versioned and department scoped',async()=>{await as();const m=(await home()).members[0].id;
   const batch=(changes:Record<string,unknown>[])=>db.query('select public.worship_batch($1::jsonb)',[JSON.stringify({op:'batch',changes})]);
   await deny(()=>batch([{serviceId:id,dutyId:'usher_1',memberId:m,expectedVersion:1},{serviceId:id,dutyId:'lobby_security',memberId:m,expectedVersion:1}]),'23514');
   assert.equal((await db.query<{v:any}>('select public.worship_workspace_v2() v')).rows[0].v.services[0].assignments.length,0);
   await as(other);await deny(()=>batch([{serviceId:id,dutyId:'presider',memberId:m,expectedVersion:1}]),'42501');
   await as();await batch([{serviceId:id,dutyId:'usher_1',memberId:m,expectedVersion:1}]);await deny(()=>batch([{serviceId:id,dutyId:'usher_1',memberId:null,expectedVersion:1}]),'40001');
   const w=(await db.query<{v:any}>('select public.worship_workspace_v2() v')).rows[0].v;assert.equal(w.services[0].version,2);assert.equal(w.services[0].assignments[0].filled,true);
  });
  await t.test('availability updates share the member version and retain duties',async()=>{await as();const m=(await home()).members[0].id;await call({op:'service_availability',memberId:m,serviceId:id,available:false,expectedAvailabilityVersion:0,expectedVersion:6});await deny(()=>call({op:'service_availability',memberId:m,serviceId:id,available:true,expectedAvailabilityVersion:0,expectedVersion:7}),'40001');assert.equal((await home()).members[0].serviceAvailability[0].available,false);const w=(await db.query<{v:any}>('select public.worship_workspace_v2() v')).rows[0].v;assert.equal(w.services[0].assignments[0].filled,true);assert.equal(w.services[0].assignments[0].availabilityConflict,true);});
  // Open access (2026-10-24): ending the explicit grant ends managing at once; ordinary use stays.
  await t.test('revoking manager module access ends management immediately',async()=>{await as();const m=(await home()).members[0].id;await call({op:'access',memberId:m,enabled:false,expectedVersion:7});await as(other);const w=(await db.query<{v:any}>('select public.worship_workspace_v2() v')).rows[0].v;assert.deepEqual(w.manageDepartments,[]);await deny(()=>db.query('select public.worship_batch($1::jsonb)',[JSON.stringify({op:'batch',changes:[{serviceId:id,dutyId:'usher_1',memberId:null,expectedVersion:0}]})]),'42501');});
  await t.test('cancellation retains records and version history',async()=>{await as();await call({op:'cancel',serviceId:id,expectedVersion:2});const h=await home();assert.equal(h.services[0].status,'cancelled');assert.equal(h.services[0].version,3);await db.exec('reset role');assert.ok(Number((await db.query<{n:string}>('select count(*) n from app_private.worship_audit')).rows[0].n)>=10);assert.equal((await db.query<{status:string}>("select status from app_private.module_activities where external_reference like $1",[id+':%'])).rows[0].status,'cancelled');});
  await t.test('all Worship tables and base helpers are private',async()=>{await as();await deny(()=>db.query('select * from app_private.worship_setup_versions'),'42501');await deny(()=>db.query('select app_private.worship_setup_workspace_base()'),'42501');});
 }finally{await db.close();}
});
