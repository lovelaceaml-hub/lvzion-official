import {createClient} from '@supabase/supabase-js';import {readFileSync,writeFileSync} from 'node:fs';import{execFileSync}from'node:child_process';import{randomBytes}from'node:crypto';
const dir=process.env.LVZ_INTEGRATION_DIR;if(dir!=='/tmp/lvz-worship-integration'||process.env.VERCEL)throw new Error('Disposable local fixtures only');
const keys=JSON.parse(readFileSync(dir+'/credentials.json'));const admin=createClient('http://127.0.0.1:54321',keys.service,{auth:{persistSession:false,autoRefreshToken:false}});
const ownerPassword='Fixture-'+randomBytes(20).toString('hex')+'!';
const own=await admin.auth.admin.createUser({email:'worship-owner@example.invalid',password:ownerPassword,email_confirm:true});if(own.error)throw own.error;
execFileSync('psql',['-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-c',"update app_private.enrollment_settings set enabled=true,allowed_email_domains=array['example.invalid'],owner_email='worship-owner@example.invalid'"],{stdio:'ignore'});
const owner=createClient('http://127.0.0.1:54321',keys.anon,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await owner.auth.signInWithPassword({email:'worship-owner@example.invalid',password:ownerPassword});if(login.error)throw login.error;
const enroll=await owner.rpc('complete_self_service_enrollment',{p_name:'Fictional Worship Owner'});if(enroll.error)throw enroll.error;
writeFileSync(dir+'/worship-owner.json',JSON.stringify({email:'worship-owner@example.invalid',password:ownerPassword}),{mode:0o600});
execFileSync('psql',['-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-f','supabase/seed/fictional_members.sql'],{stdio:'ignore'});
const password='Fixture-'+randomBytes(16).toString('hex')+'!';const identities={};
for(let n=101;n<=108;n++){let user_metadata;
 if(process.env.LVZ_SIGNUP_HOOK_INTEGRATION==='true'){const t=await admin.rpc('issue_signup_ticket',{p_email:`test-${n}@example.invalid`});if(t.error)throw new Error('Local signup ticket unavailable');user_metadata={lvz_signup_ticket:t.data};}
 const {data,error}=await admin.auth.admin.createUser({email:`test-${n}@example.invalid`,password,email_confirm:true,user_metadata});if(error)throw error;identities[n]=data.user.id;
 execFileSync('psql',['-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-c',`insert into app_private.account_links(member_id,auth_user_id,username) values('44444444-4444-4444-8444-${String(n).padStart(12,'0')}','${data.user.id}','demo_${n}')`],{stdio:'ignore'});}
writeFileSync(dir+'/fixtures.json',JSON.stringify({password,identities}),{mode:0o600});console.log('Created eight fictional Auth fixtures in loopback-only services.');
