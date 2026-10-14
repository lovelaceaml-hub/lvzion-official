import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const input=process.env.WORSHIP_PREVIEW_URL;
if(!input)throw new Error('Set WORSHIP_PREVIEW_URL to an authorized fictional preview URL.');
const target=new URL(input);
if(target.pathname!=='/worship-duty-preview'||!(target.hostname.endsWith('.vercel.app')||target.hostname==='localhost'))throw new Error('Only the fictional review route is allowed.');
const output=process.env.WORSHIP_ARTIFACT_DIR||'artifacts/worship-duty';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await context.newPage(),checks=[],errors=[],forbidden=[];
page.setDefaultTimeout(12000);
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(/(?:supabase\.co|firebaseio\.com|firestore\.googleapis\.com)$/.test(u.hostname)||(u.origin===target.origin&&u.pathname.startsWith('/api/')&&!['GET','HEAD'].includes(r.method()))){forbidden.push(u.origin+u.pathname);await route.abort();return;}await route.continue();});
async function check(name,action){await action();checks.push(name);console.log('PASS: '+name);}
async function options(){if(!await page.getByLabel('Preview as').isVisible())await page.getByRole('button',{name:'View options',exact:true}).click();}
async function actor(value){await options();await page.getByLabel('Preview as').selectOption(String(value));}
async function section(name){await page.getByRole('navigation',{name:'Worship Duty sections'}).getByRole('button',{name,exact:true}).click();}
try{
 await page.goto(input,{waitUntil:'networkidle'});
 await check('protected preview authenticates into the actual fictional application',async()=>{await expect(page.getByRole('heading',{name:'My Duties',exact:true})).toBeVisible();if(page.url().startsWith('https://vercel.com/'))throw new Error('Reached protection, not the application.');});
 await page.screenshot({path:output+'/my-duties-focus.png',fullPage:true});
 await check('next service shows the allowed prayer and usher pair',async()=>{await expect(page.getByText('Prayer + usher · allowed together',{exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Worship Duty sections'}).getByRole('button',{name:'Manage',exact:true})).toHaveCount(0);});
 await page.getByRole('button',{name:'View service',exact:true}).click();
 await check('service details do not disclose other-group names',async()=>{await expect(page.getByText('Morgan Example',{exact:true})).toHaveCount(0);await expect(page.getByText('Assigned member',{exact:true}).first()).toBeVisible();});
 await check('a change request keeps the duty and can be withdrawn',async()=>{await page.getByRole('button',{name:'Request change for Usher #1',exact:true}).click();await expect(page.getByRole('status')).toContainText('remain assigned');await page.getByRole('button',{name:'Withdraw request for Usher #1',exact:true}).click();await expect(page.getByRole('status')).toContainText('still assigned');await page.getByRole('button',{name:'Request change for Usher #1',exact:true}).click();});
 await actor(3);await section('Manage');
 await check('department leader sees only their department and can approve a replacement',async()=>{await expect(page.getByLabel('Department')).toHaveValue('Usher Brothers');await expect(page.getByLabel('Department').locator('option')).toHaveCount(1);await page.getByLabel('Replacement for Usher #1').selectOption('riley');await page.getByRole('button',{name:'Approve replacement',exact:true}).click();await expect(page.getByRole('status')).toContainText('replacement assigned');await expect(page.getByLabel('Assigned member for Usher #1')).toHaveValue('riley');});
 await check('third duty is disabled and a forged selection is refused by the domain guard',async()=>{const select=page.getByLabel('Assigned member for Usher #2');await expect(select.locator('option[value="riley"]')).toHaveAttribute('disabled','');await select.evaluate(el=>{el.value='riley';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.getByRole('button',{name:'Save Usher #2',exact:true}).click();await expect(page.getByRole('status')).toContainText('conflicting assignment');});
 await options();await page.getByRole('button',{name:'Reset examples',exact:true}).click();await page.getByRole('button',{name:'View options',exact:true}).click();await page.screenshot({path:output+'/manage.png',fullPage:true});
 await actor(4);
 await check('technical administrator has neither scheduling nor Presider controls',async()=>{const nav=page.getByRole('navigation',{name:'Worship Duty sections'});await expect(nav.getByRole('button',{name:'Manage',exact:true})).toHaveCount(0);await expect(nav.getByRole('button',{name:'Presider',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'No duties coming up',exact:true})).toBeVisible();});
 await actor(1);await section('Presider');
 await check('Presider saves a choir selection for the exact service',async()=>{await page.getByLabel('Choir song').selectOption('demo-06');await page.getByRole('button',{name:'Save plan',exact:true}).click();await expect(page.getByRole('status')).toContainText('Song plan saved');await page.getByLabel('Service').selectOption('tue');await expect(page.getByLabel('Choir song')).toHaveValue('');await expect(page.getByLabel('Thanks song')).toHaveCount(0);await page.getByLabel('Service').selectOption('sat-am');await expect(page.getByLabel('Choir song')).toHaveValue('demo-06');});
 await check('preparation songs reorder and confirmation persists',async()=>{await page.getByRole('button',{name:'Move preparation song 2 up',exact:true}).click();await expect(page.locator('.wd-songs li').first()).toContainText('Demo song 02');await page.getByRole('button',{name:'Confirm plan',exact:true}).click();await expect(page.locator('.wd-section-heading').filter({has:page.getByRole('heading',{name:'Song plan',exact:true})})).toContainText('Confirmed');});
 await check('Copy for Signal presents a clearly fictional text without sending',async()=>{await page.getByRole('button',{name:'Copy for Signal',exact:true}).click();await expect(page.getByLabel('Share preview')).toHaveValue(/Fictional review only/);});
 await page.getByRole('button',{name:'View options',exact:true}).click();await page.screenshot({path:output+'/presider.png',fullPage:true});
 await actor(0);await section('My Duties');await page.getByRole('button',{name:'View service',exact:true}).click();
 await page.getByText('Availability for this day',{exact:true}).click();
 await check('day off flags rather than silently clears paired duties',async()=>{await page.getByRole('button',{name:'Mark this day unavailable',exact:true}).click();await expect(page.getByText(/Availability conflict: you are still assigned/)).toBeVisible();await expect(page.getByRole('button',{name:'Request change for Usher #1',exact:true})).toBeVisible();});
 for(const layout of ['focus','agenda'])for(const width of [320,390,430,768,1280]){
  await page.setViewportSize({width,height:900});const url=new URL('/worship-duty-preview',target.origin);if(layout==='agenda')url.searchParams.set('layout','agenda');await page.goto(url.href,{waitUntil:'networkidle'});
  await check(`${layout} layout has no horizontal overflow at ${width}px`,async()=>{await expect(page.getByRole('heading',{name:'My Duties',exact:true})).toBeVisible();const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(result.scroll>result.width+1)throw new Error(JSON.stringify(result));});
  if(width===390)await page.screenshot({path:output+`/my-duties-${layout}.png`,fullPage:true});
 }
 await page.goto(new URL('/modules/worship-duty',target.origin).href,{waitUntil:'networkidle'});
 await check('integrated module remains behind the existing sign-in boundary',async()=>{if(!new URL(page.url()).pathname.startsWith('/sign-in'))throw new Error('Anonymous request did not reach sign-in.');});
 await check('no browser exceptions or original/backend data calls occurred',async()=>{if(errors.length||forbidden.length)throw new Error(JSON.stringify({errors,forbidden}));});
 console.log(JSON.stringify({passed:checks.length,failed:0,origin:target.origin}));
}finally{await writeFile(output+'/browser-results.json',JSON.stringify({checkedAt:new Date().toISOString(),origin:target.origin,checks,errors,forbiddenRequests:forbidden},null,2));await browser.close();}
