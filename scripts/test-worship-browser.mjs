// Production components with real local Auth cookies and database records, never hosted accounts.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const root='/tmp/lvz-worship-integration',base='http://127.0.0.1:3000';
if(process.env.LVZ_WORSHIP_INTEGRATION!=='true'||process.env.VERCEL)throw new Error('Explicit local Worship testing required.');
const f=JSON.parse(readFileSync(root+'/worship-fixtures.json','utf8')),normal=JSON.parse(readFileSync(root+'/fixtures.json','utf8'));
// Optional: write phone and desktop screenshots of the fictional fixture screens to this directory.
const shots=process.env.LVZ_WORSHIP_SCREENSHOT_DIR;
const songCode='BROWSER-'+Date.now();
// The integration fixture moves its service eight days ahead; plan in that Las Vegas month.
const serviceMonth=new Date(Date.now()+8*86400000).toLocaleDateString('en-CA',{timeZone:'America/Los_Angeles'}).slice(0,7);
// LVZ_CHROMIUM_PATH optionally points at an already installed local Chromium.
const browser=await chromium.launch({headless:true,executablePath:process.env.LVZ_CHROMIUM_PATH||undefined});let passes=0;
const check=(label,value)=>{assert(value,label);passes++;console.log('PASS: '+label);};
async function login(c,email,password){const r=await c.request.post(base+'/api/auth/sign-in',{headers:{Origin:base},data:{identifier:email,password}});assert.equal(r.status(),200);}
// Viewport captures, as a member sees the screen with the fixed header and bottom bar; focus scrolls a section into view.
async function capture(page,name,focus){if(!shots)return;for(const [label,width,height] of [['phone',390,844],['desktop',1280,900]]){await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));if(focus)await focus.evaluate(e=>e.scrollIntoView({block:'start'}));if(focus)await page.evaluate(()=>scrollBy(0,-90));await page.waitForTimeout(150);await page.screenshot({path:`${shots}/${name}-${label}.png`});}await page.setViewportSize({width:390,height:844});}
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
try{
 const owner=await browser.newContext({viewport:{width:390,height:844}});await login(owner,f.email,f.password);const page=await owner.newPage();
 const sections=page.getByRole('navigation',{name:'Worship workspace sections'}),setupTabs=page.getByRole('navigation',{name:'Setup sections'});
 await page.goto(base+'/members');await page.getByRole('button',{name:'Open apps',exact:true}).waitFor();await page.waitForLoadState('networkidle');await page.getByRole('button',{name:'Open apps',exact:true}).click();
 await page.locator('dialog[open] button.lvz-app-open').filter({hasText:'Worship Duty'}).click();
 await page.getByRole('heading',{name:'My Duties',exact:true}).waitFor();check('real Unassigned owner opens Worship through existing Apps',true);
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await nav.getByRole('button',{name:'Manage'}).waitFor();
 check('shared frame shows Home, My Duties, Apps, Manage and More',await nav.getByRole('button',{name:'My Duties'}).isVisible()&&await nav.getByRole('button',{name:'Manage'}).isVisible()&&await nav.getByRole('button',{name:'Open apps'}).isVisible()&&await nav.getByRole('button',{name:'Home'}).isVisible()&&await nav.getByRole('button',{name:'More'}).isVisible());
 const palette=e=>({module:e.dataset.lvzModule,ground:getComputedStyle(e).getPropertyValue('--lvz-ground').trim().toLowerCase(),accent:getComputedStyle(e).getPropertyValue('--lvz-accent').trim().toLowerCase(),title:e.querySelector('.app-frame-heading .app-frame-name strong')?.textContent});
 const light=await page.locator('.app-frame').evaluate(palette);
 check('shared registry applies the Liquid Opal sapphire palette to Worship',light.module==='worship-duty'&&light.ground==='#eaf0ff'&&light.title==='Worship Duty');
 await nav.getByRole('button',{name:'Manage'}).click();await page.getByRole('heading',{name:'Manage',exact:true}).waitFor();check('bottom bar switches the Worship section',true);
 await nav.getByRole('button',{name:'My Duties'}).click();await page.getByRole('heading',{name:'My Duties',exact:true}).waitFor();

 await page.getByRole('link',{name:'Setup',exact:true}).click();await page.getByRole('heading',{name:'Setup',exact:true}).waitFor();await page.getByRole('heading',{name:'Create service'}).waitFor();
 await setupTabs.getByRole('button',{name:'People'}).click();await page.getByRole('heading',{name:'Approved personnel'}).waitFor();
 await setupTabs.getByRole('button',{name:'Songs'}).click();check('owner-only setup loads actual persisted services and catalog',await page.getByText('Fictional approved song',{exact:false}).count()>0);
 for(const tab of ['Services','People','Songs']){await setupTabs.getByRole('button',{name:tab}).click();for(const width of [320,390,430,768,1280]){await page.setViewportSize({width,height:900});check(`setup ${tab} has no horizontal overflow at ${width}`,await noOverflow(page));}}
 await page.setViewportSize({width:390,height:844});const form=page.locator('form').filter({has:page.getByRole('button',{name:'Add approved song',exact:true})});await form.getByLabel('Song code',{exact:true}).fill(songCode);await form.getByLabel('Song title',{exact:true}).fill('Fictional browser song');await form.getByLabel('Duration (seconds)').fill('120');await form.getByRole('button',{name:'Add approved song',exact:true}).click();await page.getByText('Saved and verified.',{exact:true}).waitFor();
 await page.reload();await setupTabs.getByRole('button',{name:'Songs'}).click();await page.getByText(songCode+' | Fictional browser song',{exact:true}).waitFor();check('owner catalog save persists across an authenticated page reload',true);
 await setupTabs.getByRole('button',{name:'Services'}).click();await page.getByRole('heading',{name:'Create service'}).waitFor();await capture(page,'setup');

 await page.goto(base+'/modules/worship-duty');await sections.getByRole('button',{name:'Manage'}).waitFor();await sections.getByRole('button',{name:'Manage'}).click();await page.getByRole('heading',{name:'Monthly planner'}).waitFor();
 await page.getByLabel('Month',{exact:true}).fill(serviceMonth);await page.getByLabel('Planner service',{exact:true}).waitFor();
 check('list planner offers the fixture service in its month',await page.getByLabel('Planner service',{exact:true}).locator(`option[value="${f.serviceId}"]`).count()===1);
 await page.getByRole('button',{name:'Show calendar'}).click();const grid=page.getByRole('group',{name:/^Services in /});await grid.waitFor();
 check('calendar shows a Sunday-first month grid',await grid.locator('abbr').count()===7&&await grid.getByRole('button').count()>=28);
 const serviceDays=grid.locator('button[data-services="true"]');check('only days with services can be chosen',await serviceDays.count()>=1&&await grid.locator('button:disabled').count()>=20);
 await serviceDays.first().click();check('choosing a day selects it',await serviceDays.first().getAttribute('aria-pressed')==='true');
 await page.getByRole('region',{name:'Services on the chosen day'}).getByRole('button',{name:/Sabbath Day · Morning/}).click();await page.getByLabel('Planner duty',{exact:true}).waitFor();check('calendar day opens that service in the planner',true);
 await page.getByLabel('Planner duty',{exact:true}).selectOption('usher_1');await page.getByLabel('Proposed member').selectOption('');await page.getByRole('button',{name:'Stage assignment'}).click();await page.getByRole('button',{name:'Review assignment batch'}).click();await page.getByRole('region',{name:'Assignment batch review'}).waitFor();check('monthly assignment changes require a visible batch review',true);
 await capture(page,'manage',page.getByRole('heading',{name:'Monthly planner'}));
 await page.getByRole('button',{name:'Apply reviewed assignments'}).click();await page.getByText('Saved.',{exact:true}).waitFor();check('reviewed batch saves through authenticated API into PostgreSQL',true);
 for(const width of [320,390,430,768,1280]){await page.setViewportSize({width,height:900});check('planner has no horizontal overflow at '+width,await noOverflow(page));}
 await page.setViewportSize({width:390,height:844});

 await sections.getByRole('button',{name:'Presider'}).click();await page.getByLabel('Glory song').waitFor();await page.getByLabel('Glory song').selectOption({label:songCode+' · Fictional browser song'});
 page.once('dialog',d=>d.dismiss());await sections.getByRole('button',{name:'Manage'}).click();check('cancelled navigation retains the unsaved real service song plan',await page.getByRole('heading',{name:'Presider',exact:true}).isVisible());
 await page.getByRole('button',{name:'Add preparation song'}).click();await page.getByRole('button',{name:'Add preparation song'}).click();
 await page.getByLabel('Preparation song 1').selectOption({label:songCode+' · Fictional browser song'});await page.getByLabel('Preparation song 2').selectOption({label:'FIXTURE-01 · Fictional approved song'});
 const browserSong=await page.getByLabel('Glory song').inputValue(),fixtureSong=await page.getByLabel('Preparation song 2').inputValue();
 await page.getByRole('button',{name:'Move song 2 up'}).click();check('reordering moves the chosen preparation song first',await page.getByLabel('Preparation song 1').inputValue()===fixtureSong&&await page.getByLabel('Preparation song 2').inputValue()===browserSong);
 await page.getByRole('button',{name:'Save plan',exact:true}).click();await page.getByText('Saved.',{exact:true}).waitFor();
 await page.reload();await sections.getByRole('button',{name:'Presider'}).click();await page.getByLabel('Glory song').waitFor();
 check('song plan persists for the exact service',await page.getByLabel('Glory song').inputValue()===browserSong);
 check('preparation order persists after reload',await page.getByLabel('Preparation song 1').inputValue()===fixtureSong&&await page.getByLabel('Preparation song 2').inputValue()===browserSong);
 await page.getByRole('button',{name:'Confirm plan',exact:true}).click();await page.getByText('Saved.',{exact:true}).waitFor();check('presider confirms the plan',await page.getByText('Confirmed',{exact:true}).isVisible());
 await page.getByRole('button',{name:'Copy song plan'}).click();const preview=await page.getByLabel('Share preview').inputValue();check('copied song plan is a local preview only',preview.includes('Glory: Fictional browser song')&&preview.includes('Nothing was sent.'));
 await capture(page,'presider',page.getByRole('heading',{name:'Song plan'}));

 const outsider=await browser.newContext();const denied=await outsider.request.get(base+'/api/worship-duty/setup');check('anonymous owner setup API returns no personnel',denied.status()===401);const forged=await owner.request.post(base+'/api/worship-duty/setup',{headers:{Origin:'https://untrusted.example'},data:{op:'song',code:'BAD',title:'Bad',seconds:10,expectedVersion:0}});check('cross-origin mutation rejected before RPC',forged.status()===400);
 const member=await browser.newContext({viewport:{width:390,height:844}});await login(member,'test-102@example.invalid',normal.password);const noSetup=await member.request.get(base+'/api/worship-duty/setup');check('ordinary authenticated member cannot read owner setup',noSetup.status()===403);
 // The fixture's second member (test-101) holds Usher #2 on the published service.
 const leader=await browser.newContext({viewport:{width:390,height:844}});await login(leader,'test-101@example.invalid',normal.password);
 const assigned=await leader.newPage();await assigned.goto(base+'/modules/worship-duty');await assigned.getByRole('heading',{name:'My Duties',exact:true}).waitFor();
 check('assigned member sees their published duty card',await assigned.locator('.wd-cards').getByText('Usher #2',{exact:true}).waitFor({timeout:10000}).then(()=>true,()=>false));
 check('assigned member has no Setup link',await assigned.getByRole('link',{name:'Setup',exact:true}).count()===0);
 await capture(assigned,'my-duties');
 // Dark mode (device set to dark, appearance on System): Worship is dark by design, so the palette must be identical.
 const night=await browser.newContext({viewport:{width:390,height:844},colorScheme:'dark'});await login(night,'test-101@example.invalid',normal.password);
 const dark=await night.newPage();await dark.goto(base+'/modules/worship-duty');await dark.getByRole('heading',{name:'My Duties',exact:true}).waitFor();
 check('Dark scheme resolves on the Worship page',await dark.evaluate(()=>document.documentElement.dataset.lvzScheme==='dark'));
 const darkPalette=await dark.locator('.app-frame').evaluate(palette);check('Dark mode uses the midnight sapphire companion',darkPalette.ground==='#061122'&&darkPalette.accent!==light.accent&&darkPalette.module==='worship-duty');
 check('Dark mode duty card stays readable',await dark.locator('.wd-cards').getByText('Usher #2',{exact:true}).waitFor({timeout:10000}).then(()=>true,()=>false));
 await capture(dark,'my-duties-dark');await night.close();
 await owner.close();await outsider.close();await member.close();await leader.close();console.log(`PASS: ${passes} real local browser checks.`);
}finally{await browser.close();}
