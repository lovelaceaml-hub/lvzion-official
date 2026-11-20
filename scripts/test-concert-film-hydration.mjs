// Run against the public RSVP page served by a local production build with a fictional event.
import {chromium, devices, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const url = new URL('/concert/rsvp', process.env.LVZ_CONCERT_QA_ORIGIN || 'http://127.0.0.1:3000');
if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('A loopback concert fixture is required.');
const film = await readFile(new URL('../tests/browser/fixtures/concert-retry.webm', import.meta.url));
const browser = await chromium.launch();
const {promise: hydrationGate, resolve: hydrate} = Promise.withResolvers();
try {
  const page = await browser.newPage({...devices['iPhone 13']});
  let available = false;
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'media') {
      return route.fulfill(available ? {contentType:'video/webm', body:film} : {status:503, body:''});
    }
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/_next/static/') && path.endsWith('.js')) await hydrationGate;
    return route.continue();
  });
  await page.goto(url.href, {waitUntil:'commit'});
  await page.waitForFunction(() => !!document.querySelector('video')?.error);
  hydrate();
  const retry = page.getByRole('button', {name:'Retry film'});
  await expect(retry).toBeInViewport();
  available = true;
  await retry.click();
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
  await expect(page.getByRole('button', {name:'Register', exact:true})).toBeInViewport();
  console.log('Public film retry passed after an error before hydration.');
} finally {
  hydrate();
  await browser.close();
}
