import { chromium, expect } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
// Explicit development preview only. Authentication links are never written into evidence.
const base=process.env.WM_PREVIEW_URL;
if(!base)throw new Error('Set WM_PREVIEW_URL to the authorized development preview origin.');
const origin=new URL(base).origin;
if(!/\.vercel\.app$|\.vercel\.run$/.test(new URL(origin).hostname)&&!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Use a verified development preview, not the production domain.');
const out=process.env.WM_EVIDENCE_DIR||'.artifacts/wm-prayer';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,acceptDownloads:true});
const page=await context.newPage();
const report={checks:[],screenshots:[],errors:[],sensitiveRequests:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('request',r=>{const u=new URL(r.url());if(/supabase|gmail|googleapis|signal\.org|zoom\.us/.test(u.hostname))report.sensitiveRequests.push(u.hostname);});
async function check(name,fn){await fn();report.checks.push(name);}
async function goto(query=''){await page.goto(`${origin}/wm-prayer-preview${query}`,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{name:'Prayer Gatherings',exact:true})).toBeVisible();}
async function capture(name,locator=page){const filename=`${name}.png`;await locator.screenshot({path:path.join(out,filename),...(locator===page?{fullPage:true}:{})});report.screenshots.push(filename);}
async function controls(){const d=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Preview controls'})}).first();if((await d.getAttribute('open'))===null)await d.locator('summary').first().click();}
async function role(key){await controls();await page.getByLabel('Preview role').selectOption(key);}
try{
 if(process.env.WM_AUTH_URL){const u=new URL(process.env.WM_AUTH_URL);if(u.origin!==origin)throw new Error('Auth link origin must match the preview.');await page.goto(u.toString(),{waitUntil:'networkidle'});}
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});
  for(const [view,roleKey] of [['home','member'],['archive','member'],['lesson','member'],['review','reviewer']]){
   await goto(`?view=${view}&role=${roleKey}`);
   await check(`${width}px ${view}: no horizontal overflow`,async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true));
   if(width===390)await capture(`mobile-${view}`);
  }
 }
 await page.setViewportSize({width:390,height:844});await goto();
 await check('simulated join opens no meeting',async()=>{await page.getByRole('button',{name:'Join Gathering'}).click();await expect(page.getByRole('status')).toContainText('No meeting opened');expect(new URL(page.url()).pathname).toBe('/wm-prayer-preview');});
 for(const [value,expected]of [['pending','Source pending'],['cancelled','cancelled'],['rescheduled','verification'],['unverified','verification'],['completed','complete']]){
  await controls();await page.getByLabel('Gathering scenario').selectOption(value);
  await check(`${value}: no active join`,async()=>{await expect(page.getByRole('button',{name:'Join Gathering'})).toHaveCount(0);await expect(page.getByTestId('gathering-panel')).toContainText(expected);});
 }
 await goto('?view=review&role=technical');await check('technical role cannot manage',async()=>{await expect(page.getByText('Management access is not assigned')).toBeVisible();await expect(page.getByTestId('source-panel')).toHaveCount(0);});
 await goto('?view=review&role=drafter');await page.getByRole('button',{name:'Submit for review',exact:true}).click();
 await role('reviewer');await page.getByLabel('I checked all wording',{exact:false}).check();await page.getByLabel('I accept the summary-only',{exact:false}).check();await page.getByRole('button',{name:'Approve reviewed version'}).click();
 await check('approval leaves member publication empty',async()=>{await expect(page.getByTestId('review-panel')).toContainText('not published');await expect(page.getByRole('button',{name:'Publish in fictional preview'})).toHaveCount(0);});
 await role('publisher');await check('publisher has no source panel',async()=>expect(await page.getByTestId('source-panel').count()).toBe(0));
 await page.getByRole('button',{name:'Publish in fictional preview'}).click();await check('separate publication step works',async()=>expect(await page.getByTestId('review-panel').innerText()).toContain('Current member publication: revision 1'));
 await role('drafter');await page.getByLabel('Fictional gathering').selectOption('demo-oct13');await page.getByRole('button',{name:'Create corrected draft'}).click();
 await check('correction preserves published revision',async()=>expect(await page.getByTestId('review-panel').innerText()).toContain('Current member publication: revision 1'));
 await page.getByText('Test source-import scenarios',{exact:true}).click();await page.getByRole('button',{name:'Duplicate notification',exact:true}).click();await check('duplicate import simulation is idempotent',async()=>expect(await page.getByRole('status').innerText()).toContain('No new gathering or recap'));
 await page.getByRole('button',{name:'Incomplete transcript'}).click();await page.getByRole('button',{name:'Submit for review'}).click();await check('incomplete source blocks review',async()=>expect(await page.getByRole('status').innerText()).toContain('Source incomplete'));
 await goto('?view=lesson&role=sharer');
 for(const [key,label] of [['outline','1. Lesson outline'],['lenses','2. Three lenses'],['path','3. Learning path']]){
  await page.getByRole('button',{name:label,exact:true}).click();await capture(`card-${key}`,page.getByTestId('lesson-card'));
  await page.getByRole('button',{name:'Prepare approved outputs'}).click();
  await check(`${key}: separate safe explanation`,async()=>{const text=await page.getByLabel('Approved fictional text').inputValue();expect(text).toContain('FICTIONAL');expect(text).toContain('no full transcript or recording reviewed');expect(text).not.toMatch(/https?:|mailbox|passcode|access_token|@/i);});
  const event=page.waitForEvent('download');await page.getByRole('button',{name:'Save fictional PNG'}).click();const download=await event;await download.saveAs(path.join(out,`export-${key}.png`));report.checks.push(`${key}: PNG export`);
 }
 await check('anonymous live API fails closed and does not cache',async()=>{const r=await context.request.get(`${origin}/api/wm-prayer`);expect(r.status()).toBe(401);expect(r.headers()['cache-control']).toContain('no-store');expect(await r.text()).not.toMatch(/recapId|sourceId|credential/);});
 await check('no sensitive network requests',async()=>expect(report.sensitiveRequests).toEqual([]));
 await check('no browser exceptions',async()=>expect(report.errors).toEqual([]));
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.checks.length,screenshots:report.screenshots,errors:report.errors,sensitiveRequests:report.sensitiveRequests}));
}catch(error){await writeFile(path.join(out,'partial-report.json'),JSON.stringify(report,null,2));throw error;}finally{await browser.close();}
