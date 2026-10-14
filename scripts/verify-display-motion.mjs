/** Run against a protected fictional display PREVIEW only. Does not publish or pair devices.
 * Usage: DISPLAY_PREVIEW_URL="https://<preview>.vercel.app/billboard-preview/manage" node scripts/verify-display-motion.mjs
 * Never put temporary access URLs in source code, shell history, logs or GitHub Actions.
 */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const access=process.env.DISPLAY_PREVIEW_URL;
if(!access)throw Error('Set DISPLAY_PREVIEW_URL for the explicitly authorized development preview');
const target=new URL(access),base=target.origin;
if(!target.pathname.startsWith('/billboard-preview')||(!target.hostname.endsWith('.vercel.app')&&!['localhost','127.0.0.1'].includes(target.hostname)))throw Error('A development preview is required');
const output='test-results/continuous-display-motion';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[],errors=[];
const pass=name=>{results.push(name);console.log('PASS '+name);};
try{
 const ctx=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.name));
 await page.goto(access,{waitUntil:'domcontentloaded'});
 await page.clock.install({time:new Date('2026-10-14T18:00:00-07:00')});
 const response=await page.goto(base+'/billboard-preview/player',{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200);await page.waitForSelector('[data-slide="welcome"]');
 assert.equal(await page.locator('.art i').first().evaluate(el=>getComputedStyle(el).animationName),'lvz-leaf-left');
 pass('Announcement ambient scene');
 for(const [id,ms,selector,keyframe] of [
  ['sunday',12300,'.date-block::before','lvz-date-sheen'],
  ['picnic',18000,'.art i:nth-child(1)','lvz-event-sun'],
  ['campaign',14000,'.art i:nth-child(1)','lvz-campaign-ring-left']
 ]){
  await page.clock.runFor(ms);await page.waitForSelector('[data-slide="'+id+'"]');
  const value=await page.evaluate(sel=>{const pseudo=sel.endsWith('::before')?'::before':null;return getComputedStyle(document.querySelector(pseudo?sel.slice(0,-8):sel),pseudo).animationName},selector);
  assert.ok(value.includes(keyframe));assert.equal(await page.locator('.slide').count(),1);
  await page.screenshot({path:join(output,'motion-'+id+'.png')});pass(id+' distinct animated scene');
 }
 assert.equal(errors.length,0);pass('No uncaught 1080p player exceptions');await ctx.close();
 const reduced=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
 const rp=await reduced.newPage();await rp.goto(access);await rp.goto(base+'/billboard-preview/player');await rp.waitForSelector('[data-slide="welcome"]');
 for(const selector of ['.art i','.slide-content'])assert.equal(await rp.locator(selector).first().evaluate(el=>getComputedStyle(el).animationName),'none');
 pass('OS reduced motion disables animation');await reduced.close();
 const phone=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 const manage=await phone.newPage();manage.on('pageerror',e=>errors.push(e.name));
 await manage.goto(access);await manage.waitForSelector('.content-card');
 await manage.locator('[data-tab="lab"]').click();
 assert.match(await manage.locator('[data-action="motion"]').innerText(),/Standard/);
 for(const [mode,animation] of [['lively','lvz-leaf-left'],['still','none'],['calm','lvz-leaf-left'],['standard','lvz-leaf-left']]){
  await manage.locator('[data-action="motion"]').click();
  await manage.waitForSelector('body.motion-'+mode);
  assert.equal(await manage.locator('.art i').first().evaluate(el=>getComputedStyle(el).animationName),animation);
  pass(mode+' manual motion mode');
 }
 assert.equal(await manage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);pass('390px phone has no horizontal overflow');
 const before=await manage.locator('.art i').count();
 await manage.locator('[data-action="next"]').click();await manage.waitForSelector('[data-slide="sunday"]');
 assert.ok(before<=3&&(await manage.locator('.art i').count())<=3);pass('No accumulating animation elements');
 assert.equal(errors.length,0);pass('No uncaught management exceptions');
 await phone.close();
 await writeFile(join(output,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),origin:base,passed:results.length,results,errors},null,2));
 console.log(JSON.stringify({passed:results.length,errors:errors.length}));
}catch(e){
 console.error('Motion verification failed. Check the most recent passing assertion.');
 await writeFile(join(output,'failure.json'),JSON.stringify({origin:base,passed:results,errorType:e?.name||'Error'},null,2));process.exitCode=1;
}finally{await browser.close();}
