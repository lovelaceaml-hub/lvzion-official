import test from 'node:test';import assert from 'node:assert/strict';
import {parseSignup,signupSettings,allowedSignupEmail,loginCaptcha} from '../lib/signup.ts';
import {unassignedPreview,enrollmentLeaderPreview,applyEnrollmentPreview} from '../lib/enrollment-demo.ts';
import {parseCommand} from '../lib/contracts.ts';
const local={LVZ_MEMBER_SYSTEM_ENABLED:'true',LVZ_DATABASE_ENV:'local',LVZ_LOCAL_INTEGRATION:'true',LVZ_APP_ORIGIN:'http://127.0.0.1:3000',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test',LVZ_SELF_SERVICE_SIGNUP_ENABLED:'true'};
const input={firstName:'  Jamie  ',lastName:'  Example  ',email:'JAMIE@EXAMPLE.INVALID',password:'Synthetic long password'};
test('signup requires distinct names and preserves their correct display order',()=>{
 const p=parseSignup(input);
 assert.deepEqual({firstName:p.firstName,lastName:p.lastName,name:p.name,email:p.email},{firstName:'Jamie',lastName:'Example',name:'Jamie Example',email:'jamie@example.invalid'});
 assert.deepEqual({firstName:parseSignup({...input,firstName:'  María-José ',lastName:" de la Cruz "}).firstName,lastName:parseSignup({...input,firstName:'  María-José ',lastName:" de la Cruz "}).lastName},{firstName:'María-José',lastName:'de la Cruz'});
 assert.equal(parseSignup({...input,firstName:'김',lastName:'예시'}).name,'김 예시');
});
test('signup accepts six-character passwords and rejects five',()=>{
 assert.equal(parseSignup({...input,password:'xxxxxx'}).password.length,6);
 assert.throws(()=>parseSignup({...input,password:'xxxxx'}));
});
test('signup rejects omitted, blank, or malformed first/last names and invalid credentials',()=>{
 for(const p of [
  {...input,firstName:undefined},{...input,lastName:undefined},
  {...input,firstName:' '},{...input,lastName:' \t '},
  {...input,firstName:'1234'},{...input,lastName:'<script>'},
  {...input,firstName:'x'.repeat(81)},{...input,lastName:'x'.repeat(81)},
  {...input,firstName:'x'.repeat(60),lastName:'y'.repeat(61)},
  {...input,email:'username'},{...input,password:'short'},
  {...input,password:'x'.repeat(129)},{...input,captchaToken:42}
 ])assert.throws(()=>parseSignup(p));
});
test('signup stays disabled by default and cannot use known hosted backend',()=>{assert.throws(()=>signupSettings({...local,LVZ_SELF_SERVICE_SIGNUP_ENABLED:'false'}));assert.throws(()=>signupSettings({...local,LVZ_DATABASE_ENV:'isolated',LVZ_SUPABASE_EXPECTED_REF:'otecqlkqirncotytbfns',NEXT_PUBLIC_SUPABASE_URL:'https://otecqlkqirncotytbfns.supabase.co',LVZ_APP_ORIGIN:'https://review.example'}));});
test('isolated signup requires verified delivery, CAPTCHA and recipient restrictions',()=>{const isolated={...local,LVZ_DATABASE_ENV:'isolated',LVZ_SUPABASE_EXPECTED_REF:'testref',NEXT_PUBLIC_SUPABASE_URL:'https://testref.supabase.co',LVZ_APP_ORIGIN:'https://review.example'};assert.throws(()=>signupSettings(isolated));assert.equal(signupSettings({...isolated,LVZ_SIGNUP_DELIVERY_VERIFIED:'true',LVZ_SIGNUP_CAPTCHA_VERIFIED:'true',NEXT_PUBLIC_LVZ_HCAPTCHA_SITE_KEY:'test-public-site',LVZ_TEST_EMAIL_ALLOWLIST:'tester@example.invalid'}).local,false);});
test('local signup cannot send mail to real addresses',()=>{assert.equal(allowedSignupEmail('tester@example.com',local,true),false);assert.equal(allowedSignupEmail('tester@example.invalid',local,true),true);});
test('isolated signup only permits exact normalized test recipients',()=>{const env={LVZ_TEST_EMAIL_ALLOWLIST:'TESTER@EXAMPLE.INVALID'};assert.equal(allowedSignupEmail('tester@example.invalid',env,false),true);assert.equal(allowedSignupEmail('tester2@example.invalid',env,false),false);});
test('unassigned preview has no organizational or directory information',()=>{const w=unassignedPreview();assert.equal(w.self.groupId,null);assert.equal(w.self.unitId,null);for(const k of ['directory','managedMembers','categories','groups','units','departments','appointments','transfers','unassignedMembers'] as const)assert.equal(w[k]?.length,0);assert.ok(Object.values(w.permissions).every(x=>x===false));});
test('assignment command accepts identity verification but cannot inject authorization',()=>{const p={action:'enrollment.assign',requestId:crypto.randomUUID(),payload:{memberId:unassignedPreview().self.id,unitId:enrollmentLeaderPreview().units[0].id,verified:'yes',reason:'Independently verified member'}};assert.equal(parseCommand(p).action,'enrollment.assign');assert.throws(()=>parseCommand({...p,payload:{...p.payload,admin:'true'}}));});
test('fictional leader assignment requires verification and audited reason',()=>{const w=enrollmentLeaderPreview(),p={action:'enrollment.assign' as const,requestId:crypto.randomUUID(),payload:{memberId:unassignedPreview().self.id,unitId:w.units[0].id,verified:'no',reason:'Verified fictional placement'}};assert.throws(()=>applyEnrollmentPreview(w,p));assert.equal(applyEnrollmentPreview(w,{...p,payload:{...p.payload,verified:'yes'}}).unassignedMembers?.length,0);assert.throws(()=>applyEnrollmentPreview(unassignedPreview(),p));});

test('CAPTCHA-enabled sign-in requires a bounded provider token',()=>{assert.throws(()=>loginCaptcha(undefined,true));assert.throws(()=>loginCaptcha('x'.repeat(4097),true));assert.equal(loginCaptcha('synthetic-provider-token',true),'synthetic-provider-token');assert.equal(loginCaptcha(undefined,false),undefined);});
