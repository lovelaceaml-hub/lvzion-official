import {test,expect} from '@playwright/test';
import {openStudyRoute} from './study-route-fixture';

test('today opens at current time and refresh preserves manual scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const fixture=await openStudyRoute(page,{nowMinute:855});
 const marker=page.getByRole('img',{name:'Current time 2:15 PM, Las Vegas'});
 await expect(marker).toBeVisible();
 const scroll=page.locator('.sr-scroll');
 expect(await scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(100);
 const geometry=await page.evaluate(()=>{
  const marker=document.querySelector('.sr-now-marker')!.getBoundingClientRect();
  const a=document.querySelector('tr[data-minute="840"]')!.getBoundingClientRect();
  const b=document.querySelector('tr[data-minute="870"]')!.getBoundingClientRect();
  return Math.abs(marker.top-(a.top+(b.top-a.top)/2));
 });
 expect(geometry).toBeLessThan(2);
 if(process.env.LVZ_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.LVZ_SCREENSHOT_DIR}/current-time.png`,fullPage:true});
 await scroll.evaluate(el=>el.scrollTop=50);
 await fixture.setNowMinute(856);
 await expect(page.getByRole('img',{name:'Current time 2:16 PM, Las Vegas'})).toBeAttached();
 expect(await scroll.evaluate(el=>el.scrollTop)).toBe(50);
 await page.locator('.sr-day').nth(1).click();
 await expect(page.locator('.sr-now-marker')).toHaveCount(0);
 await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBe(0);
});

for(const minute of [540,1400])test(`outside hours ${minute} uses schedule boundary`,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await openStudyRoute(page,{nowMinute:minute});
 await expect(page.locator('tr[data-minute]').first()).toBeAttached();
 await expect(page.locator('.sr-now-marker')).toHaveCount(0);
 const position=await page.locator('.sr-scroll').evaluate(el=>({top:el.scrollTop,max:el.scrollHeight-el.clientHeight}));
 expect(Math.abs(position.top-(minute<600?0:position.max))).toBeLessThan(2);
});
