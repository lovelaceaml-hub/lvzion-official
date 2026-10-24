// Real two-connection PostgreSQL races for Groups & Gospel Planning. Local disposable cluster, fictional data only.
// Each scenario holds the first writer inside its transaction, proves the second request is waiting on the
// shared serialization lock, then lets the first commit and checks the second result.
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'lvz-gp-races-')),port=process.env.LVZ_GP_RACE_PORT||'55477';
const bin=process.env.LVZ_POSTGRES_BIN||'/opt/homebrew/opt/postgresql@16/bin';
const args=['-h',dir,'-p',port,'postgres','-X','-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=default'];
// PostgreSQL on macOS refuses to start without a valid locale in the environment.
const env={...process.env,LC_ALL:'en_US.UTF-8',LANG:'en_US.UTF-8'};
const run=(name,argv)=>execFileSync(join(bin,name),argv,{encoding:'utf8',stdio:'pipe',env});
const sql=query=>run('psql',[...args,'-c',query]).trim();
const uid=n=>'99999999-9999-4999-8999-'+String(n).padStart(12,'0');
const sid=n=>'aaaaaaaa-aaaa-4aaa-8aaa-'+String(n).padStart(12,'0');
const mid=n=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
const groupA='22222222-2222-4222-8222-000000000001',module='a7000000-0000-4000-8000-000000000001';
const actor=n=>`select set_config('request.jwt.claim.sub','${uid(n)}',false),set_config('request.jwt.claims','${JSON.stringify({session_id:sid(n)})}',false);set role authenticated;`;
const q=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
const command=(action,payload)=>`select public.gospel_planning_command('${action}',${q(payload)},'${randomUUID()}');`;
const call=(n,action,payload)=>JSON.parse(sql(actor(n)+command(action,payload)).split('\n').pop());
const vegasDay=offset=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date(Date.now()+offset*86400000));
const mondayOf=day=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
const execAsync=query=>{
 const p=spawn(join(bin,'psql'),[...args,'-c',query],{stdio:['ignore','pipe','pipe'],env});
 let output='';p.stdout.on('data',x=>{output+=x;});p.stderr.on('data',x=>{output+=x;});
 return new Promise((resolve,reject)=>{p.on('error',reject);p.on('exit',code=>resolve({code,output}));});
};
async function until(query,label){
 for(let i=0;i<80;i++){if(sql(query)==='1')return;await new Promise(r=>setTimeout(r,50));}
 throw Error('Timed out waiting: '+label);
}
let passes=0;
const pass=label=>{passes++;console.log('PASS: '+label);};
/** Writer runs inside a transaction and sleeps before commit; contender must queue on lock 741085. */
async function race(first,second){
 const writer=execAsync("set application_name='gp-race-writer';begin;"+first+'select pg_sleep(1.2);commit;');
 await until("select count(*) from pg_stat_activity where application_name='gp-race-writer' and wait_event='PgSleep'",'writer holds its transaction');
 const contender=execAsync("set application_name='gp-race-contender';"+second);
 await until("select count(*) from pg_stat_activity where application_name='gp-race-contender' and wait_event_type='Lock' and wait_event='advisory'",'contender waits on the shared lock');
 const [a,b]=await Promise.all([writer,contender]);
 return {first:a,second:b};
}
let started=false;
try{
 run('initdb',['-D',join(dir,'pg'),'-A','trust','--no-instructions']);
 run('pg_ctl',['-D',join(dir,'pg'),'-l',join(dir,'postgres.log'),'-o',`-k ${dir} -p ${port} -c listen_addresses=''`,'-w','start']);started=true;
 sql(await readFile('supabase/tests/bootstrap.sql','utf8'));
 for(const name of ['20261014020617_member_system_foundation','20261014043055_member_command_hardening','20261014045521_member_onboarding','20261014074214_module_runtime_foundation','20261014155148_self_service_unassigned_enrollment','20261024150000_gospel_planning_core'])
  sql(await readFile('supabase/migrations/'+name+'.sql','utf8'));
 sql(await readFile('supabase/seed/fictional_members.sql','utf8'));
 const ids=[101,102,105,107,109];
 sql(`begin;
  ${ids.map(n=>`insert into auth.users(id,email,email_confirmed_at) values('${uid(n)}','race-${n}@example.invalid',now());
  insert into auth.sessions(id,user_id,created_at) values('${sid(n)}','${uid(n)}',now()-interval '1 hour');
  insert into app_private.account_links(member_id,auth_user_id,username) values('${mid(n)}','${uid(n)}','race_${n}');
  insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_at) values('${mid(n)}','${module}','viewer','Fictional race access',now()-interval '1 hour');`).join('\n')}
  update app_private.app_modules set status='approved',approved_at=now() where id='${module}';
  insert into app_private.role_assignments(member_id,role_key,group_id,appointed_at) values('${mid(109)}','group_leader','${groupA}',now()-interval '1 day');
  insert into gp_private.locations(id,label,created_by) values('b7000000-0000-4000-8000-000000000001','Fictional Library Lobby','${mid(109)}');
  insert into gp_private.capability_grants(member_id,capability,group_id,placement_id,granted_by)
   select '${mid(109)}','publish','${groupA}',id,'${mid(109)}' from public.member_placements where member_id='${mid(109)}' and ended_at is null;
  commit;`);
 const day=vegasDay(4),week=mondayOf(day);
 const session=(people,from,to)=>({date:day,from,to,locationId:'b7000000-0000-4000-8000-000000000001',participants:people.map(mid)});
 const publish=(id,version=1)=>call(109,'session.publish',{id,expected:version});

 // 1. One member accepts two overlapping published sessions at the same moment.
 const s1=call(109,'session.create',session([109,107],'10:00','11:00')).id,s2=call(109,'session.create',session([109,107],'10:30','11:30')).id;
 publish(s1);publish(s2);
 let result=await race(actor(107)+command('session.respond',{id:s1,expected:1,expectedResponse:0,response:'accepted'}),
  actor(107)+command('session.respond',{id:s2,expected:1,expectedResponse:0,response:'accepted'}));
 assert.equal(result.first.code,0,result.first.output);assert.notEqual(result.second.code,0);assert.match(result.second.output,/GP_OVERLAP/);
 assert.equal(sql(`select count(*) from gp_private.commitments where member_id='${mid(107)}'`),'1');
 pass('concurrent overlapping acceptances leave exactly one commitment');

 // 2. A material revision commits while a partner answers the old version.
 const s3=call(109,'session.create',session([109,102],'13:00','14:00')).id;publish(s3);
 result=await race(actor(109)+command('session.revise',{...session([109,102],'14:00','15:00'),id:s3,expected:1}),
  actor(102)+command('session.respond',{id:s3,expected:1,expectedResponse:0,response:'accepted'}));
 assert.equal(result.first.code,0,result.first.output);assert.match(result.second.output,/GP_STALE/);
 assert.equal(sql(`select count(*) from gp_private.responses where session_id='${s3}'`),'0');
 pass('response to a version that changed while waiting is rejected');

 // 3. Draft edit commits while a stale publish waits; the earlier publication survives.
 call(109,'plan.save',{week,expected:0,review:'Fictional review',plan:'Fictional plan v1',nextAction:''});
 call(109,'plan.publish',{week,expected:1});
 call(109,'plan.save',{week,expected:1,review:'Fictional review',plan:'Fictional plan v2',nextAction:''});
 result=await race(actor(109)+command('plan.save',{week,expected:2,review:'Fictional review',plan:'Fictional plan v3',nextAction:''}),
  actor(109)+command('plan.publish',{week,expected:2}));
 assert.equal(result.first.code,0,result.first.output);assert.match(result.second.output,/GP_STALE/);
 assert.equal(sql(`select string_agg(plan,',' order by version) from gp_private.publications`),'Fictional plan v1');
 pass('stale publication waits, then fails without replacing the published plan');

 // 4. Both partners report the same session at once.
 const s4=call(109,'session.create',session([109,101],'16:00','17:00')).id;publish(s4);
 call(109,'session.respond',{id:s4,expected:1,expectedResponse:0,response:'accepted'});
 call(101,'session.respond',{id:s4,expected:1,expectedResponse:0,response:'accepted'});
 sql(`update gp_private.sessions set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id='${s4}'`);
 result=await race(actor(109)+command('report.save',{id:s4,expected:1,expectedReport:0,outcome:'completed',note:'Fictional result'}),
  actor(101)+command('report.save',{id:s4,expected:1,expectedReport:0,outcome:'completed',note:'Fictional duplicate'}));
 assert.equal(result.first.code,0,result.first.output);assert.match(result.second.output,/GP_STALE_REPORT/);
 assert.equal(sql(`select count(*) from gp_private.reports where session_id='${s4}'`),'1');
 pass('two partners reporting together produce one result');

 // 5. Module access ends while a save is queued.
 result=await race(`select pg_advisory_xact_lock(741085);update app_private.module_access_grants set ended_at=clock_timestamp() where member_id='${mid(105)}' and module_id='${module}';`,
  actor(105)+command('availability.save',{expected:0,ranges:[]}));
 assert.equal(result.first.code,0,result.first.output);assert.match(result.second.output,/GP_DENIED/);
 assert.equal(sql(`select count(*) from gp_private.availability where member_id='${mid(105)}'`),'0');
 pass('queued save is denied after access is revoked');

 // 6. Leadership ends while a workspace read is queued: the draft is omitted, the published plan remains.
 result=await race(`select pg_advisory_xact_lock(741085);update app_private.role_assignments set ended_at=clock_timestamp() where member_id='${mid(109)}' and role_key='group_leader';`,
  actor(109)+`select public.gospel_planning_workspace('${week}')->'plan';`);
 assert.equal(result.first.code,0,result.first.output);assert.equal(result.second.code,0,result.second.output);
 const plan=JSON.parse(result.second.output.trim().split('\n').pop());
 assert.equal(plan.draft,null);assert.equal(plan.published.plan,'Fictional plan v1');
 pass('queued read after leadership ends omits the draft');

 // 7. Two first saves of the same group week: one creates it, the other is told to refresh.
 sql(`update app_private.role_assignments set ended_at=null where member_id='${mid(109)}' and role_key='group_leader'`);
 const nextWeek=mondayOf(vegasDay(11));
 result=await race(actor(109)+command('plan.save',{week:nextWeek,expected:0,review:'',plan:'Fictional first',nextAction:''}),
  actor(109)+command('plan.save',{week:nextWeek,expected:0,review:'',plan:'Fictional second',nextAction:''}));
 assert.equal(result.first.code,0,result.first.output);assert.match(result.second.output,/GP_STALE/);
 assert.equal(sql(`select plan from gp_private.plans where week='${nextWeek}'`),'Fictional first');
 pass('simultaneous first saves keep one plan and reject the other');

 // 8. A direct commitment write outside the serialized command is refused.
 const direct=await execAsync(`insert into gp_private.commitments select session_id,session_version,member_id,tstzrange(now()+interval '30 days',now()+interval '30 days 1 hour','[)') from gp_private.participants limit 1;`);
 assert.notEqual(direct.code,0);assert.match(direct.output,/GP_LOCK_REQUIRED/);
 pass('commitment writes require the shared serialization lock');

 // 9. The browser role cannot read private tables or the internal helpers.
 const denied=await execAsync(actor(109)+'select count(*) from gp_private.sessions;');
 assert.notEqual(denied.code,0);assert.match(denied.output,/permission denied/);
 pass('authenticated role cannot read private tables directly');

 console.log(`PASS: ${passes} Gospel Planning race and privilege checks. Disposable local PostgreSQL only.`);
}finally{
 if(started){try{run('pg_ctl',['-D',join(dir,'pg'),'-m','immediate','stop']);}catch{}}
 await rm(dir,{recursive:true,force:true});
}
