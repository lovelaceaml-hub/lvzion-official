import {expect,test} from '@playwright/test';
import {mockLocalBotChallenge} from './local-bot-challenge';

test('confirmation resend requires a deliberate action, handles refresh and never stores an email',async({page,baseURL})=>{
 await mockLocalBotChallenge(page,baseURL);
 const requests:{email:string}[]=[];
 await page.route('**/api/auth/resend-confirmation',async route=>{
  requests.push(route.request().postDataJSON());
  await route.fulfill({status:200,contentType:'application/json',
   headers:{'Cache-Control':'private, no-store'},
   body:JSON.stringify({message:'If an eligible account still needs email confirmation, a fresh link may arrive.'})});
 });
 await page.goto('/sign-up');
 await page.evaluate(()=>sessionStorage.setItem('lvz:signup:check-email',String(Date.now())));
 await page.reload();
 await expect(page.getByRole('heading',{name:'Check your email.'})).toBeVisible();
 expect(requests).toHaveLength(0);
 await page.getByText("Didn't receive the email?").click();
 await page.getByLabel('Email used to sign up').fill('fictional.member@example.invalid');
 await page.getByRole('button',{name:'Resend confirmation',exact:true}).click();
 await expect(page.getByText('If an eligible account still needs email confirmation',{exact:false})).toBeVisible();
 expect(requests).toEqual([{email:'fictional.member@example.invalid'}]);
 await expect(page.getByRole('button',{name:'Please wait one minute'})).toBeDisabled();
 expect(await page.evaluate(()=>Object.values(sessionStorage).every(v=>!v.includes('fictional.member@')))).toBe(true);
 await page.reload();
 await expect(page.getByRole('heading',{name:'Check your email.'})).toBeVisible();
 expect(requests).toHaveLength(1);
});

test('confirmation resend keeps user on the email step when delivery is unavailable',async({page,baseURL})=>{
 await mockLocalBotChallenge(page,baseURL);
 await page.route('**/api/auth/resend-confirmation',route=>route.fulfill({
  status:503,contentType:'application/json',body:JSON.stringify({error:'Confirmation emails are temporarily unavailable.'})
 }));
 await page.goto('/sign-up');
 await page.evaluate(()=>sessionStorage.setItem('lvz:signup:check-email',String(Date.now())));
 await page.reload();
 await page.getByText("Didn't receive the email?").click();
 await page.getByLabel('Email used to sign up').fill('test@example.invalid');
 await page.getByRole('button',{name:'Resend confirmation'}).click();
 await expect(page.getByRole('alert').filter({hasText:'Confirmation emails are temporarily unavailable.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Resend confirmation'})).toBeEnabled();
 await expect(page.getByRole('heading',{name:'Check your email.'})).toBeVisible();
});
