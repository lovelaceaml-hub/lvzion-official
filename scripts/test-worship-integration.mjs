// Real Auth, PostgREST and native PostgreSQL. Fixed disposable loopback stack only.
import {createClient} from '@supabase/supabase-js';
import {readFileSync,writeFileSync,openSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root='/tmp/lvz-worship-integration';
if(process.env.LVZ_WORSHIP_INTEGRATION!=='true'||process.env.VERCEL)throw new Error('Explicit isolated Worship integration required.');
const keys=JSON.parse(readFileSync(root+'/credentials.json','utf8')),fixture=JSON.parse(readFileSync(root+'/fixtures.json','utf8'));
const url='http://127.0.0.1:54321';
const client=key=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=client(keys.service),owner=client(keys.anon),member=client(keys.anon),second=client(keys.anon);
const sql=q=>execFileSync('psql',['-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-Atc',q],{encoding:'utf8'}).trim();
const ok=async promise=>{const r=await promise;assert.equal(r.error,null,r.error?.message);return r.data;};
const denied=async(promise,code)=>{const r=await promise;assert.equal(r.error?.code,code);};
let passes=0;const pass=label=>{passes++;console.log('PASS: '+label);};
const {email,password}=JSON.parse(readFileSync(root+'/worship-owner.json','utf8'));
await ok(owner.auth.signInWithPassword({email,password}));
await ok(owner.rpc('complete_self_service_enrollment',{p_name:'Fictional Worship Owner'}));
if(sql("select to_regprocedure('public.worship_batch(jsonb)') is null")==='t')for(const p of ['20261014224325_worship_duty_live_activation.sql','20261014224327_worship_duty_live_setup.sql','20261014230756_worship_duty_operations.sql'])execFileSync('psql',['-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-f','supabase/migrations/'+p],{stdio:'ignore'});
sql("notify pgrst,'reload schema'");
for(let attempt=0;attempt<20;attempt++){const r=await owner.rpc('worship_setup_workspace');if(!r.error)break;if(r.error.code!=='PGRST202')throw new Error('Local workspace unavailable');await new Promise(r=>setTimeout(r,100));}
const home=async()=>ok(owner.rpc('worship_setup_workspace'));
const setup=async c=>ok(owner.rpc('worship_setup_command',{p_command:c}));
const m='44444444-4444-4444-8444-000000000101',n='44444444-4444-4444-8444-000000000102';
await ok(member.auth.signInWithPassword({email:'test-101@example.invalid',password:fixture.password}));
await ok(second.auth.signInWithPassword({email:'test-102@example.invalid',password:fixture.password}));
await denied(member.rpc('worship_setup_workspace'),'42501');pass('real ordinary session cannot read owner setup');
const before=await home();assert.equal(before.services.length,0);pass('real Unassigned owner resolves explicit setup authority');
for(const id of [m,n]){
 await setup({op:'participation',memberId:id,department:'Usher Brothers',enabled:true,expectedVersion:(await home()).version});
 await setup({op:'access',memberId:id,enabled:true,expectedVersion:(await home()).version});
 for(const duty of ['usher_1','usher_2'])await setup({op:'qualify',memberId:id,dutyId:duty,enabled:true,expectedVersion:(await home()).version});
}
await setup({op:'manager',memberId:m,department:'Usher Brothers',enabled:true,expectedVersion:(await home()).version});
await setup({op:'create',worship:'Sabbath Day',period:'Morning',startsAt:new Date(Date.now()+7*86400000).toISOString(),endsAt:new Date(Date.now()+7*86400000+7200000).toISOString()});
const service=(await home()).services[0],id=service.id;
const batch=changes=>member.rpc('worship_batch',{p_command:{op:'batch',changes}});
await ok(batch([{serviceId:id,dutyId:'usher_1',memberId:m,expectedVersion:0},{serviceId:id,dutyId:'usher_2',memberId:n,expectedVersion:0}]));
await setup({op:'publish',serviceId:id,expectedVersion:1});
assert.equal(sql("select count(*) from app_private.module_activities where status='scheduled' and module_id=app_private.worship_module_id()"),'2');pass('draft batch persists and publication projects My Week activities');
await ok(batch([{serviceId:id,dutyId:'usher_1',memberId:n,expectedVersion:2},{serviceId:id,dutyId:'usher_2',memberId:m,expectedVersion:2}]));pass('legal two-person swap succeeds atomically');
await denied(batch([{serviceId:id,dutyId:'usher_1',memberId:m,expectedVersion:2}]),'40001');pass('a separate stale session cannot overwrite the new service version');
await denied(batch([{serviceId:id,dutyId:'usher_1',memberId:m,expectedVersion:3},{serviceId:id,dutyId:'usher_2',memberId:m,expectedVersion:3}]),'23514');
const schedule=await ok(member.rpc('worship_workspace_v2'));assert.equal(schedule.services[0].version,3);assert.equal(schedule.services[0].assignments.find(a=>a.dutyId==='usher_1').memberId,n);pass('invalid final combinations roll back all cells');
const bearer1=(await member.auth.getSession()).data.session.access_token,bearer2=(await owner.auth.getSession()).data.session.access_token;
async function direct(bearer,changes){const r=await fetch(url+'/rest/v1/rpc/worship_batch',{method:'POST',headers:{apikey:keys.anon,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify({p_command:{op:'batch',changes}})});const data=await r.json();return r.ok?'accepted':data.code;}
const outcomes=await Promise.all([direct(bearer1,[{serviceId:id,dutyId:'usher_1',memberId:n,expectedVersion:3}]),direct(bearer2,[{serviceId:id,dutyId:'usher_2',memberId:m,expectedVersion:3}])]);assert.deepEqual(outcomes.sort(),['40001','accepted']);assert.equal((await home()).services[0].version,4);pass('two concurrent real Auth sessions serialize; exactly one stale writer is rejected');
await setup({op:'song',code:'FIXTURE-01',title:'Fictional approved song',seconds:180,expectedVersion:(await home()).version});
const fresh=await home();const v=fresh.services[0].version;
await ok(owner.rpc('worship_command',{p_command:{op:'program',serviceId:id,expectedVersion:v,expectedProgramVersion:0,status:'confirmed',items:[{section:'glory',position:1,songId:fresh.songs[0].id}]}}));
await denied(owner.rpc('worship_setup_command',{p_command:{op:'song_update',songId:fresh.songs[0].id,code:'FIXTURE-01',title:'Changed history',seconds:180,active:true,expectedVersion:fresh.version}}),'23514');pass('catalog edits cannot rewrite used service-song history');
await setup({op:'move',serviceId:id,expectedVersion:v,worship:'Sabbath Day',period:'Morning',startsAt:new Date(Date.now()+8*86400000).toISOString(),endsAt:new Date(Date.now()+8*86400000+7200000).toISOString()});
assert.equal((await ok(owner.rpc('worship_workspace_v2'))).programs[0].status,'draft');pass('rescheduling persists and reopens the exact service plan for review');
// Restart only the Next process created by this isolated stack, using its local keys in memory.
const pid=Number(readFileSync(root+'/next.pid','utf8'));assert.ok(Number.isSafeInteger(pid)&&pid>1);process.kill(pid,'SIGTERM');await new Promise(r=>setTimeout(r,700));
const log=openSync(root+'/worship-next.log','a',0o600);
const env={...process.env,LVZ_WORSHIP_DUTY_ENABLED:'true',LVZ_MEMBER_SYSTEM_ENABLED:'true',LVZ_DATABASE_ENV:'local',LVZ_LOCAL_INTEGRATION:'true',LVZ_APP_ORIGIN:'http://127.0.0.1:3000',NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:keys.anon,SUPABASE_SECRET_KEY:keys.service,LVZ_RATE_LIMIT_SECRET:keys.rateSecret,LVZ_SELF_SERVICE_SIGNUP_ENABLED:'true',LVZ_EMAIL_DELIVERY_ENABLED:'true',LVZ_SMTP_HOST:'127.0.0.1',LVZ_SMTP_PORT:'1025',LVZ_SMTP_FROM:'test@example.invalid'};
const p=spawn('node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1'],{env,detached:true,stdio:['ignore',log,log]});p.unref();writeFileSync(root+'/next.pid',String(p.pid),{mode:0o600});
writeFileSync(root+'/worship-fixtures.json',JSON.stringify({email,password,serviceId:id,memberId:m,secondMemberId:n}),{mode:0o600});
console.log(`PASS: ${passes} native Worship integration checks. Fictional local records only.`);
