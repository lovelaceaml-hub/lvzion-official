// Isolated client harness. No Auth bypass or fixture route is added to the application.
import {mkdtemp,mkdir,cp,writeFile,symlink,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createWriteStream} from 'node:fs';
const root=process.cwd(),dir=await mkdtemp(join(tmpdir(),'lvz-wm-browser-'));
const port=3016;
let server;
try{
 await mkdir(join(dir,'app/modules/work-mission-prayer'),{recursive:true});
 await mkdir(join(dir,'lib/morning-prayer'),{recursive:true});
 await mkdir(join(dir,'styles'),{recursive:true});
 await cp(join(root,'components/morning-prayer'),join(dir,'components/morning-prayer'),{recursive:true});
 await cp(join(root,'lib/morning-prayer/time.ts'),join(dir,'lib/morning-prayer/time.ts'));
 // Shared Day Sheet pieces the module uses: header, swipe hook, tokens and ui- classes.
 for(const path of ['components/app-header.tsx','components/app-frame.tsx','components/app-frame.css','components/app-switcher.tsx','components/app-switcher.css','lib/app-runtime.ts','lib/member-experience.ts','lib/contracts.ts','components/home-icons.tsx','lib/use-swipe-tabs.ts','lib/design-tokens.ts','styles/lvz-tokens.css','styles/lvz-ui.css'])
  await cp(join(root,path),join(dir,path));
 await symlink(join(root,'node_modules'),join(dir,'node_modules'),'dir');
 await cp(join(root,'package.json'),join(dir,'package.json'));
 await writeFile(join(dir,'next.config.mjs'),'export default {devIndicators:false};');
 await writeFile(join(dir,'app/layout.tsx'),"import AppFrame from '../components/app-frame';import '../styles/lvz-tokens.css';import '../styles/lvz-ui.css';export default function Layout({children}:{children:React.ReactNode}){return <html lang=\"en\"><body><AppFrame>{children}</AppFrame></body></html>}");
 await writeFile(join(dir,'app/modules/work-mission-prayer/page.tsx'),"import Client from '../../../components/morning-prayer/MorningPrayerLive';export default function Page(){return <Client/>}");
 const log=createWriteStream(join(dir,'server.log'),{mode:0o600});
 server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:dir,stdio:['ignore','pipe','pipe']});
 server.stdout.pipe(log);server.stderr.pipe(log);
 let ready=false;
 for(let i=0;i<80;i++){
  try{const r=await fetch(`http://127.0.0.1:${port}/modules/work-mission-prayer`);if(r.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 if(!ready)throw Error('Isolated Morning Prayer client did not start. Inspect '+join(dir,'server.log'));
 await writeFile(join(dir,'playwright.config.ts'),`import {defineConfig,devices} from '${root}/node_modules/@playwright/test/index.mjs';export default defineConfig({testDir:'${root}/tests/wm-browser',timeout:30000,workers:1,use:{baseURL:'http://127.0.0.1:${port}',...devices['iPhone 13'],browserName:'chromium',...(process.env.LVZ_CHROMIUM_PATH?{launchOptions:{executablePath:process.env.LVZ_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}}:{})},reporter:[['list']]});`);
 const code=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[join(root,'node_modules/@playwright/test/cli.js'),'test','--config',join(dir,'playwright.config.ts'),process.argv[2]||'morning-prayer-live.spec.ts'],{cwd:root,stdio:'inherit'});
  child.once('error',reject);child.once('exit',resolve);
 });
 if(code!==0)process.exitCode=1;
}finally{
 if(server&&server.exitCode===null){const exited=new Promise(r=>server.once('exit',r));server.kill('SIGTERM');await exited;}
 await rm(dir,{recursive:true,force:true});
}

