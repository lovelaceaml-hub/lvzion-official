// Design sweep: screenshots and layout metrics for every screen at 390px and 1280px.
// Fictional fixtures only, loopback servers only, activation disabled. Not a test suite.
// Uses the installed Google Chrome (or LVZ_CHROMIUM_PATH). Requires a prior compile (`node node_modules/next/dist/bin/next build --webpack`).
// Usage: node scripts/design-sweep.mjs docs/audit/2026-10-24/before [grep]
// LVZ_SWEEP_PORT picks the main port (harness uses the next one) so parallel sweeps do not collide;
// LVZ_SWEEP_SPEC=atlas runs the Atlas side-by-side captures (tests/design-sweep/atlas.spec.ts) instead.
import {mkdtemp,mkdir,cp,writeFile,symlink,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createWriteStream,existsSync} from 'node:fs';
const root=process.cwd(),out=resolve(process.argv[2]||'docs/audit/sweep'),grep=process.argv[3];
const mainPort=Number(process.env.LVZ_SWEEP_PORT||3027),harnessPort=mainPort+1;
const spec=process.env.LVZ_SWEEP_SPEC==='atlas'?'atlas.spec.ts':'sweep.spec.ts';
const dir=await mkdtemp(join(tmpdir(),'lvz-design-sweep-'));
const servers=[];
async function waitFor(url,label){
 for(let i=0;i<240;i++){try{const r=await fetch(url);if(r.status<500)return;}catch{}await new Promise(r=>setTimeout(r,250));}
 throw Error(label+' did not start. Inspect '+dir);
}
function start(args,cwd,env,log){
 const child=spawn(process.execPath,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
 const stream=createWriteStream(join(dir,log),{mode:0o600});child.stdout.pipe(stream);child.stderr.pipe(stream);
 servers.push(child);return child;
}
try{
 const env={LVZ_MEMBER_SYSTEM_ENABLED:'false',LVZ_SELF_SERVICE_SIGNUP_ENABLED:'false'};
 start([join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(mainPort)],root,env,'main.log');
 // Harness: the gated module clients render without their server-side member check.
 // Their APIs are intercepted with fictional responses by the sweep spec.
 const h=join(dir,'harness');
 for(const path of ['components','lib','styles'])await cp(join(root,path),join(h,path),{recursive:true});
 for(const route of ['modules/contacts','modules/work-mission-prayer','modules/continuous-display','modules/worship-duty','modules/worship-duty/setup'])await mkdir(join(h,'app',route),{recursive:true});
 await cp(join(root,'app/globals.css'),join(h,'app/globals.css'));
 await cp(join(root,'app/layout.jsx'),join(h,'app/layout.jsx'));
 await cp(join(root,'tsconfig.json'),join(h,'tsconfig.json'));
 await symlink(join(root,'node_modules'),join(h,'node_modules'),'dir');
 await cp(join(root,'package.json'),join(h,'package.json'));
 await writeFile(join(h,'next.config.mjs'),'export default {devIndicators:false};');
 await writeFile(join(h,'app/modules/contacts/page.tsx'),"import Client from '../../../components/contacts/live-workspace';export default function Page(){return <Client/>}");
 await writeFile(join(h,'app/modules/work-mission-prayer/page.tsx'),"import Client from '../../../components/morning-prayer/MorningPrayerLive';export default function Page(){return <Client/>}");
 await writeFile(join(h,'app/modules/worship-duty/page.tsx'),"import Client from '../../../components/worship-duty/connected-workspace';import '../../../components/worship-duty/worship-duty.css';export default function Page(){return <Client/>}");
 await writeFile(join(h,'app/modules/worship-duty/setup/page.tsx'),"import Client from '../../../../components/worship-duty/setup-workspace';import '../../../../components/worship-duty/worship-duty.css';export default function Page(){return <Client/>}");
 await writeFile(join(h,'app/modules/continuous-display/page.tsx'),"import DisplayManager from '../../../components/display-manager';import '../../../components/display-visual.css';import '../../../components/display-manager.css';import '../../../components/display-operations.css';export default function Page(){return <DisplayManager/>}");
 await new Promise(done=>start([join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],h,env,'harness-build.log').once('exit',done));
 // Next.js 16.4 can exit non-zero after a completed compile to print an upgrade notice; the build ID is the evidence.
 if(!existsSync(join(h,'.next/BUILD_ID')))throw Error('Harness compile failed. Inspect '+join(dir,'harness-build.log'));
 start([join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(harnessPort)],h,env,'harness.log');
 await waitFor(`http://127.0.0.1:${mainPort}/sign-in`,'Main app');
 await waitFor(`http://127.0.0.1:${harnessPort}/modules/contacts`,'Harness');
 await mkdir(out,{recursive:true});
 const config=join(dir,'playwright.config.mjs');
 await writeFile(config,`import {defineConfig,devices} from '${root}/node_modules/@playwright/test/index.mjs';
export default defineConfig({testDir:'${root}/tests/design-sweep',timeout:60000,workers:2,
 use:{baseURL:'http://127.0.0.1:${mainPort}',browserName:'chromium',...(process.env.LVZ_CHROMIUM_PATH?{launchOptions:{executablePath:process.env.LVZ_CHROMIUM_PATH}}:{channel:'chrome'})},reporter:[['line']],
 projects:[{name:'390',use:{...devices['iPhone 13'],browserName:'chromium',channel:'chrome',viewport:{width:390,height:844},deviceScaleFactor:1}},{name:'1280',use:{browserName:'chromium',channel:'chrome',viewport:{width:1280,height:800}}}]});`);
 const code=await new Promise((done,fail)=>{
  const child=spawn(process.execPath,[join(root,'node_modules/@playwright/test/cli.js'),'test','--config',config,spec,...(grep?['--grep',grep]:[])],{cwd:root,stdio:'inherit',env:{...process.env,LVZ_SWEEP_OUT:out,LVZ_SWEEP_HARNESS:`http://127.0.0.1:${harnessPort}`}});
  child.once('error',fail);child.once('exit',done);
 });
 if(code!==0)process.exitCode=1;
}finally{
 for(const s of servers)if(s.exitCode===null){const exited=new Promise(r=>s.once('exit',r));s.kill('SIGTERM');await exited;}
 if(!process.env.LVZ_SWEEP_KEEP)await rm(dir,{recursive:true,force:true});
}
