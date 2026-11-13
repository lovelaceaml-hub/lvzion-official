import {test,expect}from '@playwright/test';
test('open link with no content shows a quiet welcome and a full screen button, not a pairing form',async({page})=>{
 await page.goto('/display');
 await expect(page.getByRole('heading',{name:'Welcome.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Full screen'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Pair this display'})).toHaveCount(0);
 await expect(page.locator('a[href*="members"]')).toHaveCount(0);
});
test('optional pairing form stays available at ?pair=1 without member login',async({page})=>{
 await page.goto('/display?pair=1');
 await expect(page.getByRole('heading',{name:'Pair this display'})).toBeVisible();
 await expect(page.locator('input[aria-label="Pairing code"]')).toBeVisible();
 await expect(page.locator('a[href*="members"]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('anonymous management and device APIs expose no drafts or token',async({request})=>{
 const state=await request.get('/api/display/manage');
 expect([401,403]).toContain(state.status());
 const device=await request.get('/api/display/device');
 expect(device.status()).toBe(200);
 expect(await device.json()).toEqual({paired:false});
 const pair=await request.post('/api/display/device',{data:{code:'AAAAAAAAAAAA'}});
 expect([400,503]).toContain(pair.status());
 expect(pair.headers()['set-cookie']).toBeUndefined();
});
test('real TV rotation uses only a valid, mocked approved screen projection',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 const instant=Date.parse('2026-10-14T18:00:00-07:00');
 await page.clock.install({time:new Date(instant)});
 let revoked=false;
 await page.route('**/api/display/device',async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(revoked?{paired:false}:{
   paired:true,screen:'Lobby Display',version:1,
   serverTime:new Date(instant).toISOString(),leaseUntil:new Date(instant+30000).toISOString(),
   slides:[
    {id:'welcome',kind:'announcement',style:'editorial',title:'Fictional welcome',body:'Illustrative content only.',duration:8},
    {id:'event',kind:'event',style:'event',title:'Fictional event',body:'Illustrative content only.',date:'2026-10-20',time:'3:00 PM',location:'Sample location',duration:8}
   ]
  })});
 });
 await page.goto('/display');
 await expect(page.locator('.cd-style-editorial')).toBeVisible();
 expect(await page.locator('.cd-art i').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('cd-sway-one');
 await page.clock.runFor(8500);
 await expect(page.locator('.cd-style-event')).toBeVisible();
 expect(await page.locator('.cd-slide').count()).toBe(1);
 revoked=true;await page.clock.runFor(12500);
 await expect(page.getByRole('heading',{name:'Welcome.'})).toBeVisible();
});
test('system reduced motion disables active television effects',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 await page.emulateMedia({reducedMotion:'reduce'});
 const now=Date.now();
 await page.route('**/api/display/device',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  paired:true,screen:'Lobby Display',version:2,serverTime:new Date(now).toISOString(),leaseUntil:new Date(now+30000).toISOString(),
  slides:[{id:'approved',kind:'announcement',style:'editorial',title:'Synthetic approved card',body:'Not from any church account.',duration:12}]
 })}));
 await page.goto('/display');
 await expect(page.locator('.cd-style-editorial')).toBeVisible();
 expect(await page.locator('.cd-art i').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});
test('full screen button enters full screen and hides itself after a few seconds',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 await page.clock.install({time:new Date('2026-11-14T12:00:00-08:00')});
 await page.goto('/display');
 await page.getByRole('button',{name:'Full screen'}).click();
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await expect(page.getByRole('button',{name:'Exit full screen'})).toBeAttached();
 await page.clock.runFor(4500);
 await expect(page.locator('.cd-fullscreen')).toHaveAttribute('data-hidden','true');
 await page.mouse.move(200,200);
 await expect(page.locator('.cd-fullscreen')).not.toHaveAttribute('data-hidden','true');
});
