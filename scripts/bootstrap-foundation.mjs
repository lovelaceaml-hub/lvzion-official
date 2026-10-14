// One-time operator tool. This is intentionally not exposed as a web endpoint.
import {createClient}from'@supabase/supabase-js';import{readFile}from'node:fs/promises';
import {resolveSettings}from'../lib/runtime-config.ts';
try{
 const cfg=resolveSettings(process.env);const path=process.argv[2];
 if(!path||process.env.LVZ_BOOTSTRAP_ACK!=='I verified the owner and this empty isolated environment')throw new Error('Provide an input JSON file and the documented explicit bootstrap acknowledgement.');
 if(!cfg.secret)throw new Error('Configure the isolated server secret in the operator environment.');
 const input=JSON.parse(await readFile(path,'utf8'));
 if(!/^[0-9a-f-]{36}$/i.test(input.authUserId)||!Array.isArray(input.roles)||!input.roles.includes('member_administrator')||input.roles.some(r=>!['member_administrator','technical_admin','department_administrator'].includes(r)))throw new Error('Provide one verified Auth user and an explicit allowed role list.');
 for(const key of ['name','username','category','group','unit','reason'])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>500)throw new Error('Complete each required bootstrap field.');
 const admin=createClient(cfg.url,cfg.secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const verified=await admin.auth.admin.getUserById(input.authUserId);if(verified.error||!verified.data.user?.email_confirmed_at)throw new Error('The Auth identity must have its personal email verified first.');
 const r=await admin.rpc('bootstrap_foundation',{p_auth_user_id:input.authUserId,p_name:input.name,p_username:input.username,p_category:input.category,p_group:input.group,p_unit:input.unit,p_roles:input.roles,p_reason:input.reason});
 if(r.error)throw new Error('Bootstrap rejected. Confirm the foundation is empty and the identity/configuration is correct. No automatic retry is performed.');
 console.log('Foundation initialized and audited. Disable the bootstrap acknowledgement and remove this input file from the operator workspace.');
}catch(e){console.error(e.message);process.exitCode=1;}
