/** Disposable, loopback-only PostgreSQL verification. Never targets hosted Supabase.
 * STUDY_TEST_DATABASE_URL=postgresql://user@127.0.0.1:55439/lvz_study_test_r3 node scripts/test-study-bundles-native.mjs
 * The database must be empty. Creates fictional data; retains it for inspection/restore verification.
 */
import{readFile,readdir,mkdtemp,writeFile}from'node:fs/promises';
import{tmpdir}from'node:os';import{join}from'node:path';import{spawn}from'node:child_process';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';
const url=process.env.STUDY_TEST_DATABASE_URL;if(!url)throw Error('Set STUDY_TEST_DATABASE_URL to an EMPTY disposable loopback PostgreSQL database.');
const target=new URL(url);if(!['127.0.0.1','localhost','[::1]'].includes(target.hostname)||!target.pathname.startsWith('/lvz_study_test_'))throw Error('Refusing a non-disposable or non-loopback database.');
const evidence=await mkdtemp(join(tmpdir(),'lvz-study-r3-'));
function exec(command,args,input=''){return new Promise(resolve=>{const child=spawn(command,args,{stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.on('error',e=>resolve({code:-1,out,err:e.message}));child.on('close',code=>resolve({code,out,err}));child.stdin.end(input);});}
const sql=text=>exec('psql',[url,'-X','-v','ON_ERROR_STOP=1','-At'],"\\set VERBOSITY verbose\n"+text);
async function ok(text,label){const result=await sql(text);if(result.code!==0)throw Error(label+': '+result.err);return result;}
const existing=await ok("select count(*) from pg_namespace where nspname='app_private';",'empty database check');assert.equal(existing.out.trim(),'0','Refusing to initialize an existing application database.');
const migrations=(await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort().map(x=>'supabase/migrations/'+x);
for(const path of ['supabase/tests/bootstrap.sql',...migrations,'supabase/tests/onboarding_bootstrap.sql','supabase/seed/fictional_members.sql'])await ok(await readFile(path,'utf8'),path);
const results={environment:'disposable native PostgreSQL, loopback only',databaseAssertions:{},concurrency:[],backupRestore:false};
for(const path of ['member_foundation','onboarding_permissions','module_runtime','study_rooms','study_room_changes','study_room_bundles']){
 const result=await ok(await readFile('supabase/tests/'+path+'.sql','utf8'),path);
 const count=(result.err.match(/(?:STUDY )?PASS:/g)||[]).length;results.databaseAssertions[path]=count;console.log(path+': '+count+' SQL assertions passed');await writeFile(join(evidence,path+'.log'),result.out+result.err);
}
// Retain only fictional setup from the rollback fixture. Temporary helpers are not needed for the race sessions.
const fixture=await readFile('supabase/tests/study_room_bundles.sql','utf8');const setup=fixture.slice(0,fixture.indexOf('select pg_temp.login(107);set local role authenticated;'));
await ok(setup+'\ncommit;','race fixture');
function identity(n){return `set local request.jwt.claim.sub='99999999-9999-4999-8999-${String(n).padStart(12,'0')}';set local request.jwt.claims='{"session_id":"aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}"}';set local role authenticated;`;}
const tomorrow=(await ok("select ((now() at time zone 'America/Los_Angeles')::date+1)::text;",'date')).out.trim();
const rid=n=>'92000000-0000-4000-8000-'+String(n).padStart(12,'0');
const command=(ids,start=780,end=840)=>({requestId:randomUUID(),action:'reserve',resourceIds:ids.map(rid),day:tomorrow,start,end,purpose:'contact',detail:'Fictional native contact'});
const rpc=c=>`select public.study_room_command('${JSON.stringify(c).replaceAll("'","''")}'::jsonb);`;
const admin=c=>`select public.study_room_admin('${JSON.stringify(c).replaceAll("'","''")}'::jsonb);`;
async function race(label,left,right,expectedError){
 const pair=await Promise.all([sql('begin;'+identity(left.actor)+left.statement+'select pg_sleep(0.15);commit;'),sql('begin;'+identity(right.actor)+right.statement+'select pg_sleep(0.15);commit;')]);
 assert.equal(pair.filter(x=>x.code===0).length,1,label+' must have exactly one winner');
 assert(pair.some(x=>x.err.includes(expectedError)),label+' must reject loser with '+expectedError);
 results.concurrency.push(label);await writeFile(join(evidence,'race-'+results.concurrency.length+'.log'),JSON.stringify(pair,null,2));console.log('PASS: '+label);return pair;
}
const a=command([1,11,21]),b=command([2,11,22]);
const competing=await race('shared accessory booking contention',{actor:107,statement:rpc(a)},{actor:103,statement:rpc(b)},'23505');
let winner=JSON.parse(competing.find(x=>x.code===0).out.split('\n').find(x=>x.startsWith('{')));let owner=competing[0].code===0?107:103;
assert.equal((await ok('select count(*) from app_private.study_bookings;','one booking')).out.trim(),'1');
assert.equal((await ok('select count(*) from app_private.study_slots;','six slots')).out.trim(),'6');
const bookingId=winner.bookingId;
const move=ids=>({...command(ids),action:'reschedule',bookingId,expectedVersion:1,reason:'Fictional concurrent reschedule'});
await race('concurrent bundle rescheduling rejects stale editor',{actor:owner,statement:rpc(move([3,13,23]))},{actor:owner,statement:rpc(move([4,14,22]))},'40001');
assert.equal((await ok('select count(*) from app_private.study_bookings;','same identity')).out.trim(),'1');
assert.equal((await ok('select count(*) from app_private.study_slots;','no partial reschedule')).out.trim(),'6');
// Free all current claims before independent closure contention, retaining history.
await ok('begin;'+identity(owner)+rpc({requestId:randomUUID(),action:'cancel',bookingId,expectedVersion:2,reason:'Reset fictional contention slot'})+'commit;','cancel bundle');
await race('resource closure versus atomic bundle creation',{actor:101,statement:admin({requestId:randomUUID(),action:'closure.add',resourceId:rid(15),day:tomorrow,start:780,end:840,reason:'Fictional competing closure'})},{actor:107,statement:rpc(command([1,15,21]))},'23505');
const impossible=await ok(`select count(*) from app_private.study_closures c join app_private.study_slots s on s.resource_id=c.resource_id and s.book_day=c.book_day and s.minute>=c.start_min and s.minute<c.end_min where c.active;`,'no evicted reservations');assert.equal(impossible.out.trim(),'0');
await ok('set constraints all immediate;','deferred constraints');
const dump=join(evidence,'fictional.dump');const dumped=await exec('pg_dump',['--format=custom','--file='+dump,url]);assert.equal(dumped.code,0,dumped.err);
const restored=new URL(url);restored.pathname=target.pathname+'_restore';
const created=await exec('createdb',['--maintenance-db='+url,restored.pathname.slice(1)]);assert.equal(created.code,0,created.err);
const restore=await exec('pg_restore',['--exit-on-error','--dbname='+restored.toString(),dump]);assert.equal(restore.code,0,restore.err);
const fingerprint="select jsonb_build_object('bookings',(select count(*) from app_private.study_bookings),'memberships',(select count(*) from app_private.study_booking_resources),'slots',(select count(*) from app_private.study_slots),'receipts',(select count(*) from app_private.study_request_receipts),'history',(select count(*) from app_private.study_change_history),'rls',(select relrowsecurity from pg_class where oid='app_private.study_booking_resources'::regclass),'anonymousHistoryDenied',not has_function_privilege('anon','public.study_room_history(date,date,integer,boolean)','execute'));";
const original=await ok(fingerprint,'backup fingerprint');const restoredPrint=await exec('psql',[restored.toString(),'-X','-v','ON_ERROR_STOP=1','-At'],fingerprint);assert.equal(restoredPrint.code,0,restoredPrint.err);assert.equal(restoredPrint.out,original.out,'restored data/permissions differ');results.backupRestore=true;
await writeFile(join(evidence,'summary.json'),JSON.stringify(results,null,2));console.log('PASS: native dump/restore preserves bookings, memberships, slots, receipts, history and access controls');console.log(JSON.stringify(results));console.log('Evidence directory: '+evidence);
