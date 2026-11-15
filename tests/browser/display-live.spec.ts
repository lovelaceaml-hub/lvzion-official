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
const videoPacket=()=>{const now=Date.now();return JSON.stringify({paired:true,screen:'Lobby Display',version:9,serverTime:new Date(now).toISOString(),leaseUntil:new Date(now+30000).toISOString(),
 operatingHours:[],overrideSlideId:null,overrideUntil:null,motionMode:'standard',
 slides:[{id:'promo-1',kind:'video',style:'editorial',title:'Fictional promo',media:'0123456789abcdef0123456789abcdef.mp4',duration:60}]});};
test('videos try sound first; when the browser blocks it they play silently until one tap turns sound on',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 // Act like a browser that refuses sound before the first tap.
 await page.addInitScript(()=>{
  let tapped=false;addEventListener('pointerdown',()=>{tapped=true;},true);
  HTMLMediaElement.prototype.play=function(){return !this.muted&&!tapped?Promise.reject(new DOMException('blocked','NotAllowedError')):Promise.resolve();};
 });
 await page.route('**/api/display/media/**',()=>{/* keep the fictional file loading */});
 await page.route('**/api/display/device',route=>route.fulfill({status:200,contentType:'application/json',body:videoPacket()}));
 await page.goto('/display');
 const sound=page.getByRole('button',{name:'Tap for sound'});
 await expect(sound).toBeVisible();
 expect(await page.locator('video').evaluate(v=>(v as HTMLVideoElement).muted)).toBe(true);
 await sound.click();
 await expect(sound).toHaveCount(0);
 expect(await page.locator('video').evaluate(v=>(v as HTMLVideoElement).muted)).toBe(false);
});
test('full screen on an upright phone turns the display to landscape',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/display/device',route=>route.fulfill({status:200,contentType:'application/json',body:videoPacket()}));
 await page.route('**/api/display/media/**',()=>{});
 await page.goto('/display');
 await page.getByRole('button',{name:'Full screen'}).click();
 // This test browser cannot lock orientation, so the display is turned sideways on screen.
 await expect(page.locator('.cd-screen')).toHaveClass(/cd-rotated/);
 const box=await page.locator('.cd-stage').boundingBox();
 expect(box&&box.height>box.width).toBe(true);
 // Turned sideways, the 16:9 display spans the full width of the upright phone.
 expect(box&&box.width>=385&&box.width<=391).toBe(true);
 await page.getByRole('button',{name:'Exit full screen'}).click();
 await expect(page.locator('.cd-screen')).not.toHaveClass(/cd-rotated/);
});
test('a new Mother\'s Love recognition switches the TV to the Mother\'s Love turn and welcomes it',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 const instant=Date.parse('2026-11-14T12:00:00-08:00');
 await page.clock.install({time:new Date(instant)});
 let latest='00000000-0000-4000-8000-000000000001';
 const mlRequests:string[]=[];
 await page.route('https://mothers-love.vercel.app/**',route=>{mlRequests.push(route.request().url());return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Fictional Mother\'s Love TV</title>'});});
 await page.route('**/api/display/device',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  paired:true,screen:'Lobby Display',version:11,serverTime:new Date(instant).toISOString(),leaseUntil:new Date(instant+30000).toISOString(),
  operatingHours:[],overrideSlideId:null,overrideUntil:null,motionMode:'standard',
  slides:[{id:'welcome-1',kind:'announcement',style:'editorial',title:'Fictional welcome',body:'Illustrative content only.',duration:60},
   {id:'ml-1',kind:'mothers-love',style:'editorial',title:"The Words of Mother's Love",duration:120}],
  mothersLove:{latestId:latest,latestAt:new Date(instant-60000).toISOString()}})}));
 await page.goto('/display');
 // First load only remembers the newest recognition; it does not jump.
 await expect(page.locator('.cd-style-editorial')).toBeVisible();
 await page.clock.runFor(13000);
 await expect(page.locator('.cd-ml-frame')).toHaveCount(0);
 // A recognition is published: the next check switches straight to Mother's Love and welcomes it.
 latest='00000000-0000-4000-8000-000000000002';
 await page.clock.runFor(13000);
 await expect(page.locator('.cd-ml-frame')).toHaveAttribute('src','https://mothers-love.vercel.app/display?welcome='+latest);
 await expect(page.locator('.cd-ml-frame')).toHaveAttribute('allow',/autoplay/);
});
test('take-turns slides: each loop plays the next two of the group',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 const instant=Date.parse('2026-11-15T12:00:00-08:00');
 await page.clock.install({time:new Date(instant)});
 const t=(id:string,rotate=false)=>({id,kind:'announcement',style:'editorial',title:'Fictional '+id,body:'Illustrative content only.',duration:8,...(rotate?{rotate:true}:{})});
 await page.route('**/api/display/device',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  paired:true,screen:'Lobby Display',version:12,serverTime:new Date(instant).toISOString(),leaseUntil:new Date(instant+30000).toISOString(),
  operatingHours:[],overrideSlideId:null,overrideUntil:null,motionMode:'still',
  slides:[t('intro'),t('promo-1',true),t('promo-2',true),t('promo-3',true)]})}));
 await page.goto('/display');
 await expect(page.locator('.cd-slide h1')).toHaveText('Fictional intro');
 const seen:string[]=[];
 for(let i=0;i<6;i++){
  await expect(page.locator('.cd-slide h1')).toBeVisible();
  seen.push((await page.locator('.cd-slide h1').textContent())!.replace('Fictional ',''));
  await page.clock.runFor(8300);
 }
 expect(seen).toEqual(['intro','promo-1','promo-2','intro','promo-3','promo-1']);
});
