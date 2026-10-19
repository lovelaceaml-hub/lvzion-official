import {test,expect} from '@playwright/test';
import {openStudyRoute} from './study-route-fixture';
for(const width of [320,390,1280])test(`shared frame stays visible and opens authorized apps at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.route('**/api/members/avatar',r=>r.fulfill({json:{initials:'FE'}}));
 await page.route('**/api/members/experience',r=>r.fulfill({json:{modules:[],activities:[],notifications:[],favorites:[],favoriteVersion:0}}));
 await openStudyRoute(page,{nowMinute:855});
 const nav=page.getByRole('navigation',{name:'Main navigation'}),header=page.getByRole('banner',{name:'Application header'});
 await expect(header).toContainText('Study Rooms');await expect(header.getByRole('link',{name:'My profile'})).toHaveText('FE');
 await expect(nav.getByRole('button',{name:'Schedule',exact:true})).toHaveAttribute('aria-current','page');
 await nav.getByRole('button',{name:'Bookings',exact:true}).click();
 await expect(nav.getByRole('button',{name:'Bookings',exact:true})).toHaveAttribute('aria-current','page');
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 for(const el of [nav,header]){const b=await el.boundingBox();expect(b!.y).toBeGreaterThanOrEqual(0);expect(b!.y+b!.height).toBeLessThanOrEqual(844);}
 const actions=nav.locator(':scope > button, :scope > a');
 await expect(actions).toHaveCount(5);
 await expect(actions.nth(2)).toHaveAttribute('aria-label','Open apps');
 expect(await actions.evaluateAll(items=>items.every(el=>el.getBoundingClientRect().height>=44))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await nav.getByRole('button',{name:'Open apps'}).click();
 await expect(page.getByRole('dialog',{name:'Apps',exact:true})).toContainText('No applications have been assigned');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Apps',exact:true})).toBeHidden();
 await nav.getByRole('button',{name:'Schedule',exact:true}).click();
 await page.evaluate(()=>window.scrollTo(0,0));
 if(process.env.LVZ_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.LVZ_SCREENSHOT_DIR}/shared-frame-${width}.png`,fullPage:true});
});
test('frame adapts to another module and remains on access-denied screens',async({page})=>{
 await page.goto('/display-operations-review');
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await expect(page.getByRole('banner')).toContainText('Church Display');
 await expect(nav.getByRole('button',{name:'Content',exact:true})).toBeVisible();
 await expect(nav.getByRole('button',{name:'Screens'})).toBeVisible();
 await nav.getByRole('button',{name:'More',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'More options'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(nav.getByRole('button',{name:'More',exact:true})).toBeFocused();
});
test('avatar endpoint denies anonymous access without caching profile data',async({request})=>{
 const r=await request.get('/api/members/avatar');expect(r.status()).toBe(401);expect(r.headers()['cache-control']).toContain('no-store');expect(await r.json()).not.toHaveProperty('initials');
});
test('slim resource tabs attach to the header above dates and respect reduced motion',async({page})=>{
 await page.setViewportSize({width:320,height:760});
 await openStudyRoute(page);
 const days=page.locator('.sr-day');await expect(days).toHaveCount(4);
 await expect(days.first()).toHaveAttribute('data-today','true');
 const dates=await days.evaluateAll(items=>items.map(el=>({day:el.getAttribute('data-date')!,special:el.getAttribute('data-special')})));
 for(const date of dates)expect(date.special).toBe(String([2,6].includes(new Date(date.day+'T12:00:00Z').getUTCDay())));
 const headerElement=page.getByRole('banner',{name:'Application header'});
 await expect(page.locator('.sr-header-tabs')).toHaveCount(1);
 await expect(headerElement.locator('.app-frame-header-content .sr-header-tabs')).toHaveCount(1);
 const dateBox=await page.locator('.sr-date-window').boundingBox(),resourceBox=await page.locator('.sr-header-tabs').boundingBox();
 expect(resourceBox!.y+resourceBox!.height).toBeLessThanOrEqual(dateBox!.y+1);expect(resourceBox!.height).toBeLessThanOrEqual(50);
 const header=await headerElement.boundingBox();expect(header!.x).toBe(0);expect(header!.width).toBe(320);
 expect(resourceBox!.y).toBeGreaterThanOrEqual(header!.y);
 expect(resourceBox!.y+resourceBox!.height).toBeLessThanOrEqual(header!.y+header!.height+1);
 expect(dateBox!.y).toBeGreaterThanOrEqual(header!.y+header!.height-1);
 const orb=await page.locator('.app-frame-apps .app-frame-orb').boundingBox();expect(orb!.width).toBe(orb!.height);
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await page.locator('.app-frame-apps').evaluate(el=>getComputedStyle(el,'::after').animationName)).toBe('none');
 expect(await page.locator('.app-frame-apps .app-frame-orb').evaluate(el=>getComputedStyle(el,'::after').animationName)).toBe('none');
 expect(await days.first().evaluate(el=>getComputedStyle(el,'::after').animationName)).toBe('none');
});
test('four-date groups advance through longer authorized booking windows',async({page})=>{
 const {demoSchedule,addDay,vegasDay}=await import('../../lib/study-rooms/domain');
 const today=vegasDay();
 await page.route('**/api/study-rooms?**',r=>{const day=new URL(r.request().url()).searchParams.get('day')??today;return r.fulfill({json:{...demoSchedule(day,today),day,horizon:9}});});
 await page.goto('/modules/study-rooms');
 await expect(page.locator('.sr-day')).toHaveCount(4);
 for(let i=1;i<=4;i++){await page.getByRole('button',{name:'Next day',exact:true}).click();await expect(page.locator('.sr-day[aria-pressed="true"]')).toHaveAttribute('data-date',addDay(today,i));}
 await expect(page.locator('.sr-day').first()).toHaveAttribute('data-date',addDay(today,4));
 await page.locator('.sr-day').last().click();
 await expect(page.locator('.sr-day[aria-pressed="true"]')).toHaveAttribute('data-date',addDay(today,7));
 await page.getByRole('button',{name:'Next day',exact:true}).click();
 await expect(page.locator('.sr-day')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Next day',exact:true})).toBeDisabled();
});
