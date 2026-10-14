// Real, disposable loopback Auth/PostgREST/Next.js/SMTP tests. No external email.
import assert from 'node:assert/strict';import {request} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
const root='/tmp/lvz-integration',base='http://127.0.0.1:3000';
if(process.env.LVZ_INTEGRATION_DIR!==root||process.env.VERCEL)throw new Error('Disposable local test stack required.');
const fixture=JSON.parse(readFileSync(root+'/fixtures.json')),keys=JSON.parse(readFileSync(root+'/credentials.json'));
const contexts=[];let passes=0;
const check=(label,value)=>{assert(value,label);passes++;console.log('PASS: '+label);};
const sql=q=>execFileSync('psql',['-h','/tmp','-p','55436','lvz_auth','-Atc',q],{encoding:'utf8'}).trim();
async function context(){const c=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});contexts.push(c);return c;}
async function post(c,path,data){const r=await c.post(path,{data});return{status:r.status(),data:await r.json(),headers:r.headers()};}
async function workspace(c){const r=await c.get('/api/members');return{status:r.status(),data:await r.json()};}
function messages(email){return existsSync(root+'/outbox.ndjson')?readFileSync(root+'/outbox.ndjson','utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(x=>x.recipient===email):[];}
async function token(email){for(let i=0;i<40;i++){const msg=messages(email).at(-1);if(msg){let text=msg.mime.slice(msg.mime.indexOf('\r\n\r\n')+4);if(/Content-Transfer-Encoding: base64/i.test(msg.mime))text=Buffer.from(text.replace(/\s/g,''),'base64').toString();else text=text.replace(/=\r\n/g,'').replace(/=([0-9a-f]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));const link=text.match(/http:\/\/127\.0\.0\.1:3000\/auth\/continue#[^\s"<>]+/)?.[0]?.replaceAll('&amp;','&');if(link)return Object.fromEntries(new URLSearchParams(new URL(link).hash.slice(1)));}await new Promise(r=>setTimeout(r,100));}throw new Error('Signup email was not captured by local sink.');}
try{
 if(process.env.LVZ_SIGNUP_HOOK_INTEGRATION==='true'){
  const r=await fetch('http://127.0.0.1:54321/auth/v1/signup',{method:'POST',headers:{apikey:keys.anon,'Content-Type':'application/json'},body:JSON.stringify({email:'hook-bypass@example.invalid',password:'Synthetic-Hook-Test-Password!',data:{role:'technical_admin'}})});
  check('real Auth hook rejects signup that bypasses app bot/rate checks',!r.ok);
  check('rejected direct signup creates no Auth identity',sql("select count(*) from auth.users where email='hook-bypass@example.invalid'")==='0');
 }
 let c=await context(),pastor=await context(),unit=await context(),declined=await context();
 const signup={firstName:'Jamie',lastName:'Integration',email:'signup-integration@example.invalid',password:'Synthetic-Signup-Password!'};
 const forged=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:'https://untrusted.example'}});contexts.push(forged);
 const before=sql('select count(*) from auth.users');
 await post(forged,'/api/auth/sign-up',signup);check('cross-origin signup never reaches Auth',sql('select count(*) from auth.users')===before);
 sql('update app_private.enrollment_settings set enabled=false');check('database activation switch blocks signup',(await post(c,'/api/auth/sign-up',signup)).status===503);sql('update app_private.enrollment_settings set enabled=true');
 let result=await post(c,'/api/auth/sign-up',signup);check('real email/password signup returns generic confirmation',result.status===200&&result.data.message.includes('confirmation email'));
  check('real signup saves the correctly joined first and last names in Auth metadata',sql("select raw_user_meta_data->>'display_name' from auth.users where email='signup-integration@example.invalid'")==='Jamie Integration');
 check('signup response is private and never cached',result.headers['cache-control'].includes('no-store'));
 check('unconfirmed signup cannot read workspace',(await workspace(c)).status===401);
 check('unconfirmed signup creates no member',sql("select count(*) from public.members where display_name='Jamie Integration'")==='0');
 const otp=await token(signup.email);check('local email uses explicit confirmation and fragment token',otp.type==='signup'&&!!otp.token_hash);
 const scanner=await c.get('/auth/continue#token_hash='+otp.token_hash+'&type=signup');check('email scanner GET cannot enroll',scanner.ok()&&sql("select count(*) from public.members where display_name='Jamie Integration'")==='0');
 c=await context();check('email confirmation succeeds without the signup browser cookies',(await c.storageState()).cookies.length===0);
 const confirmation=await post(c,'/api/auth/confirm',otp);check('real signup OTP creates Unassigned profile',confirmation.status===200&&confirmation.data.next==='/members');
 let w=await workspace(c);check('own profile has intake status and null placement',w.status===200&&w.data.self.status==='intake'&&w.data.self.groupId===null&&w.data.self.unitId===null);
 const mid=w.data.self.id;check('Unassigned cannot enumerate groups or member directory',w.data.groups.length===0&&w.data.directory.length===0&&w.data.unassignedMembers.length===0);
 check('Unassigned owns only their verified contact',w.data.contacts.email===signup.email);
 check('real Auth session cookies are HttpOnly',(await c.storageState()).cookies.every(x=>x.httpOnly));
 const modules=await c.get('/api/members/experience');check('Unassigned module feed denied',!modules.ok());
 const replay=await post(c,'/api/auth/confirm',otp);check('signup token cannot be consumed twice',replay.status!==200);
 await post(c,'/api/auth/sign-out',{});result=await post(c,'/api/auth/sign-in',{identifier:signup.email,password:signup.password});check('Unassigned can sign in again by email',result.status===200);
 const duplicate=await post(c,'/api/auth/sign-up',signup);check('duplicate email receives same generic signup message',duplicate.status===200&&duplicate.data.message===resultGeneric());
 check('duplicate signup cannot create another membership',sql("select count(*) from public.members where display_name='Jamie Integration'")==='1');
 await post(unit,'/api/auth/sign-in',{identifier:'demo_101',password:fixture.password});check('unit leader sees no Unassigned queue',(await workspace(unit)).data.unassignedMembers.length===0);
 const payload={memberId:mid,unitId:'33333333-3333-4333-8333-000000000001',verified:'yes',reason:'Independently verified synthetic member'};
 const command=(ctx,action,p,requestId=randomUUID())=>post(ctx,'/api/members/command',{action,payload:p,requestId});
 check('unit leader cannot claim signup',(await command(unit,'enrollment.assign',payload)).status===403);
 await post(pastor,'/api/auth/sign-in',{identifier:'demo_105',password:fixture.password});check('pastoral leader sees pending signup',(await workspace(pastor)).data.unassignedMembers.some(x=>x.id===mid));
 check('assignment refuses unverified identity',(await command(pastor,'enrollment.assign',{...payload,verified:'no'})).status===409);
 const rid=randomUUID();const decisions=await Promise.all(Array.from({length:5},()=>command(pastor,'enrollment.assign',payload,rid)));check('concurrent initial assignment retries succeed',decisions.every(x=>x.status===200));
 check('concurrent assignment inserts one placement',sql("select count(*) from public.member_placements where member_id='"+mid+"'")==='1');
 check('concurrent assignment inserts one audit event',sql("select count(*) from app_private.audit_events where operation='enrollment.assign' and target_member_id='"+mid+"'")==='1');
 w=await workspace(c);check('existing session sees authorized assignment and history',w.data.self.status==='active'&&w.data.self.unitId===payload.unitId&&w.data.enrollment.placementHistory.length===1);
 check('assignment grants no leadership',Object.values(w.data.permissions).every(x=>x===false));
 check('stale rejection cannot undo placement',(await command(pastor,'enrollment.reject',{memberId:mid,reason:'Stale rejection attempt'})).status===409);
 const declinedSignup={...signup,firstName:'Declined',lastName:'Integration',email:'declined-integration@example.invalid'};await post(declined,'/api/auth/sign-up',declinedSignup);await post(declined,'/api/auth/confirm',await token(declinedSignup.email));const pending=(await workspace(declined)).data.self.id;
 check('decline command records decision',(await command(pastor,'enrollment.reject',{memberId:pending,reason:'Verified synthetic duplicate signup'})).status===200);
 check('declined session immediately loses access',(await workspace(declined)).status===401);
 check('declined signup cannot sign in',(await post(declined,'/api/auth/sign-in',{identifier:declinedSignup.email,password:signup.password})).status===401);
 check('no automatic roles created for signup',sql("select count(*) from app_private.role_assignments where member_id='"+mid+"'")==='0');
 const orphan=await context(),recoveryBrowser=await context();const orphanSignup={...signup,email:'confirmed-unlinked@example.invalid',firstName:'Confirmed',lastName:'Unlinked Example'};
 await post(orphan,'/api/auth/sign-up',orphanSignup);const orphanOtp=await token(orphanSignup.email);
 const orphanRedirect=await fetch('http://127.0.0.1:54321/auth/v1/verify?'+new URLSearchParams({token:orphanOtp.token_hash,type:'signup',redirect_to:base+'/signup/confirm'}),{headers:{apikey:keys.anon},redirect:'manual'});
 const orphanLocation=orphanRedirect.headers.get('location');const orphanCode=orphanLocation?new URL(orphanLocation).searchParams.get('code'):null;
 const lostCookie=await post(recoveryBrowser,'/api/auth/signup-confirm',{code:orphanCode});check('wrong-browser PKCE failure provides the sign-in recovery path',lostCookie.status===400&&lostCookie.data.next==='/sign-in');
 check('failed PKCE exchange creates no membership',sql("select count(*) from public.members where display_name='Confirmed Unlinked Example'")==='0');
 const repair=await post(recoveryBrowser,'/api/auth/sign-in',{identifier:orphanSignup.email,password:orphanSignup.password});check('password sign-in finishes a confirmed but unlinked profile',repair.status===200);
 const repaired=await workspace(recoveryBrowser);check('repaired profile stays Unassigned and cannot enumerate groups',repaired.data.self.status==='intake'&&repaired.data.groups.length===0&&Object.values(repaired.data.permissions).every(x=>x===false));
 const pkce=await context();const pkceSignup={...signup,email:'pkce-integration@example.invalid',firstName:'PKCE',lastName:'Example'};
 await post(pkce,'/api/auth/sign-up',pkceSignup);const pkceOtp=await token(pkceSignup.email);
 const redirect=await fetch('http://127.0.0.1:54321/auth/v1/verify?'+new URLSearchParams({token:pkceOtp.token_hash,type:'signup',redirect_to:base+'/signup/confirm'}),{headers:{apikey:keys.anon},redirect:'manual'});
 const next=redirect.headers.get('location');const code=next?new URL(next).searchParams.get('code'):null;
 check('real Auth PKCE confirmation issues a code bound to signup browser',!!code);
 check('PKCE redirect GET still creates no member',sql("select count(*) from public.members where display_name='PKCE Example'")==='0');
 const finished=await post(pkce,'/api/auth/signup-confirm',{code});check('explicit PKCE confirmation completes Unassigned enrollment',finished.status===200&&(await workspace(pkce)).data.self.status==='intake');
 check('PKCE code replay is rejected',(await post(pkce,'/api/auth/signup-confirm',{code})).status!==200);
 sql('delete from app_private.auth_attempt_buckets');const rate=await context();let last;for(let i=0;i<12;i++)last=await post(rate,'/api/auth/sign-up',{...signup,email:'rate-probe@example.invalid'});check('abuse bucket blocks excess signup attempts without revealing identity',Number(sql("select max(attempts) from app_private.auth_attempt_buckets"))===12&&last.status===200&&messages('rate-probe@example.invalid').length<=10);
 console.log(`PASS: ${passes} real local signup/Auth/PostgREST/Next.js/SMTP assertions.`);
}catch(e){console.error('SIGNUP INTEGRATION FAILURE: '+e.message);process.exitCode=1;}finally{await Promise.all(contexts.map(c=>c.dispose()));}
function resultGeneric(){return 'If this address is eligible, a confirmation email will arrive. Confirm it to create your Unassigned profile. If you already have an account, sign in or recover your password.';}
