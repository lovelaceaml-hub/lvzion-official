import {test,expect} from '@playwright/test';
test('roster rehearsal never accepts uploads or writes',async({page})=>{
 const mutations:string[]=[];page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/'))mutations.push(r.url());});
 await page.goto('/roster-preview');await expect(page.getByRole('heading',{name:'Review first. Import later.'})).toBeVisible();
 await expect(page.getByText('Records written: 0')).toBeVisible();await expect(page.locator('input[type=file]')).toHaveCount(0);
 await expect(page.getByText('Ready',{exact:true})).toHaveCount(3);
 await page.getByRole('button',{name:'Possible duplicates'}).click();await expect(page.getByText('Blocked',{exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'Placement problems'}).click();await expect(page.getByText(/outside the reviewing leader/)).toBeVisible();
 await expect(page.getByText('Records written: 0')).toBeVisible();expect(mutations).toHaveLength(0);
});
test('roster rehearsal fits a narrow phone',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto('/roster-preview');
 await expect(page.getByRole('button',{name:'Placement problems'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('install guide and manifest retain account gating',async({page,request})=>{
 await page.goto('/install');await expect(page.getByRole('heading',{name:'LV Zion, on your phone.'})).toBeVisible();
 await expect(page.getByText('Your account permissions apply on every device.',{exact:false})).toBeVisible();
 const response=await request.get('/manifest.webmanifest');expect(response.ok()).toBe(true);const manifest=await response.json();expect(manifest.start_url).toBe('/members');expect(manifest.display).toBe('standalone');expect(manifest.icons).toHaveLength(3);
 const sw=await request.get('/sw.js');expect(sw.headers()['cache-control']).toContain('no-store');
});
test('offline fallback contains no member record data',async({page})=>{
 await page.goto('/offline.html');await expect(page.getByRole('heading',{name:'Connection unavailable.'})).toBeVisible();
 await expect(page.locator('input,form')).toHaveCount(0);await expect(page.getByRole('link',{name:'Try again'})).toHaveAttribute('href','/members');
});
test('offline worker only stores the four public fallback assets',async({page,context})=>{
 await page.goto('/install');await page.getByRole('button',{name:'Enable offline fallback'}).click();
 await expect(page.getByRole('button',{name:'Offline fallback enabled'})).toBeVisible({timeout:15000});
 const keys=await page.evaluate(async()=>{const c=await caches.open('lvz-public-offline-v1');return(await c.keys()).map(r=>new URL(r.url).pathname).sort();});
 expect(keys).toEqual(['/icons/lvz-192.png','/icons/lvz-512.png','/icons/lvz-maskable-512.png','/offline.html'].sort());
 await context.setOffline(true);await page.goto('/members');await expect(page.getByRole('heading',{name:'Connection unavailable.'})).toBeVisible();
 await context.setOffline(false);
});
