import {createClient} from '@supabase/supabase-js';import {readFileSync,writeFileSync} from 'node:fs';import{execFileSync}from'node:child_process';import{randomBytes}from'node:crypto';
const dir=process.env.LVZ_INTEGRATION_DIR;if(dir!=='/tmp/lvz-integration'||process.env.VERCEL)throw new Error('Disposable local fixtures only');
const keys=JSON.parse(readFileSync(dir+'/credentials.json'));const admin=createClient('http://127.0.0.1:54321',keys.service,{auth:{persistSession:false,autoRefreshToken:false}});
const password='Fixture-'+randomBytes(16).toString('hex')+'!';const identities={};
for(let n=101;n<=108;n++){const {data,error}=await admin.auth.admin.createUser({email:`test-${n}@example.invalid`,password,email_confirm:true});if(error)throw error;identities[n]=data.user.id;
 execFileSync('psql',['-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-c',`insert into app_private.account_links(member_id,auth_user_id,username) values('44444444-4444-4444-8444-${String(n).padStart(12,'0')}','${data.user.id}','demo_${n}')`],{stdio:'ignore'});}
writeFileSync(dir+'/fixtures.json',JSON.stringify({password,identities}),{mode:0o600});console.log('Created eight fictional Auth fixtures in loopback-only services.');
