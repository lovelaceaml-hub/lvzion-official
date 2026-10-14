import {chromium,expect} from '@playwright/test';
const origin=new URL(process.env.WM_PREVIEW_URL || 'http://localhost:3000').origin;
if(!/\.vercel\.app$|\.vercel\.run$/.test(new URL(origin).hostname)&&!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Development preview only.');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],viewport:{width:390,height:844}});
 const page=await context.newPage();
 if(process.env.WM_AUTH_URL){const u=new URL(process.env.WM_AUTH_URL);if(u.origin!==origin)throw new Error('Preview origin mismatch.');await page.goto(u.toString(),{waitUntil:'networkidle'});}
 await page.goto(origin+'/wm-prayer-preview?view=lesson&role=sharer',{waitUntil:'networkidle'});
 for(const label of ['1. Lesson outline','2. Three lenses','3. Learning path']){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.getByRole('button',{name:'Prepare approved outputs'}).click();
  const expected=await page.getByLabel('Approved fictional text').inputValue();
  await page.getByRole('button',{name:'Copy explanation',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('gathering date copied');
  const actual=await page.evaluate(()=>navigator.clipboard.readText());
  expect(actual).toBe(expected);
  expect(actual).toContain('Tuesday, October 13, 2026');
  expect(actual).toContain('FICTIONAL');
 }
 console.log('PASS: 3 clipboard/date equality checks. Fictional content only; no messages sent.');
}finally{await browser.close();}
