// Reproducible Linux x64 or Mac arm64 test stack. Loopback only; never a hosted Supabase target.
import {mkdir,writeFile,readFile,access,copyFile,readdir} from 'node:fs/promises';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {spawn,execFileSync} from 'node:child_process';import {randomBytes,createHmac,createHash}from'node:crypto';import {userInfo}from'node:os';
const dir='/tmp/lvz-integration',cwd=process.cwd(),pids=[];
if(!((process.platform==='linux'&&process.arch==='x64')||(process.platform==='darwin'&&process.arch==='arm64'))||process.env.VERCEL||process.getuid?.()===0)throw new Error('Run as a non-root Linux x64 or Mac arm64 user, outside Vercel deployment runtime.');
const archiveDir=process.env.LVZ_INTEGRATION_ARCHIVE_DIR;
const programs=['initdb','pg_ctl','createdb','psql','python3'];
if(!archiveDir)programs.push('curl');
for(const binary of programs)execFileSync('which',[binary],{stdio:'ignore'});
try{await access(dir);throw new Error('Test directory already exists. Stop the previous stack and move the directory before starting a fresh run.');}catch(e){if(e.code!=='ENOENT')throw e;}
// Do not send a fixture or a readiness probe to somebody else's local service.
for(const port of [54321,1025,55436,9999,3001,3000]){
 const probe=createServer();
 probe.listen(port,'127.0.0.1');
 try{await once(probe,'listening');}
 catch{throw new Error('Required loopback port unavailable: '+port);}
 await new Promise(resolve=>probe.close(resolve));
}
await mkdir(dir,{mode:0o700});await mkdir(dir+'/bin');
function run(bin,args,options={}){
 try{return execFileSync(bin,args,{cwd,stdio:'pipe',timeout:120000,...options});}
 catch(error){
  // Child output and arguments can contain tokens, SQL values or mail.
  const index=args.indexOf('-f');
  const stage=bin==='psql' && index>=0 && args[index+1]!=='-' ? args[index+1] : bin.split('/').pop();
  const code=error.stderr?.toString().match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1];
  throw new Error(stage+' failed'+(code?' (SQLSTATE '+code+')':''));
 }
}
async function background(name,bin,args,env=process.env,workdir=cwd){
 const child=spawn(bin,args,{cwd:workdir,env,detached:true,stdio:'ignore'});
 await once(child,'spawn');
 pids.push(child.pid);
 await writeFile(dir+'/'+name+'.pid',String(child.pid),{mode:0o600});
 child.unref();
}
async function wait(url){for(let n=0;n<40;n++){try{const r=await fetch(url);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error('Local service did not start: '+url);}
try{
 const releases=process.platform==='darwin'?[
  ['auth','https://github.com/supabase/auth/releases/download/v2.197.0/auth-v2.197.0-darwin-arm64.tar.gz','3fb7998e7061e2c14f3f9555b1d94d447358c965395728e0d81eac82e0e5868b'],
  ['postgrest','https://github.com/PostgREST/postgrest/releases/download/v16.4/postgrest-v16.4-macos-aarch64.tar.xz','5720fbde4a19ade9fb189791615c84beb9f0e58201b1b6d17fe3b698faf60776']
 ]:[
  ['auth','https://github.com/supabase/auth/releases/download/v2.197.0/auth-v2.197.0-amd64.tar.xz','b5c2991d1df760c9b099c1c2395a94bd1c2f83ed58901934921997179dc9f7ea'],
  ['postgrest','https://github.com/PostgREST/postgrest/releases/download/v16.4/postgrest-v16.4-linux-static-x86-64.tar.xz','b47ecc82fce1dcebbbc4183d839e52f07f7630c9d7ad0f54db753d1939299354']
 ];
 for(const [name,url,hash] of releases){
  const path=dir+'/'+name+'.tar.xz';
  if(archiveDir)await copyFile(archiveDir+'/'+name+'.txz',path);
  else run('curl',['-fLsS','--max-time','90',url,'-o',path]);
  if(createHash('sha256').update(await readFile(path)).digest('hex')!==hash)throw new Error('Archive checksum mismatch: '+name);
  run('python3',['-c',"import tarfile,sys; t=tarfile.open(sys.argv[1]); t.extractall(sys.argv[2],filter='data')",path,dir+'/bin']);
 }
 run('initdb',['-D',dir+'/pg','-A','trust','--no-instructions']);run('pg_ctl',['-D',dir+'/pg','-l','/dev/null','-o','-k /tmp -p 55436 -c listen_addresses=127.0.0.1','start']);run('createdb',['-h','/tmp','-p','55436','lvz_auth']);
 const dbUser=userInfo().username;const userSql='"'+dbUser.replaceAll('"','""')+'"';
 const psql=(query)=>run('psql',['-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-c',query]);
 psql('create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create role authenticator login;grant anon,authenticated,service_role to authenticator;create role postgres superuser login;create role supabase_auth_admin nologin;create schema auth;');
 const secret=randomBytes(32).toString('hex');const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 function token(role){const value=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+7200});return value+'.'+createHmac('sha256',secret).update(value).digest('base64url');}
 const keys={anon:token('anon'),service:token('service_role'),rateSecret:randomBytes(32).toString('hex')};await writeFile(dir+'/credentials.json',JSON.stringify(keys),{mode:0o600});
 const hookTesting=process.env.LVZ_SIGNUP_HOOK_INTEGRATION==='true';
 if(hookTesting&&process.env.LVZ_SIGNUP_INTEGRATION!=='true')throw new Error('Hook tests require explicit disposable signup mode');
 const authEnv={...process.env,...(hookTesting?{GOTRUE_HOOK_BEFORE_USER_CREATED_ENABLED:'true',GOTRUE_HOOK_BEFORE_USER_CREATED_URI:'pg-functions://postgres/app_private/before_user_created'}:{}),GOTRUE_JWT_SECRET:secret,GOTRUE_JWT_EXP:'120',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_DB_DRIVER:'postgres',DB_NAMESPACE:'auth',DATABASE_URL:`postgres://${encodeURIComponent(dbUser)}@127.0.0.1:55436/lvz_auth?sslmode=disable`,API_EXTERNAL_URL:'http://127.0.0.1:54321/auth/v1',GOTRUE_API_HOST:'127.0.0.1',PORT:'9999',GOTRUE_SITE_URL:'http://127.0.0.1:3000',GOTRUE_URI_ALLOW_LIST:'http://127.0.0.1:3000/**',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_DISABLE_SIGNUP:'false',GOTRUE_MAILER_AUTOCONFIRM:'false',GOTRUE_SMTP_HOST:'127.0.0.1',GOTRUE_SMTP_PORT:'1025',GOTRUE_SMTP_ADMIN_EMAIL:'test@example.invalid',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',GOTRUE_SMTP_MAX_FREQUENCY:'0s',GOTRUE_MAILER_TEMPLATES_CONFIRMATION:'http://127.0.0.1:54321/signup-template'};
 run(dir+'/bin/auth',['migrate'],{cwd:dir+'/bin',env:authEnv});psql('alter role '+userSql+' in database lvz_auth set search_path=auth,public;');
 psql(`create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;create or replace function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;`);
 const sqlFile=path=>run('psql',['-X','-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-f',path]);
 // Plain PostgreSQL lacks the Storage catalog used by the display migration.
 psql('create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[])');
 for(const file of (await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort()){
  if(file==='20261014224708_contacts_private_owner_pilot_v1.sql')sqlFile('tests/integration/bootstrap-owner.sql');
  sqlFile('supabase/migrations/'+file);
 }
 // The shared seed rejects real Auth schemas. Only this newly initialized cluster
 // may substitute a physical database check for that single predicate.
 const seed=await readFile('supabase/seed/fictional_members.sql','utf8');
 const syntheticOnly="exists(select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='encrypted_password')";
 if(!seed.includes(syntheticOnly))throw new Error('Fictional seed guard changed; review before running');
 const wrongCluster=`current_database() <> 'lvz_auth' or inet_server_addr() is not null
   or current_setting('port') <> '55436'
   or current_setting('data_directory') not in ('/tmp/lvz-integration/pg','/private/tmp/lvz-integration/pg')`;
 run('psql',['-X','-h','/tmp','-p','55436','lvz_auth','-v','ON_ERROR_STOP=1','-f','-'],{input:seed.replace(syntheticOnly,wrongCluster)});
 await writeFile(dir+'/postgrest.conf',`db-uri = "postgres://authenticator@127.0.0.1:55436/lvz_auth"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${secret}"\nserver-host = "127.0.0.1"\nserver-port = 3001\n`,{mode:0o600});
 await background('auth',dir+'/bin/auth',['serve'],authEnv,dir+'/bin');await background('postgrest',dir+'/bin/postgrest',[dir+'/postgrest.conf'],process.platform==='darwin'?{...process.env,DYLD_FALLBACK_LIBRARY_PATH:'/opt/homebrew/opt/postgresql@16/lib'}:process.env);await background('gateway','node',['tests/integration/local-gateway.mjs'],{...process.env,LVZ_INTEGRATION_DIR:dir});
 await wait('http://127.0.0.1:9999/health');
 await wait('http://127.0.0.1:3001/');
 await wait('http://127.0.0.1:54321/signup-template');
 if(process.env.LVZ_SIGNUP_INTEGRATION==='true')psql("update app_private.enrollment_settings set enabled=true,allowed_email_domains=array['example.invalid']");
 run('node',['tests/integration/seed-auth.mjs'],{env:{...process.env,LVZ_INTEGRATION_DIR:dir}});
 const nextEnv={...process.env,LVZ_LOCAL_SIGNUP_HOOK:hookTesting?'true':'false',LVZ_MEMBER_SYSTEM_ENABLED:'true',LVZ_DATABASE_ENV:'local',LVZ_LOCAL_INTEGRATION:'true',LVZ_APP_ORIGIN:'http://127.0.0.1:3000',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:keys.anon,SUPABASE_SECRET_KEY:keys.service,LVZ_RATE_LIMIT_SECRET:keys.rateSecret,LVZ_SELF_SERVICE_SIGNUP_ENABLED:process.env.LVZ_SIGNUP_INTEGRATION==='true'?'true':'false',LVZ_EMAIL_DELIVERY_ENABLED:'true',LVZ_SMTP_HOST:'127.0.0.1',LVZ_SMTP_PORT:'1025',LVZ_SMTP_FROM:'test@example.invalid'};
 await background('next','node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1'],nextEnv);await wait('http://127.0.0.1:3000/sign-in');
 console.log('Local Auth/PostgREST/SMTP stack ready. Run the integration assertions; then run tests/integration/stop-stack.mjs. No hosted service was contacted.');
}catch(e){for(const pid of pids)try{process.kill(pid,'SIGTERM');}catch{}try{run('pg_ctl',['-D',dir+'/pg','stop','-m','fast']);}catch{}console.error('Local setup failed:',e.message);process.exitCode=1;}
