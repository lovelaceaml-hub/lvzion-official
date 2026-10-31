import test from 'node:test';import assert from 'node:assert/strict';
import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
// Open app access, owner-everywhere, group-only placement and placement-independent leadership.
// Hosted order: every earlier migration, the owner's Contacts and Worship activation, then the new migration.
const latest='20261024170000_open_access_group_placement.sql';
const ownerActivated=/contacts_private_owner_pilot_v1|worship_duty_(live_activation|live_setup|operations)/;
test('open access, owner everywhere and group-only placement across modules',async()=>{
 const db=new PGlite();let passed=0;
 const run=async(path:string)=>{
  try{await db.exec(await readFile(path,'utf8'),{onNotice:notice=>{if(notice.message?.startsWith('OPEN PASS:'))passed++;}});}
  catch(e){const err=e as Error&{code?:string};throw Error(path+': '+err.message+' ['+err.code+'] after '+passed+' passes');}
 };
 try{
  const earlier=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&p<latest&&!ownerActivated.test(p)).sort();
  for(const p of ['supabase/tests/bootstrap.sql',...earlier.map(p=>'supabase/migrations/'+p)])await run(p);
  // A fictional verified owner signs up and is initialized, exactly as production was.
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('99999999-9999-4999-8999-000000000900','owner@example.invalid',now()-interval '2 days');
   insert into auth.sessions(id,user_id,created_at) values('aaaaaaaa-aaaa-4aaa-8aaa-000000000900','99999999-9999-4999-8999-000000000900',now()-interval '1 hour');
   update app_private.enrollment_settings set enabled=true,allowed_email_domains=array['example.invalid'],owner_email='owner@example.invalid';
   select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000900',false),set_config('request.jwt.claims','{"session_id":"aaaaaaaa-aaaa-4aaa-8aaa-000000000900"}',false);
   select public.complete_self_service_enrollment('Owner Example');
   select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','',false);`);
  for(const p of ['20261014224708_contacts_private_owner_pilot_v1.sql','20261024160200_worship_duty_live_activation.sql','20261024160300_worship_duty_live_setup.sql','20261024160400_worship_duty_operations.sql'])await run('supabase/migrations/'+p);
  await run('supabase/seed/fictional_members.sql');
  await run('supabase/migrations/'+latest);
  // Idempotent: applying the migration a second time changes nothing and does not fail.
  await run('supabase/migrations/'+latest);
  await run('supabase/tests/open_access_group_placement.sql');
  assert(passed>=60,'Expected 60+ executed assertions; got '+passed);
  console.log('Open access and group-only placement SQL assertions: '+passed);
 }finally{await db.close();}
});
