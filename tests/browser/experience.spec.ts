import{test,expect}from'@playwright/test';
const uid=(n:number)=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
test('new phone home provides Today, Week and 42-cell Calendar views',async({page})=>{
 await page.goto('/experience-preview');
 await expect(page.getByRole('heading',{name:/^Good (morning|afternoon|evening), /})).toBeVisible();
 await expect(page.getByText('Example Activity 01').first()).toBeVisible();
 await page.getByRole('button',{name:'Week',exact:true}).click();
 await expect(page.getByRole('heading',{name:'This week'})).toBeVisible();
 await page.locator('.lvz-period-tabs').getByRole('button',{name:'Calendar',exact:true}).click();
 await expect(page.locator('.lvz-day')).toHaveCount(42);
 await page.getByRole('button',{name:'Next month'}).click();
 await page.getByRole('button',{name:'Previous month'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('sample event details use a native bottom sheet and clearly disclaim fictional data',async({page})=>{
 await page.goto('/experience-preview');
 await page.locator('.lvz-activity').first().click();
 await expect(page.getByRole('dialog',{name:'Activity details'})).toBeVisible();
 await expect(page.getByText(/Sample-only content/)).toBeVisible();
 await page.getByRole('button',{name:'Close activity'}).click();
 await expect(page.getByRole('dialog',{name:'Activity details'})).toBeHidden();
});
test('central Apps switcher pins, reorders and opens only fictional concepts',async({page})=>{
 await page.goto('/experience-preview');
 await page.getByRole('button',{name:'Open apps'}).click();
 const dialog=page.getByRole('dialog',{name:'Applications'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText(/not approved official apps/)).toBeVisible();
 await dialog.getByRole('button',{name:'Pin Example Module C'}).click();
 await dialog.getByRole('button',{name:'Edit favorites'}).click();
 await dialog.getByRole('button',{name:'Move Example Module C up'}).click();
 await expect(dialog.getByText('2. Example Module C')).toBeVisible();
 await dialog.getByRole('button',{name:'Close applications'}).click();
 await expect(page.locator('.lvz-favorite-grid')).toContainText('Example Module C');
 await page.locator('.lvz-favorite-item').filter({hasText:'Example Module C'}).click();
 await expect(page.getByRole('dialog',{name:'App concept landing'})).toBeVisible();
 await expect(page.getByText(/No official app has been selected/)).toBeVisible();
});
test('notifications are scope-derived and hide request names or contact details',async({page})=>{
 await page.goto('/experience-preview');
 await page.getByRole('button',{name:'Notifications'}).click();
 await expect(page.getByText('Account request needs verification')).toBeVisible();
 await expect(page.locator('.lvz-notice-list')).not.toContainText('Isla Example');
 await expect(page.locator('.lvz-notice-list')).not.toContainText('@example.invalid');
 await page.getByRole('button',{name:/Account request needs verification/}).click();
 await expect(page.getByRole('heading',{name:/What needs/})).toBeVisible();
 await expect(page.getByRole('link',{name:/Open management tools/})).toBeVisible();
});
test('ordinary member cannot access Manage or other groups through shell',async({page})=>{
 await page.goto('/experience-preview');
 await page.getByLabel('Fictional home identity').selectOption(uid(107));
 await expect(page.getByRole('button',{name:/Manage/})).toHaveCount(0);
 await page.getByRole('button',{name:'Notifications'}).click();
 await expect(page.getByRole('heading',{name:'All clear here'})).toBeVisible();
 await expect(page.locator('.lvz-notifications')).not.toContainText('Isla Example');
});
test('live member shell fails closed without approved authenticated deployment',async({page})=>{
 await page.goto('/members');
 await expect(page.getByText(/Sign in to continue|Member workspace unavailable|Sign in required/)).toBeVisible();
 await expect(page.locator('.lvz-activity')).toHaveCount(0);
});
test('member roster preview links to home and honors profile/directory deep links',async({page})=>{
 await page.goto('/member-preview');
 await page.getByRole('link',{name:/next-generation Home/}).click();
 await expect(page).toHaveURL(/experience-preview/);
 await page.getByRole('link',{name:'My profile'}).click();
 await expect(page).toHaveURL(/tab=profile/);
 await expect(page.getByRole('heading',{name:'My profile'})).toBeVisible();
});

