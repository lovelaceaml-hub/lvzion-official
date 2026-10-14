import {normalizeIdentifier} from './contracts.ts';
import {resolveSettings} from './runtime-config.ts';
export const signupMessage='If this address is eligible, a confirmation email will arrive. Confirm it to create your Unassigned profile. If you already have an account, sign in or recover your password.';
export function signupSettings(env:Record<string,string|undefined>){
 const c=resolveSettings(env);
 if(env.LVZ_SELF_SERVICE_SIGNUP_ENABLED!=='true')throw new Error('Signup is not activated.');
 if(c.production){if(env.LVZ_SIGNUP_DELIVERY_VERIFIED!=='true'||env.LVZ_BOT_PROTECTION_ENABLED!=='true')throw new Error('Production signup delivery and bot protection required.');}
 else if(!c.local && (env.LVZ_SIGNUP_DELIVERY_VERIFIED!=='true'||env.LVZ_SIGNUP_CAPTCHA_VERIFIED!=='true'||!env.NEXT_PUBLIC_LVZ_HCAPTCHA_SITE_KEY||!env.LVZ_TEST_EMAIL_ALLOWLIST))throw new Error('Verified isolated signup configuration required.');
 return c;
}
export function parseSignup(input:Record<string,unknown>){
 const email=normalizeIdentifier(input.email);
 if(!email.includes('@')||typeof input.name!=='string'||input.name.trim().length<2||input.name.trim().length>120||typeof input.password!=='string'||input.password.length<12||input.password.length>128)throw new Error('Invalid signup.');
 if(input.captchaToken!==undefined&&(typeof input.captchaToken!=='string'||input.captchaToken.length>4096))throw new Error('Invalid verification.');
 return {email,name:input.name.trim(),password:input.password,captchaToken:input.captchaToken as string|undefined};
}
export function allowedSignupEmail(email:string,env:Record<string,string|undefined>,local:boolean){
 if(env.LVZ_DATABASE_ENV==='production')return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
 return local?email.endsWith('@example.invalid'):!!env.LVZ_TEST_EMAIL_ALLOWLIST?.toLowerCase().split(',').map(s=>s.trim()).includes(email);
}

export function loginCaptcha(input:unknown,required:boolean){
 if(input!==undefined&&(typeof input!=='string'||input.length>4096))throw new Error('Invalid verification.');
 if(required&&(typeof input!=='string'||!input))throw new Error('Verification required.');
 return typeof input==='string'?input:undefined;
}
