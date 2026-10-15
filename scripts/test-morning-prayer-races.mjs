// Real two-connection PostgreSQL tests. Local disposable cluster, fictional data only.
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'lvz-wm-races-')),port='55476';
const bin=process.env.LVZ_POSTGRES_BIN||'/opt/homebrew/opt/postgresql@16/bin';
const args=['-h',dir,'-p',port,'postgres','-X','-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'];
const run=(name,argv)=>execFileSync(join(bin,name),argv,{encoding:'utf8',stdio:'pipe'});
const sql=query=>run('psql',[...args,'-c',query]).trim();
const uid=n=>'aaaaaaaa-aaaa-4aaa-8aaa-'+String(n).padStart(12,'0');
const mid=n=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
const sid=n=>'bbbbbbbb-bbbb-4bbb-8bbb-'+String(n).padStart(12,'0');
const actor=n=>`select set_config('request.jwt.claim.sub','${uid(n)}',false),set_config('request.jwt.claims','${JSON.stringify({session_id:sid(n)})}',false);set role authenticated;`;
const rpc=(name,version,action)=>`select public.${name}(${version},'${randomUUID()}','${JSON.stringify(action)}'::jsonb);`;
const version=()=>Number(sql('select version from mpg_private.series limit 1'));
const caps=['view_schedule','join_gathering','volunteer_host','review_requests','manage_schedule','view_materials','edit_materials','publish_materials'];
const execAsync=query=>{
 const p=spawn(join(bin,'psql'),[...args,'-c',query],{stdio:['ignore','pipe','pipe']});
 let output='';p.stdout.on('data',x=>{output+=x;});p.stderr.on('data',x=>{output+=x;});
 return new Promise((resolve,reject)=>{p.on('error',reject);p.on('exit',code=>resolve({code,output}));});
};
async function sleeping(){
 for(let i=0;i<60;i++){
  if(sql("select count(*) from pg_stat_activity where application_name='wm-race-writer' and wait_event='PgSleep'")==='1')return;
  await new Promise(r=>setTimeout(r,50));
 }
 throw Error('Writer did not acquire the test lock.');
}
let started=false;
try{
 run('initdb',['-D',join(dir,'pg'),'-A','trust','--no-instructions']);
 run('pg_ctl',['-D',join(dir,'pg'),'-l',join(dir,'postgres.log'),'-o',`-k ${dir} -p ${port} -c listen_addresses=127.0.0.1`,'start']);started=true;
 sql(await readFile('supabase/tests/bootstrap.sql','utf8'));
 for(const name of ['20261014020617_member_system_foundation','20261014043055_member_command_hardening','20261014045521_member_onboarding','20261014074214_module_runtime_foundation','20261014155148_self_service_unassigned_enrollment','20261014190128_production_owner_setup'])sql(await readFile('supabase/migrations/'+name+'.sql','utf8'));
 // Vault is a synthetic test double. Hosted Vault encryption is checked separately.
 sql(`create schema vault;create table vault.decrypted_secrets(id uuid primary key default gen_random_uuid(),decrypted_secret text not null);create function vault.create_secret(new_secret text)returns uuid language plpgsql as $$declare v uuid;begin insert into vault.decrypted_secrets(decrypted_secret)values(new_secret)returning id into v;return v;end$$;create function vault.update_secret(secret_id uuid,new_secret text)returns void language sql as $$update vault.decrypted_secrets set decrypted_secret=new_secret where id=secret_id$$;`);
 for(let n=1;n<=2;n++)sql(`insert into auth.users values('${uid(n)}','fictional-${n}@example.invalid',now());insert into auth.sessions(id,user_id)values('${sid(n)}','${uid(n)}');insert into public.members(id,display_name,status)values('${mid(n)}','Fictional Member ${n}','intake');insert into app_private.account_links(member_id,auth_user_id,username)values('${mid(n)}','${uid(n)}','fictional_member_${n}');`);
 sql(`insert into app_private.bootstrap_receipts(auth_user_id)values('${uid(1)}');`);
 for(const name of ['20261014224129_morning_prayer_live_core','20261014231657_morning_prayer_operations_r4','20261015004856_morning_prayer_completion_r5'])sql(await readFile('supabase/migrations/'+name+'.sql','utf8'));
 sql(`insert into public.age_categories(id,name)values('11111111-1111-4111-8111-000000000001','Fictional category');insert into public.church_groups(id,age_category_id,name)values('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','Fictional group');insert into public.church_units(id,group_id,name)values('33333333-3333-4333-8333-000000000001','22222222-2222-4222-8222-000000000001','Fictional unit');insert into public.member_placements(member_id,group_id,unit_id,started_at)values('${mid(2)}','22222222-2222-4222-8222-000000000001','33333333-3333-4333-8333-000000000001',now()-interval '1 day');update public.members set status='active' where id='${mid(2)}';`);
 const grant=()=>sql(actor(1)+rpc('mpg_owner_access',version(),{type:'grant',memberId:mid(2),capabilities:caps}));
 grant();
 const date=new Date(Date.now()+86400000*5).toISOString().slice(0,10);
 const occurrence={date,startsAt:date+'T16:00:00Z',endsAt:date+'T16:30:00Z',timezone:'America/Los_Angeles',kind:'gathering'};
 // A management request sees an old grant, waits behind revocation, then must deny.
 let v=version();
 let writer=execAsync("set application_name='wm-race-writer';begin;"+actor(1)+rpc('mpg_owner_access',v,{type:'revoke',memberId:mid(2)})+'select pg_sleep(1.5);commit;');
 await sleeping();
 let contender=execAsync(actor(2)+rpc('mpg_bulk_schedule',v,[occurrence]));
 assert.equal((await writer).code,0);let outcome=await contender;
 assert.notEqual(outcome.code,0);assert.match(outcome.output,/42501/);
 assert.equal(sql('select count(*) from mpg_private.occurrences'),'0');
 console.log('PASS: waiting schedule writer denied after permission revocation.');
 // Two valid writers with the same revision create exactly one occurrence.
 grant();v=version();
 writer=execAsync("set application_name='wm-race-writer';begin;"+actor(1)+rpc('mpg_bulk_schedule',v,[occurrence])+'select pg_sleep(1.5);commit;');
 await sleeping();contender=execAsync(actor(2)+rpc('mpg_bulk_schedule',v,[occurrence]));
 assert.equal((await writer).code,0);outcome=await contender;
 assert.notEqual(outcome.code,0);assert.match(outcome.output,/40001/);
 assert.equal(sql('select count(*) from mpg_private.occurrences'),'1');
 console.log('PASS: concurrent batches cannot overwrite the same schedule revision.');
 const occurrenceId=sql('select id from mpg_private.occurrences limit 1');
 sql(actor(1)+rpc('mpg_live_command',version(),{type:'schedule',mode:'verify',occurrenceId}));
 sql(actor(1)+rpc('mpg_meeting_settings',version(),{type:'set_window',windowMinutes:10}));
 sql(actor(1)+rpc('mpg_meeting_settings',version(),{type:'configure_meeting',occurrenceId,url:'https://us06web.zoom.us/j/12345678901?pwd=Fictional1'}));
 sql(`update mpg_private.occurrences set starts_at=clock_timestamp()+interval '5 minutes',ends_at=clock_timestamp()+interval '35 minutes',local_date=(clock_timestamp() at time zone 'America/Los_Angeles')::date where id='${occurrenceId}';update mpg_private.access_references set expires_at=clock_timestamp()+interval '35 minutes' where occurrence_id='${occurrenceId}';`);
 v=version();writer=execAsync("set application_name='wm-race-writer';begin;"+actor(1)+rpc('mpg_meeting_settings',v,{type:'revoke_meeting',occurrenceId})+'select pg_sleep(1.5);commit;');
 await sleeping();contender=execAsync(actor(2)+`select public.mpg_live_join('${occurrenceId}');`);
 assert.equal((await writer).code,0);outcome=await contender;
 assert.notEqual(outcome.code,0);assert.match(outcome.output,/42501/);assert.doesNotMatch(outcome.output,/Fictional1/);
 console.log('PASS: waiting join cannot return a meeting secret after revocation.');
}finally{
 if(started)run('pg_ctl',['-D',join(dir,'pg'),'stop','-m','fast']);
 await rm(dir,{recursive:true,force:true});
}
