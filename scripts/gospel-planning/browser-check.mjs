import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Accept only the isolated preview. Access-bearing URLs stay in the environment,
// never in committed source, screenshots or the result record.
const access = process.env.GOSPEL_PREVIEW_ACCESS;
if (!access) throw new Error('Set GOSPEL_PREVIEW_ACCESS to the authorized fictional preview URL.');
const root = new URL(access);
if (root.pathname !== '/gospel-planning-preview') throw new Error('Only the isolated Gospel Planning preview is permitted.');
const output = process.env.GOSPEL_CHECK_OUTPUT || '/tmp/gospel-browser';
await mkdir(output, { recursive: true });
const results = [], errors = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('pageerror', error => errors.push(error.message));
async function step(name, fn) { await fn(); results.push({ name, status: 'passed' }); console.log(`PASS ${name}`); }
const nav = label => page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
async function role(id) {
  const details = page.locator('.gp-controls');
  if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
  await page.getByLabel('Sample role', { exact: true }).selectOption(id);
}
const close = () => page.getByRole('button', { name: 'Close dialog' }).click();
const card = id => page.locator(`[data-session="${id}"]`);
async function openSession(id) {
  await nav('Preaching');
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await card(id).getByRole('button', { name: 'Review session' }).click();
}
async function noOverflow() {
  const size = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.client);
}
let created;
try {
  await page.goto(access, { waitUntil: 'networkidle' });
  await step('member Today renders with own next session and no restricted review', async () => {
    await expect(page.getByRole('heading', { name: 'A clear next step.' })).toBeVisible();
    await expect(page.getByText('Sample Unit B restricted update.', { exact: false })).toHaveCount(0);
    await expect(card('session-next')).toBeVisible(); await noOverflow();
    await page.screenshot({ path: `${output}/01-member-today.png`, fullPage: true });
  });
  await step('availability failed save retains the form and retry succeeds', async () => {
    await role('milo'); await page.getByLabel('Fail the next save to test recovery').check();
    await nav('Preaching'); await page.getByRole('button', { name: 'My availability', exact: true }).click();
    await page.screenshot({ path: `${output}/02-availability.png`, fullPage: true });
    await page.getByRole('button', { name: 'Edit availability', exact: true }).click();
    await page.getByRole('button', { name: 'Save availability', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Nothing was saved');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Save availability', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Version 2 · Visible here only to you.', { exact: false })).toBeVisible();
  });
  await step('manual proposal creates no partner acceptance', async () => {
    await page.getByRole('button', { name: 'Sessions', exact: true }).click();
    await page.getByRole('button', { name: 'Plan a session', exact: true }).click();
    await expect(page.getByLabel('First participant')).toHaveValue('milo');
    await expect(page.getByLabel('Second participant')).toHaveValue('evan');
    await page.getByRole('button', { name: 'Save session proposal' }).click();
    created = await page.locator('[data-session]').last().getAttribute('data-session');
    expect(created).toMatch(/^gp-/); await expect(card(created)).toContainText('Proposal');
  });
  await step('publisher reviews proposal without accepting for participants', async () => {
    await role('ari'); await nav('Manage'); await card(created).getByRole('button', { name: 'Review session' }).click();
    await page.getByRole('button', { name: 'Publish reviewed version' }).click();
    await expect(page.locator('.gp-response-list')).toContainText('Response pending');
    await expect(page.getByRole('dialog')).toContainText('published · version 1'); await close();
  });
  await step('participant explicitly accepts the published version', async () => {
    await role('milo'); await openSession(created); await page.getByRole('button', { name: 'I can join', exact: true }).click();
    await expect(page.locator('.gp-response-list')).toContainText('Accepted this version'); await close();
  });
  await step('material revision requires reconfirmation and retains the previous hold', async () => {
    await role('ari'); await nav('Manage'); await card(created).getByRole('button', { name: 'Review session' }).click();
    await page.getByRole('button', { name: 'Revise proposal' }).click();
    await page.getByLabel('From', { exact: true }).fill('16:00'); await page.getByLabel('Until', { exact: true }).fill('17:00');
    await page.getByLabel('Approved sample location').selectOption('plaza');
    await page.getByRole('button', { name: 'Save revised proposal' }).click();
    await card(created).getByRole('button', { name: 'Review session' }).click();
    await expect(page.getByRole('dialog')).toContainText('proposal · version 2');
    await expect(page.locator('.gp-response-list')).toContainText('previous time held');
    await page.getByRole('button', { name: 'Publish reviewed version' }).click(); await close();
  });
  await step('both participants reconfirm the reviewed revision', async () => {
    for (const id of ['milo', 'evan']) { await role(id); await openSession(created); await page.getByRole('button', { name: 'I can join', exact: true }).click(); await close(); }
    await openSession(created); await expect(page.locator('.gp-response-list').getByText('Accepted this version', { exact: true })).toHaveCount(2); await close();
  });
  await step('shared report and correction do not duplicate session totals', async () => {
    await role('milo'); await page.getByRole('button', { name: 'Advance preview to Sunday' }).click(); await openSession(created);
    await page.getByRole('button', { name: 'Record shared result', exact: true }).click();
    await page.getByLabel('Group-safe sample result').fill('Fictional session took place. Next action stays separate from contact details.');
    await page.getByRole('button', { name: 'Save shared result', exact: true }).click();
    await role('evan'); await openSession(created); await expect(page.getByRole('dialog')).toContainText('Canonical report · v1');
    await page.getByRole('button', { name: 'Correct shared result' }).click();
    await page.getByLabel('Correction reason').fill('Clarified the sample result after partner review.');
    await page.getByRole('button', { name: 'Save report correction' }).click(); await openSession(created);
    await expect(page.getByRole('dialog')).toContainText('Canonical report · v2');
    await page.screenshot({ path: `${output}/05-session-report.png`, fullPage: true }); await close(); await nav('Today');
    await expect(page.locator('.gp-summary>div').nth(2).locator('strong')).toHaveText('1');
  });
  await step('Contacts handoff stays unavailable with no inferred sharing', async () => {
    await openSession(created); await page.getByRole('button', { name: 'Check Contacts handoff' }).click();
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('No contact was created, opened or shared'); await close();
  });
  await step('four sections and private replacement draft preserve the publication', async () => {
    await role('ari'); await nav('Manage');
    for (const name of ['Member Updates', 'Gospel Review', 'Gospel Plan', 'Request for Overseer']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/03-leader-week.png`, fullPage: true });
    await page.getByRole('button', { name: 'Edit draft', exact: true }).click();
    await page.getByLabel('Gospel plan', { exact: true }).fill('Fictional reviewed weekly plan: arrange Friday partners and confirm the location.');
    await page.getByRole('button', { name: 'Save private draft' }).click(); await nav('My Group');
    await expect(page.getByText('Published version 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Fictional reviewed weekly plan:', { exact: false })).toHaveCount(0);
    await nav('Manage'); await page.getByRole('button', { name: 'Review publication' }).click();
    await expect(page.getByRole('dialog')).not.toContainText('Sample Unit B restricted update');
    await page.getByRole('button', { name: 'Publish this version' }).click();
  });
  await step('member sees the safe published plan and names-only own-group list', async () => {
    await role('milo'); await nav('My Group'); await expect(page.getByText('Fictional reviewed weekly plan:', { exact: false })).toBeVisible();
    await expect(page.getByText('Sample Unit B restricted update', { exact: false })).toHaveCount(0);
    await page.getByText('Permitted group names', { exact: false }).click(); await expect(page.getByText('Sage Park', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${output}/04-published-group.png`, fullPage: true });
  });
  await step('unit scope hides other-unit items and group publisher controls', async () => {
    await role('nolan'); await nav('Manage'); await expect(page.getByText('Sample Unit A support request:', { exact: false })).toBeVisible();
    await expect(page.getByText('Sample Unit B restricted update', { exact: false })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Review publication' })).toHaveCount(0);
  });
  await step('assigned overseer responds with retained clarification history', async () => {
    await role('reese'); await nav('Manage'); await expect(page.getByText('Sample Unit A support request:', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Respond to request' }).click(); await page.getByLabel('Next state').selectOption('clarification');
    await page.getByLabel('Sample response').fill('Please clarify the fictional Friday coordination time.');
    await page.getByRole('button', { name: 'Save response' }).click(); await expect(page.locator('.gp-inset')).toContainText('clarification');
    await page.screenshot({ path: `${output}/06-overseer-review.png`, fullPage: true });
  });
  await step('other-group and technical-only personas cannot open ministry records', async () => {
    await role('sage'); await nav('Preaching'); await expect(page.locator('[data-session]')).toHaveCount(0);
    await role('alex'); await expect(page.getByRole('heading', { name: 'No Gospel Planning access' })).toBeVisible();
  });
  await step('revoked app access removes the workspace without reload', async () => {
    await role('milo'); await page.getByRole('button', { name: 'Simulate access revoked' }).click();
    await expect(page.getByRole('heading', { name: 'No Gospel Planning access' })).toBeVisible();
    await page.getByRole('button', { name: 'Reset sample week' }).click();
  });
  await step('dialog traps focus, Escape dismisses and restores the opener', async () => {
    await role('milo'); await nav('Preaching'); await page.getByRole('button', { name: 'My availability', exact: true }).click();
    const opener = page.getByRole('button', { name: 'Edit availability', exact: true }); await opener.click();
    for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true); }
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(opener).toBeFocused();
  });
  await step('320px and desktop layouts and forms do not overflow', async () => {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await role('ari'); await nav('Manage'); await noOverflow();
      await page.getByRole('button', { name: 'Edit draft', exact: true }).click();
      expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true); await close();
      await page.screenshot({ path: `${output}/layout-${width}.png`, fullPage: true });
    }
  });
  await step('live API GET and POST remain 503 and private no-store', async () => {
    for (const method of ['GET', 'POST']) {
      const response = await context.request.fetch(`${root.origin}/api/gospel-planning`, { method, data: method === 'POST' ? { kind: 'session.create' } : undefined });
      expect(response.status()).toBe(503); expect(response.headers()['cache-control']).toContain('no-store');
      expect(await response.json()).toEqual({ error: 'module_unavailable', message: 'This application is not activated.' });
    }
  });
  await step('no browser runtime errors', async () => expect(errors).toEqual([]));
} catch (error) {
  results.push({ name: 'failure', status: 'failed', message: String(error.message).slice(0, 1500) });
  console.error('FAIL', String(error.message).slice(0, 1200));
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {}); process.exitCode = 1;
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ deployment: root.origin, route: root.pathname, results, runtimeErrors: errors, scope: 'Chromium fictional UI only; not hosted member Auth, DB concurrency or physical device verification' }, null, 2));
  console.log('SUMMARY', JSON.stringify({ passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status === 'failed').length }));
  await browser.close();
}
