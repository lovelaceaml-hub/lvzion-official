// Atlas side-by-side captures: every rebuilt screen at 390px (and 1280px where
// marked wide) in Light and Dark, from fictional fixtures only. Run through
// `LVZ_SWEEP_SPEC=atlas node scripts/design-sweep.mjs <shots-dir>`, then
// `node scripts/atlas-gallery.mjs <shots-dir>` composes docs/design/atlas-build/.
// Not part of the browser suite. Each app owns its own screen list file.
import {test} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {AtlasScreen} from './atlas-screens/shared';
import home from './atlas-screens/home';
import study from './atlas-screens/study';
import contacts from './atlas-screens/contacts';
import mission from './atlas-screens/mission';
import members from './atlas-screens/members';
import worship from './atlas-screens/worship';
import display from './atlas-screens/display';
import gospel from './atlas-screens/gospel';

const out=process.env.LVZ_SWEEP_OUT||'docs/audit/atlas-shots';
const harness=process.env.LVZ_SWEEP_HARNESS||'';
const screens:AtlasScreen[]=[...home,...study,...contacts,...mission,...members,...worship,...display,...gospel];

for(const screen of screens)for(const scheme of ['light','dark'] as const)test(`${screen.name} ${scheme}`,async({page},info)=>{
 const wide=info.project.name==='1280';
 if(wide&&!screen.wide){test.skip(true,'Phone only');return;}
 if(screen.onHarness&&!harness){test.skip(true,'No harness');return;}
 await page.setViewportSize(wide?{width:1280,height:800}:{width:390,height:920});
 await page.emulateMedia({colorScheme:scheme,reducedMotion:'reduce'});
 const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message.slice(0,300)));
 await screen.setup?.(page);
 if(!page.url().startsWith('http'))await page.goto((screen.onHarness?harness:'')+screen.path);
 await page.waitForLoadState('networkidle').catch(()=>{});
 await page.waitForTimeout(700);
 await screen.then?.(page);
 await page.waitForTimeout(400);
 const dir=join(out,wide?'1280':'390');mkdirSync(dir,{recursive:true});
 await page.screenshot({path:join(dir,`${screen.name}-${scheme}.png`)});
 writeFileSync(join(dir,`${screen.name}-${scheme}.json`),JSON.stringify({name:screen.name,title:screen.title,atlas:screen.atlas,wide,scheme,notes:screen.notes??'',errors,overflowX:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)},null,1));
});
