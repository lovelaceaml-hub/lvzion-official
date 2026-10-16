import {test,expect} from '@playwright/test';
// Fictional members only, through intercepted responses. Set LVZ_SCREENSHOT_DIR to save review screenshots.
const shots=process.env.LVZ_SCREENSHOT_DIR;
const member=(n:number,name:string,extra:Record<string,unknown>={})=>({id:'44444444-4444-4444-8444-'+String(n).padStart(12,'0'),name,unit:'Demo Unit B1',automatic:false,enabled:false,locked:false,self:false,...extra});

test('group leader turns booking on for a member and the page fits a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 let members=[member(103,'Cara Example',{automatic:true,self:true}),member(104,'Devin Example',{enabled:true,locked:true}),member(108,'Hugo Example'),member(110,'Jade Example',{enabled:true})];
 const posts:unknown[]=[];
 await page.route('**/api/study-rooms/access',async route=>{
  if(route.request().method()==='POST'){
   const c=route.request().postDataJSON();posts.push(c);
   members=members.map(m=>m.id===c.memberId?{...m,enabled:c.action==='enable'}:m);
  }
  await route.fulfill({json:{groups:[{id:'22222222-2222-4222-8222-000000000002',name:'Demo Group B',members}]}});
 });
 await page.goto('/modules/study-rooms/members');
 await expect(page.getByRole('heading',{name:'Who can book'})).toBeVisible();
 await expect(page.getByRole('switch',{name:'Study Rooms for Cara Example'})).toBeDisabled();
 await expect(page.getByRole('switch',{name:'Study Rooms for Devin Example'})).toBeDisabled();
 const hugo=page.getByRole('switch',{name:'Study Rooms for Hugo Example'});
 await expect(hugo).toHaveAttribute('aria-checked','false');
 if(shots)await page.screenshot({path:`${shots}/group-access-before.png`,fullPage:true});
 await hugo.click();
 await expect(hugo).toHaveAttribute('aria-checked','true');
 await expect(page.getByRole('status')).toHaveText('Hugo Example can now book study rooms.');
 expect(posts).toEqual([{action:'enable',memberId:member(108,'').id}]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const small=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('main button,main a')].filter(e=>e.getBoundingClientRect().height<44).length);
 expect(small).toBe(0);
 if(shots)await page.screenshot({path:`${shots}/group-access-after.png`,fullPage:true});
});

test('a member who is not a group leader sees a calm explanation, not a list',async({page})=>{
 await page.route('**/api/study-rooms/access',r=>r.fulfill({status:403,json:{error:'Group leader access required.'}}));
 await page.goto('/modules/study-rooms/members');
 await expect(page.locator('main [role=alert]')).toHaveText('Only group leaders can change who books in their group.');
 await expect(page.getByRole('switch')).toHaveCount(0);
});

test('signed-out visitors cannot read or change group access',async({request})=>{
 expect((await request.get('/api/study-rooms/access')).status()).toBe(401);
 expect((await request.post('/api/study-rooms/access',{data:{action:'enable',memberId:member(108,'').id}})).status()).toBe(401);
});
