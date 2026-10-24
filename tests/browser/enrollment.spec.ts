import {test,expect} from '@playwright/test';
import {unassignedPreview} from '../../lib/enrollment-demo';
test('signup shows the activation boundary and accessible password manager fields',async({page,request})=>{
 await page.goto('/sign-up');await expect(page.getByRole('heading',{name:'Create your account.'})).toBeVisible();
 await expect(page.getByText('Account signup will open once email delivery is ready', {exact:false})).toBeVisible();
 await expect(page.getByLabel('First name',{exact:true})).toHaveAttribute('autocomplete','given-name');
 await expect(page.getByLabel('First name',{exact:true})).toHaveAttribute('required','');
 await expect(page.getByLabel('Last name',{exact:true})).toHaveAttribute('autocomplete','family-name');
 await expect(page.getByLabel('Last name',{exact:true})).toHaveAttribute('required','');
 await expect(page.getByLabel('Your name',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Personal email',{exact:true})).toHaveAttribute('autocomplete','username');
 await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('autocomplete','new-password');
 await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('minlength','6');
 await expect(page.getByText('Use at least 6 characters.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeDisabled();
 const response=await request.post('/api/auth/sign-up',{data:{email:'test@example.invalid',firstName:'Test',lastName:'Example',password:'SyntheticPassword!'}});expect(response.status()).toBe(503);
 expect(response.headers()['cache-control']).toContain('no-store');
});
test('Unassigned member shows own profile and no group navigation at phone size',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto('/enrollment-preview');
 await expect(page.getByRole('heading',{name:'My placement'})).toBeVisible();
 await expect(page.locator('.unassigned-placement').first().locator('dd')).toHaveText(['Unassigned','Unassigned','Unassigned']);
 await expect(page.getByText('First name',{exact:true})).toBeVisible();
 await expect(page.getByText('Last name',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Manage',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Open your group directory'})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('leader must choose the hierarchy and explicitly verify before assigning',async({page})=>{
 await page.goto('/enrollment-preview');await page.getByLabel('Fictional signup lifecycle').selectOption('leader');
 await page.getByRole('button',{name:'Manage',exact:true}).click();
 await page.getByRole('button',{name:'Placement',exact:true}).click();
 const queue=page.locator('section').filter({has:page.getByRole('heading',{name:'Unassigned members',exact:true})});
 await queue.getByLabel('Age category').selectOption({label:'Demo Age Category'});
 await queue.getByLabel('Group').selectOption({label:'Demo Group A'});
 await queue.getByLabel('Unit').selectOption({label:'Demo Unit A1'});
 await queue.getByLabel('Verification and placement reason').fill('Independently verified fictional identity');
 await queue.getByRole('button',{name:'Verify and assign member'}).click();
 await expect(queue.getByText('Verify membership and choose an authorized unit.')).toBeVisible();
 await queue.getByLabel('Membership and identity verified').selectOption('yes');
 await queue.getByRole('button',{name:'Verify and assign member'}).click();
 await expect(queue.getByText('No members are waiting for initial placement.')).toBeVisible();
 await expect(page.getByText('enrollment / assign',{exact:true})).toBeVisible();
});
test('leader can decline an unverified signup with retained history',async({page})=>{
 await page.goto('/enrollment-preview');await page.getByLabel('Fictional signup lifecycle').selectOption('leader');await page.getByRole('button',{name:'Manage',exact:true}).click();await page.getByRole('button',{name:'Placement',exact:true}).click();
 await page.getByText('Decline this signup',{exact:true}).click();await page.getByLabel('Reason for declining').fill('Verified fictional duplicate profile');await page.getByRole('button',{name:'Decline signup',exact:true}).click();
 await expect(page.getByText('enrollment / reject',{exact:true})).toBeVisible();
});
test('real member routes render intake as an own-record screen even on manage URL',async({page})=>{
 await page.route('**/api/members',r=>r.fulfill({json:unassignedPreview()}));await page.route('**/api/members/experience',r=>r.fulfill({status:503,json:{error:'No member access'}}));
 await page.goto('/members/manage?tab=manage');await expect(page.getByRole('heading',{name:'My placement'})).toBeVisible();await expect(page.getByRole('button',{name:'Manage',exact:true})).toHaveCount(0);
 await page.goto('/members');await expect(page.getByRole('heading',{name:'My profile'})).toBeVisible();
});
test('email confirmation GET never writes or exchanges a code',async({page})=>{
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});await page.goto('/signup/confirm?code=synthetic-long-confirmation-code');
 await expect(page.getByRole('button',{name:'Confirm and create my profile'})).toBeEnabled();expect(posts).toHaveLength(0);expect(page.url()).not.toContain('code=');
 await page.reload();
 await expect(page.getByRole('button',{name:'Confirm and create my profile'})).toBeEnabled();
 expect(posts).toHaveLength(0);
 await page.getByRole('button',{name:'Confirm and create my profile'}).focus();await expect(page.getByRole('button',{name:'Confirm and create my profile'})).toBeFocused();
});

test('browser-bound confirmation failure explains how to finish an already-confirmed profile',async({page})=>{
 await page.route('**/api/auth/signup-confirm',r=>r.fulfill({status:400,json:{error:'This link could not finish sign-in in this browser. If you already confirmed your email, sign in with the password you chose to finish your profile.',next:'/sign-in'}}));
 await page.goto('/signup/confirm?code=synthetic-long-confirmation-code');await page.getByRole('button',{name:'Confirm and create my profile'}).click();
 await expect(page.getByRole('link',{name:'Sign in to finish my profile'})).toHaveAttribute('href','/sign-in');
});

test('signup completion state survives refresh without retaining personal details',async({page})=>{
 await page.goto('/sign-up');
 await page.evaluate(()=>sessionStorage.setItem('lvz:signup:check-email',String(Date.now())));
 await page.reload();
 await expect(page.getByRole('heading',{name:'Check your email.'})).toBeVisible();
 await expect(page.getByLabel('First name',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Create another account'}).click();
 await expect(page.getByLabel('First name',{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('heading',{name:'Create your account.'})).toBeVisible();
});

test('fragment-based email confirmation can be refreshed before pressing Confirm',async({page})=>{
 const posts:string[]=[];
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/auth/confirm'))posts.push(r.url());});
 await page.goto('/auth/continue#token_hash=synthetic-long-confirmation-token-value&type=signup');
 await expect(page.getByRole('button',{name:'Confirm and continue'})).toBeEnabled();
 expect(page.url()).not.toContain('token_hash=');
 await page.reload();
 await expect(page.getByRole('button',{name:'Confirm and continue'})).toBeEnabled();
 expect(posts).toHaveLength(0);
});
