// Native PostgreSQL check: creates an isolated UNIX-socket-only cluster, then removes it.
// No hosted URLs, account credentials, or real member data are accepted.
import{mkdtemp,readFile,readdir,rm}from'node:fs/promises';
import{execFile,execFileSync}from'node:child_process';import{promisify}from'node:util';import{tmpdir}from'node:os';import{join}from'node:path';import assert from'node:assert/strict';
const run=promisify(execFile),dir=await mkdtemp(join(tmpdir(),'lvz-study-race-'));let started=false;
const args=['-h',dir,'-p','55458','-d','postgres','-v','ON_ERROR_STOP=1','-At'];
function sql(query){return execFileSync('psql',[...args,'-c',query],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']});}
try{
 execFileSync('initdb',['-D',dir+'/db','-A','trust','--no-instructions'],{stdio:'ignore'});
 execFileSync('pg_ctl',['-D',dir+'/db','-l',dir+'/postgres.log','-o',"-k "+dir+" -p 55458 -c listen_addresses=''",'start'],{stdio:'ignore'});started=true;
 const migrations=(await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort().map(x=>'supabase/migrations/'+x);
 for(const file of ['supabase/tests/bootstrap.sql',...migrations,'supabase/seed/fictional_members.sql'])sql(await readFile(file,'utf8'));
 const native=execFileSync('psql',[...args,'-f','supabase/tests/study_rooms.sql'],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']});
 console.log('Native PostgreSQL study-room regression script: PASS');
 const test=await readFile('supabase/tests/study_rooms.sql','utf8');
 const prefix=test.slice(test.indexOf('begin;'),test.indexOf('create function pg_temp.login'));
 const grant=test.split("update app_private.app_modules set status='approved'")[1].split('select pg_temp.login(105)')[0];
 sql(prefix+"update app_private.app_modules set status='approved'"+grant+'commit;');
 const tomorrow=sql("select ((now() at time zone 'America/Los_Angeles')::date+1)::text").trim();
 const make=(n)=>({requestId:'96000000-0000-4000-8000-'+String(n).padStart(12,'0'),action:'reserve',resourceId:'92000000-0000-4000-8000-000000000001',day:tomorrow,start:780,end:840,purpose:'other',detail:'Fictional concurrency test'});
 const auth=(n)=>"begin;set local role authenticated;select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-"+String(n).padStart(12,'0')+"',true);select set_config('request.jwt.claims','{\"session_id\":\"aaaaaaaa-aaaa-4aaa-8aaa-"+String(n).padStart(12,'0')+"\"}',true);";
 const tx=(n)=>auth(n)+"select public.study_room_command('"+JSON.stringify(make(n))+"');select pg_sleep(0.15);commit;";
 const outcomes=await Promise.all([107,103].map(async n=>{try{await run('psql',[...args,'-c',tx(n)],{timeout:20000});return{n,ok:true};}catch(e){return{n,ok:false,error:String(e.stderr)};}}));
 assert.equal(outcomes.filter(o=>o.ok).length,1,'Exactly one competing booking must win');assert(outcomes.filter(o=>!o.ok).every(o=>o.error.includes('Time unavailable')));
 assert.equal(sql('select count(*) from app_private.study_bookings').trim(),'1');assert.equal(sql('select count(*) from app_private.study_slots').trim(),'2');assert.equal(sql('select count(*) from app_private.module_activities').trim(),'1');
 const winner=outcomes.find(o=>o.ok).n;sql(tx(winner));assert.equal(sql('select count(*) from app_private.study_bookings').trim(),'1');
 console.log('Concurrent same-resource requests: one winner, one rejected; one booking, two occupied slots, one My Week activity. Exact retry creates no duplicate. PASS');
}finally{if(started)execFileSync('pg_ctl',['-D',dir+'/db','-m','immediate','stop'],{stdio:'ignore'});await rm(dir,{recursive:true,force:true});}
