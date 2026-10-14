/** Explicit fictional-preview media/outage/browser-process-restart verification.
 * DISPLAY_PREVIEW_URL=https://<preview>/billboard-preview/manage node scripts/verify-continuous-display-failures.mjs
 * Never run against a live TV identity. All mutations are isolated browser fixtures.
 */
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const access=process.env.DISPLAY_PREVIEW_URL;if(!access)throw Error('Set DISPLAY_PREVIEW_URL to the authorized development-preview URL.');
const target=new URL(access),base=target.origin;if(!target.pathname.startsWith('/billboard-preview')||(!target.hostname.endsWith('.vercel.app')&&!['localhost','127.0.0.1'].includes(target.hostname)))throw Error('Use an authorized Vercel development preview or local fixture.');
const output=resolve(process.env.DISPLAY_EVIDENCE_DIR||'test-results/continuous-display');await fs.mkdir(output,{recursive:true});
const results=[];const pass=name=>{results.push(name);console.log(`PASS ${name}`);};
let browser=await chromium.launch({headless:true}),persistent=null,profile=null;
try{
 const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});const page=await ctx.newPage();let missing=0;
 page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('intentionally-missing.png'))missing++;});
 await page.goto(access);await page.clock.install({time:new Date('2026-10-14T18:00:00-07:00')});await page.goto(base+'/billboard-preview/lab');await page.waitForSelector('[data-slide="welcome"]');
 await page.locator('[data-action="pause"]').click();await page.clock.runFor(30000);assert.equal(await page.locator('#lab-stage [data-slide]').getAttribute('data-slide'),'welcome');pass('Paused slide holds its position');
 await page.locator('[data-action="override"]').click();await page.waitForSelector('[data-slide="notice"]');await page.clock.runFor(20300);assert.notEqual(await page.locator('#lab-stage [data-slide]').getAttribute('data-slide'),'notice');pass('Authorized override preempts pause and ends within the 250 ms tick cadence');
 await page.locator('[data-action="reset"]').click();await page.locator('[data-tab="lab"]').click();await page.waitForSelector('[data-slide="welcome"]');await page.locator('[data-action="failure"]').click();await page.clock.runFor(70000);assert.ok(missing>=1&&missing<=2);assert.ok(await page.locator('#lab-stage [data-slide]').count());assert.equal(await page.locator('#lab-stage img').count(),0);pass('Failed image is attempted then skipped without stopping the loop');
 await page.locator('[data-action="quiet"]').click();await page.waitForSelector('[data-mode="quiet"]');pass('Operating period fallback overrides the playlist');
 // Test-only virtual document. No route or global is added to the deployed app.
 await ctx.route('**/billboard-preview/media-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><link rel="stylesheet" href="/billboard-preview/style.css"></head><body><div id="test-stage" class="stage"></div></body></html>'}));
 await page.goto(base+'/billboard-preview/media-test');await page.evaluate(async()=>{const {createRuntime}=await import('/billboard-preview/player.mjs');window.__displayTest=createRuntime();window.__displayTest.setStage(document.querySelector('#test-stage'));});await page.waitForSelector('[data-slide="welcome"]');
 await page.evaluate(async()=>{const {demoPackage}=await import('/billboard-preview/engine.mjs');const r=window.__displayTest,p=demoPackage(r.now(),2);const slide=p.slides.find(x=>x.id==='broken');slide.layout='video';slide.media='/billboard-preview/media/intentionally-missing.mp4';p.entries[0]={...p.entries[0],id:'broken-video-entry',slideId:'broken',seconds:10};r.publish(p);r.engine.next();r.tick();});
 await page.clock.runFor(6000);assert.equal(await page.locator('video').count(),0);assert.ok(await page.locator('[data-slide]').count());await page.evaluate(()=>window.__displayTest.dispose());pass('Failed video releases its element and advances');
 await ctx.route('**/billboard-preview/heartbeat',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await page.goto(base+'/billboard-preview/player');await page.waitForSelector('.neutral-slide');assert.equal(await page.locator('[data-slide]').count(),0);pass('Unavailable heartbeat has a neutral startup, not a connecting loop');
 await browser.close();browser=null;
 profile=await fs.mkdtemp(join(tmpdir(),'lvzion-display-restart-'));
 persistent=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1920,height:1080}});let p=persistent.pages()[0];await p.goto(access);await p.goto(base+'/billboard-preview/player');await p.waitForSelector('[data-slide="welcome"]');await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await persistent.close();persistent=null;
 persistent=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1920,height:1080}});await persistent.setOffline(true);p=persistent.pages()[0];await p.goto(base+'/billboard-preview/player',{waitUntil:'domcontentloaded'});await p.waitForSelector('.neutral-slide');assert.equal(await p.locator('[data-slide]').count(),0);pass('Full browser-process restart while offline serves the neutral shell');
 await persistent.setOffline(false);await p.waitForSelector('[data-slide="welcome"]');pass('Restarted browser recovers when verified connectivity returns');
 await fs.writeFile(join(output,'browser-extra.json'),JSON.stringify({base,passed:results.length,results},null,2));console.log(JSON.stringify({passed:results.length}));
}catch(e){await fs.writeFile(join(output,'browser-extra-failure.json'),JSON.stringify({base,completed:results,errorName:e?.name||'Error'},null,2));console.error('Failure/restart verification failed; inspect the last passed check. Access URLs and exception details are not logged.');process.exitCode=1;}
finally{if(browser)await browser.close();if(persistent)await persistent.close();if(profile)await fs.rm(profile,{recursive:true,force:true});}
