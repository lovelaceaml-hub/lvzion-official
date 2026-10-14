import{test,expect}from'@playwright/test';
const mod='77777777-7777-4777-8777-000000000001';
test('anonymous module-feed API never exposes app catalog or member activity',async({request})=>{
 const r=await request.get('/api/members/experience');
 expect(r.status()).toBe(401);
 expect(r.headers()['cache-control']).toContain('no-store');
 expect(await r.text()).not.toContain('Example Approved A');
});
test('invalid favorites request is rejected before any module SQL access',async({request})=>{
 const r=await request.post('/api/members/experience/favorites',{data:{moduleIds:[mod],expectedVersion:0},headers:{Origin:'https://evil.example'}});
 expect(r.status()).toBe(400);
 expect(r.headers()['cache-control']).toContain('no-store');
});
test('anonymous notice mutation denied and never accepts actor override',async({request})=>{
 const r=await request.post('/api/members/experience/notices',{data:{noticeId:'99999999-9999-4999-8999-000000000001',actorId:mod}});
 expect(r.status()).toBe(400);
 expect(await r.text()).not.toContain('Example Approved A');
});
test('unguessed or unapproved module route cannot render a member app',async({request})=>{
 const r=await request.get('/modules/sample-a',{maxRedirects:0});
 expect([302,303,307,308,404]).toContain(r.status());
 expect(await r.text()).not.toContain('Example Approved A');
});
test('the fictional concept home is still independent of live database',async({page})=>{
 await page.goto('/experience-preview');
 await expect(page.getByText('Fictional content only.')).toBeVisible();
 await page.getByRole('button',{name:'Open apps'}).click();
 await expect(page.getByRole('dialog',{name:'Applications'})).toContainText('not approved official apps');
});
