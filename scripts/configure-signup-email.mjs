// Read credentials directly from personal Keychain; never print or save them.
import {execFileSync} from 'node:child_process';
import {signupEmailSettings,verifySignupEmailSettings} from '../lib/signup-email-template.ts';
let token;try{token=execFileSync('security',['find-generic-password','-s','Supabase CLI','-w'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Provider credential access unavailable.');}
const url='https://api.supabase.com/v1/projects/otecqlkqirncotytbfns/config/auth';
const update=await fetch(url,{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(signupEmailSettings())});
if(!update.ok)throw Error('Signup email configuration failed '+update.status);
const read=await fetch(url,{headers:{Authorization:'Bearer '+token}});if(!read.ok)throw Error('Signup email verification unavailable');const config=await read.json();
verifySignupEmailSettings(config);
console.log(JSON.stringify({signupTemplateVerified:true,crossBrowserConfirmation:true,emailConfirmationRequired:true,emailLimit:config.rate_limit_email_sent,passwordMinimum:config.password_min_length}));
