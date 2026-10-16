import{test,expect}from'@playwright/test';
import type{Page}from'@playwright/test';
// Synthetic swipe: a quick horizontal touch over the given element.
async function swipe(page:Page,selector:string,dx:number,dy=0){
 await page.locator(selector).first().evaluate((el,[dx,dy])=>{
  const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+Math.min(r.height/2,120);
  const touch=(cx:number,cy:number)=>new Touch({identifier:1,target:el,clientX:cx,clientY:cy});
  el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(x,y)],changedTouches:[touch(x,y)]}));
  el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[touch(x+dx,y+dy)]}));
 },[dx,dy]);
}
test('swiping the day view moves between Today, Week and Calendar without wrapping',async({page})=>{
 await page.goto('/experience-preview');
 const tab=(name:string)=>page.getByRole('button',{name,exact:true});
 await expect(tab('Today')).toHaveAttribute('aria-pressed','true');
 await swipe(page,'.lvz-feature-section',120);
 await expect(tab('Today')).toHaveAttribute('aria-pressed','true');
 await swipe(page,'.lvz-feature-section',-120);
 await expect(tab('Week')).toHaveAttribute('aria-pressed','true');
 await swipe(page,'.lvz-feature-section',-40);
 await expect(tab('Week')).toHaveAttribute('aria-pressed','true');
 await swipe(page,'.lvz-feature-section',-120,100);
 await expect(tab('Week')).toHaveAttribute('aria-pressed','true');
 await swipe(page,'.lvz-feature-section',120);
 await expect(tab('Today')).toHaveAttribute('aria-pressed','true');
});
test('tapping the wordmark returns to Home from any section',async({page})=>{
 await page.goto('/experience-preview');
 await page.getByRole('button',{name:'Notifications'}).click();
 await expect(page.getByRole('heading',{name:'Notifications',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'LV Zion home'}).click();
 await expect(page.getByRole('heading',{name:/^Good (morning|afternoon|evening), /})).toBeVisible();
});
test('member workspace tabs also switch by swipe',async({page})=>{
 await page.goto('/member-preview');
 await swipe(page,'.members-app',-120);
 await expect(page.getByRole('button',{name:'My Group',exact:true})).toHaveAttribute('aria-current','page');
});
for(const path of ['/sign-in','/sign-up','/experience-preview','/member-preview','/install']){
 test(`${path} fits a 320px phone and uses the Day Sheet ground`,async({page})=>{
  await page.setViewportSize({width:320,height:700});await page.goto(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(242, 244, 241)');
 });
}
