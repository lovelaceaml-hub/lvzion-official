/** Explicit preview-only browser verification; never invoked by CI or a production deployment.
 * DISPLAY_PREVIEW_URL=https://<preview>/billboard-preview/manage node scripts/verify-continuous-display.mjs
 * A sanctioned temporary preview-access URL can be supplied via the environment. It is never logged.
 * Requires the repository's existing Playwright Chromium installation.
 */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {join,resolve} from 'node:path';
const access=process.env.DISPLAY_PREVIEW_URL;
if(!access)throw Error('Set DISPLAY_PREVIEW_URL to the authorized development-preview URL.');
const target=new URL(access),base=target.origin;
if(!target.pathname.startsWith('/billboard-preview')||(!target.hostname.endsWith('.vercel.app')&&!['localhost','127.0.0.1'].includes(target.hostname)))throw Error('Use a Vercel development preview or local fixture, not a production church domain.');
const output=resolve(process.env.DISPLAY_EVIDENCE_DIR||'test-results/continuous-display');await fs.mkdir(output,{recursive:true});
const results=[],errors=[],requests=[];
const record=(name,detail='')=>{results.push({name,passed:true,detail});console.log(`PASS ${name}`);};
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.name));
 await page.goto(access,{waitUntil:'domcontentloaded'});
 await page.clock.install({time:new Date('2026-10-14T18:00:00-07:00')});
 await page.goto(base+'/billboard-preview/player',{waitUntil:'domcontentloaded'});
 page.on('request',r=>requests.push(new URL(r.url()).pathname));
 await page.waitForSelector('[data-slide="welcome"]',{timeout:15000});
 assert.equal(await page.locator('nav,button,input').count(),0);assert.equal(await page.locator('.slide').count(),1);
 record('Clean 1920 × 1080 player starts without admin controls');
 for(const [id,wait] of [['welcome',0],['sunday',12300],['picnic',18000],['campaign',14000]]){
  if(wait)await page.clock.runFor(wait);
  await page.waitForSelector(`[data-slide="${id}"]`);assert.equal(await page.locator('.slide').count(),1);
  assert.equal(await page.locator('.slide-content').evaluate(el=>el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2),false);
  await page.screenshot({path:join(output,`tv-${id}.png`)});record(`Distinct ${id} layout rotates and fits at 1080p`);
 }
 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
 const cached=await page.evaluate(async()=>{const out=[];for(const name of await caches.keys())if(name.startsWith('lvzion-billboard'))for(const req of await(await caches.open(name)).keys())out.push(new URL(req.url).pathname);return out;});
 assert.ok(cached.includes('/billboard-preview/player'));assert.equal(cached.some(x=>x.includes('studio')||x.includes('/api/')||x.includes('auth')),false);
 record('Offline cache excludes editor, credentials and APIs');
 await context.setOffline(true);await page.clock.runFor(301000);await page.waitForSelector('[data-mode="stale"]');assert.equal(await page.locator('[data-slide]').count(),0);record('Prolonged outage expires loaded content to neutral');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.neutral-slide');assert.equal(await page.locator('[data-slide]').count(),0);record('Offline page restart renders neutral shell, not a white screen');
 await context.setOffline(false);await page.waitForSelector('[data-slide="welcome"]',{timeout:15000});record('Reconnection recovers playback without manual refresh');
 assert.equal(requests.some(x=>x.includes('/api/members')||x.includes('/auth/v1')||x.includes('/studio.mjs')||x.includes('/studio-live.mjs')),false);record('Normal TV does not request member or editing endpoints');
 const phone=await context.newPage();await phone.setViewportSize({width:390,height:844});phone.on('pageerror',e=>errors.push(e.name));
 await phone.goto(base+'/billboard-preview/manage',{waitUntil:'domcontentloaded'});await phone.waitForSelector('.content-card');await phone.waitForFunction(()=>document.querySelector('#runtime-status')?.textContent.includes('playing'));
 await phone.waitForFunction(()=>document.querySelector('[data-playback-summary]')?.textContent.includes('Next regular:'));assert.ok((await phone.locator('[data-playback-summary]').innerText()).includes('Next regular:'));
 assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await phone.screenshot({path:join(output,'phone-library.png'),fullPage:true});record('390px library and now/next summary have no horizontal overflow');
 await phone.locator('[data-tab="playlist"]').click();const first=await phone.locator('.entry-main strong').first().innerText();await phone.locator('[data-up="1"]').click();assert.notEqual(await phone.locator('.entry-main strong').first().innerText(),first);await phone.screenshot({path:join(output,'phone-playlist.png'),fullPage:true});record('Playlist reorders in the phone interface');
 await phone.locator('[data-tab="library"]').click();await phone.locator('[data-edit="welcome"]').click();await phone.locator('#title').fill('A new draft headline.');await phone.locator('[data-action="save"]').click();await phone.locator('[data-tab="publish"]').click();assert.equal(await phone.locator('[data-action="publish"]').isDisabled(),true);await phone.locator('[data-action="approve-all"]').click();assert.equal(await phone.locator('[data-action="publish"]').isDisabled(),false);await phone.locator('[data-action="publish"]').click();await phone.screenshot({path:join(output,'phone-publish.png'),fullPage:true});record('Draft revision requires approval before demo publication');
 await phone.locator('[data-tab="screens"]').click();await phone.screenshot({path:join(output,'phone-screens.png'),fullPage:true});assert.equal(await phone.locator('[data-action="revoke"]').isDisabled(),true);
 await phone.locator('summary').click();await phone.selectOption('#role','technician');assert.equal(await phone.locator('[data-action="revoke"]').isDisabled(),false);await phone.locator('[data-tab="publish"]').click();assert.equal(await phone.locator('[data-action="publish"]').isDisabled(),true);record('Device administrator cannot approve or publish');
 await phone.locator('[data-tab="screens"]').click();await phone.locator('[data-action="revoke"]').click();await phone.locator('[data-tab="lab"]').click();await phone.waitForSelector('[data-mode="revoked"]');record('Simulated device revocation purges playback');
 await phone.locator('[data-action="reset"]').click();await phone.locator('[data-tab="lab"]').click();await phone.waitForSelector('[data-slide="welcome"]');await phone.locator('[data-action="next"]').click();await phone.waitForSelector('[data-slide="sunday"]');record('Reset creates one handler set; Next advances once');
 await phone.locator('[data-action="empty"]').click();await phone.waitForSelector('[data-mode="empty"]');record('Empty playlist has a neutral fallback');
 const denied=await context.request.post(base+'/api/billboard/publish',{data:{sample:true}});assert.equal(denied.status(),403);assert.equal((await denied.json()).code,'DISPLAY_NOT_ACTIVATED');record('Deployed real publication API is denied');
 assert.equal(errors.length,0);record('No uncaught browser errors',String(errors.length));
 await fs.writeFile(join(output,'browser-results.json'),JSON.stringify({base,results,errors,cache:cached,requests},null,2));
 console.log(JSON.stringify({passed:results.length,errors:errors.length}));
}catch(e){await fs.writeFile(join(output,'browser-failure.json'),JSON.stringify({base,completed:results,errorName:e?.name||'Error'},null,2));console.error('Browser verification failed; inspect the last passed check. Access URLs and exception details are not logged.');process.exitCode=1;}
finally{await browser.close();}
