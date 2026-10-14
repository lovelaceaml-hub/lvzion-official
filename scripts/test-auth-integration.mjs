// Requires the pinned local Auth/PostgREST/SMTP stack. Never target a hosted URL.
import assert from 'node:assert/strict';import {request} from '@playwright/test';import {readFileSync,existsSync}from'node:fs';import {execFileSync}from'node:child_process';import {randomUUID}from'node:crypto';
const root=process.env.LVZ_INTEGRATION_DIR;if(root!=='/tmp/lvz-integration'||process.env.VERCEL)throw new Error('Local integration only.');
const base='http://127.0.0.1:3000';const credentials=JSON.parse(readFileSync(root+'/credentials.json'));const fixture=JSON.parse(readFileSync(root+'/fixtures.json'));
const contexts=[];let passes=0;
function check(label,condition){assert.equal(Boolean(condition),true,label);passes++;console.log('PASS: '+label);}
async function context(){const c=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});contexts.push(c);return c;}
async function post(c,path,data){const r=await c.post(path,{data});return{status:r.status(),data:await r.json(),headers:r.headers()};}
async function login(c,n,email=false){return post(c,'/api/auth/sign-in',{identifier:email?`test-${n}@example.invalid`:`demo_${n}`,password:fixture.password});}
async function workspace(c){const r=await c.get('/api/members');return{status:r.status(),data:await r.json()};}
async function command(c,action,payload){return post(c,'/api/members/command',{action,payload:{reason:'Verified synthetic integration operation',...payload},requestId:randomUUID()});}
const mid=n=>`44444444-4444-4444-8444-${String(n).padStart(12,'0')}`;
function mailCount(){return existsSync(root+'/outbox.ndjson')?readFileSync(root+'/outbox.ndjson','utf8').trim().split('\n').filter(Boolean).length:0;}
function lastLink(email){const messages=readFileSync(root+'/outbox.ndjson','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.recipient===email);const mime=messages.at(-1).mime;let text=mime.slice(mime.indexOf('\r\n\r\n')+4);if(/Content-Transfer-Encoding: base64/i.test(mime))text=Buffer.from(text.replace(/\s/g,''),'base64').toString();else text=text.replace(/=\r\n/g,'').replace(/=([0-9a-f]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));return new URL(text.match(/http:\/\/127\.0\.0\.1:3000\/auth\/continue#[^\s]+/)[0]);}
try{
 const anonymous=await context();const member=await context();const leader=await context();const pastor=await context();const tech=await context();
 check('anonymous member API denied',(await workspace(anonymous)).status===401);
 check('real username/password sign-in succeeds',(await login(member,107)).status===200);
 const cookies=(await member.storageState()).cookies;check('real session cookies are HttpOnly',cookies.length>0&&cookies.every(c=>c.httpOnly));
 let w=await workspace(member);check('real authenticated workspace returns own group',w.status===200&&w.data.directory.length===5&&!w.data.directory.some(p=>p.id===mid(103)));
 const response=await member.get('/api/members');check('authenticated response disables caching',response.headers()['cache-control'].includes('no-store'));
 check('real email/password sign-in succeeds',(await login(pastor,105,true)).status===200);
 check('unit leader sign-in succeeds',(await login(leader,101)).status===200);
 check('unit leader cross-unit write denied',(await command(leader,'member.rename',{memberId:mid(102),name:'Wrong Unit'})).status===403);
 check('unit leader authorized write succeeds',(await command(leader,'member.rename',{memberId:mid(107),name:'Gina Integration'})).status===200);
 const rejectedOrigin=await member.post('/api/members/command',{headers:{Origin:'https://untrusted.invalid'},data:{}});check('cross-origin write denied',rejectedOrigin.status()===400);
 check('unverified password reset denied',(await post(member,'/api/auth/password',{password:'Strong-test-password-Changed!',confirm:'Strong-test-password-Changed!'})).status===401);
 const bad=await post(anonymous,'/api/auth/sign-in',{identifier:'unknown_user',password:'wrong'});check('unknown login gets generic error',bad.status===401&&!JSON.stringify(bad.data).includes('not found'));
 const access=await post(anonymous,'/api/auth/access-request',{name:'Isla Example',email:'test-109@example.invalid',website:''});check('public access request accepted',access.status===200);
 await post(anonymous,'/api/auth/access-request',{name:'Isla Example',email:'TEST-109@EXAMPLE.INVALID'});
 w=await workspace(pastor);const reqs=w.data.onboarding.requests.filter(r=>r.email==='test-109@example.invalid');check('duplicate pending requests deduplicated',reqs.length===1);
 check('ordinary member cannot read requests',(await workspace(member)).data.onboarding.requests.length===0);
 check('unit leader cannot approve global intake',(await command(leader,'access.review',{id:reqs[0].id,memberId:mid(109),decision:'approved',verified:'yes'})).status===403);
 check('identity verification is required',(await command(pastor,'access.review',{id:reqs[0].id,memberId:mid(109),decision:'approved',verified:'no'})).status===409);
 check('authorized verified request approved',(await command(pastor,'access.review',{id:reqs[0].id,memberId:mid(109),decision:'approved',verified:'yes'})).status===200);
 const rid=randomUUID();const invite={memberId:mid(109),email:'test-109@example.invalid',reason:'Approved synthetic member activation',requestId:rid};const before=mailCount();
 let sent=await post(pastor,'/api/members/invitations',invite);check('authorized invitation accepted by actual SMTP sink',sent.status===200&&mailCount()===before+1);
 sent=await post(pastor,'/api/members/invitations',invite);check('invitation retry does not duplicate delivery',sent.status===200&&mailCount()===before+1);
 let link=lastLink('test-109@example.invalid');check('confirmation secrets are in fragment, not server query',link.search===''&&link.hash.includes('token_hash='));
 const newcomer=await context();let confirmed=await post(newcomer,'/api/auth/confirm',Object.fromEntries(new URLSearchParams(link.hash.slice(1))));check('actual Auth OTP verification succeeds',confirmed.status===200&&confirmed.data.next==='/activate');
 check('verified but unlinked identity cannot read members',(await workspace(newcomer)).status===401);
 const newPassword='Synthetic-new-Password-109!';let activated=await post(newcomer,'/api/auth/activate',{username:'isla_example',password:newPassword});check('activation links existing record',activated.status===200);
 w=await workspace(newcomer);check('activated member sees only own group',w.status===200&&w.data.self.id===mid(109)&&w.data.directory.length===5);
 check('invitation cookie is cleared',(await newcomer.storageState()).cookies.every(c=>c.name!=='lvz-invitation'));
 check('activation replay denied',(await post(newcomer,'/api/auth/activate',{username:'isla_second',password:newPassword})).status===400);
 check('sign-out works',(await post(newcomer,'/api/auth/sign-out',{})).status===200);
 check('signed-out cookie cannot access members',(await workspace(newcomer)).status===401);
 check('new username signs in with chosen password',(await post(newcomer,'/api/auth/sign-in',{identifier:'isla_example',password:newPassword})).status===200);
 const recovery=await context();const recoveryBefore=mailCount();const requestRecovery=await post(recovery,'/api/auth/recover',{identifier:'isla_example'});check('real recovery email accepted',requestRecovery.status===200&&mailCount()===recoveryBefore+1);
 link=lastLink('test-109@example.invalid');confirmed=await post(recovery,'/api/auth/confirm',Object.fromEntries(new URLSearchParams(link.hash.slice(1))));check('recovery OTP verifies and binds session',confirmed.status===200&&confirmed.data.next==='/reset-password');
 const reset='Synthetic-Reset-Password-109!';const updated=await post(recovery,'/api/auth/password',{password:reset,confirm:reset});check('verified recovery sets password and signs out',updated.status===200&&(await workspace(recovery)).status===401);
 check('old password no longer signs in',(await post(recovery,'/api/auth/sign-in',{identifier:'isla_example',password:newPassword})).status===401);
 check('new password signs in',(await post(recovery,'/api/auth/sign-in',{identifier:'isla_example',password:reset})).status===200);
 check('technical account sign-in succeeds',(await login(tech,104)).status===200);
 w=await workspace(tech);check('technical account directory excludes member names',w.data.onboarding.accounts.length===9&&w.data.onboarding.accounts.every(x=>!('name'in x))&&w.data.managedMembers.length===0);
 check('technical account suspension succeeds',(await command(tech,'account.access',{memberId:mid(109),enabled:'false'})).status===200);
 check('technical suspension revokes existing session',(await workspace(recovery)).status===401);
 check('pastoral reactivation cannot bypass technical suspension',(await command(pastor,'member.status',{memberId:mid(109),status:'active'})).status===200&&(await post(recovery,'/api/auth/sign-in',{identifier:'isla_example',password:reset})).status===401);
 check('technical enablement allows a fresh sign-in',(await command(tech,'account.access',{memberId:mid(109),enabled:'true'})).status===200&&(await post(recovery,'/api/auth/sign-in',{identifier:'isla_example',password:reset})).status===200);
 const r=await fetch('http://127.0.0.1:54321/rest/v1/rpc/bootstrap_foundation',{method:'POST',headers:{apikey:credentials.anon,Authorization:'Bearer '+credentials.anon,'Content-Type':'application/json'},body:JSON.stringify({p_auth_user_id:fixture.identities[105],p_name:'Example',p_username:'boot',p_category:'Demo',p_group:'Demo',p_unit:'Demo',p_roles:['member_administrator'],p_reason:'Unprivileged bootstrap attempt'})});check('bootstrap denied through anonymous REST role',!r.ok);
 console.log(`PASS: ${passes} real Auth/PostgREST/Next.js/SMTP integration assertions.`);
}catch(e){console.error('INTEGRATION FAILURE:',e.message);process.exitCode=1;}finally{await Promise.all(contexts.map(c=>c.dispose()));}
