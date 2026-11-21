import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {afterEach, beforeEach, test} from 'node:test';
import {authorizedSheet, refreshConcertSheet} from '../lib/concert/sheet-sync.ts';

const eventId = 'a1000000-0000-4000-8000-000000000001';
const sheetId = 'fictional_sheet';
const webhook = 'https://script.google.com/macros/s/test_deployment/exec';
const finalUrl = 'https://script.googleusercontent.com/macros/echo?user_content_key=fake&lib=test';
const original = process.env;

beforeEach(() => {
  process.env = {...original, LVZ_CONCERT_ATTENDANCE_SHEET:eventId+'/'+sheetId, LVZ_CONCERT_SHEET_WEBHOOK:webhook,
    LVZ_CONCERT_TOKEN_SECRET:randomBytes(32).toString('hex')};
});
afterEach(() => { process.env = original; });

test('posts only a bearer, then reads the ContentService acknowledgment without credentials', async t => {
  let token = '';
  const start = Date.UTC(2026, 5, 1);
  t.mock.method(Date, 'now', () => start);
  const send = t.mock.method(globalThis, 'fetch', async (url: string | URL, options: RequestInit) => {
    if (String(url) === webhook) {
      const payload = JSON.parse(String(options.body));
      assert.deepEqual(Object.keys(payload), ['token']);
      token = payload.token;
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'manual');
      assert.equal(new Headers(options.headers).get('content-type'), 'application/json');
      return Response.redirect(finalUrl, 302);
    }
    assert.equal(String(url), finalUrl);
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers, undefined);
    assert.equal(options.body, undefined);
    return Response.json({ok:true});
  });
  assert.equal(await refreshConcertSheet(), true);
  assert.equal(send.mock.callCount(), 2);
  const header = 'Bearer ' + token;
  assert.deepEqual(authorizedSheet(header), {eventId,sheetId});
  for (const invalid of [null, token, 'Bearer printed-ticket', header+'x', header.replace(/.$/, c => c==='A'?'B':'A')]) {
    assert.equal(authorizedSheet(invalid), null);
  }
  for (const binding of [eventId+'/different', 'b'+eventId.slice(1)+'/'+sheetId]) {
    process.env.LVZ_CONCERT_ATTENDANCE_SHEET = binding;
    assert.equal(authorizedSheet(header), null);
  }
  process.env.LVZ_CONCERT_ATTENDANCE_SHEET = eventId+'/'+sheetId;
  Date.now = () => start-1000;
  assert.equal(authorizedSheet(header), null);
  Date.now = () => start+119000;
  assert.ok(authorizedSheet(header));
  Date.now = () => start+120000;
  assert.equal(authorizedSheet(header), null);
});

test('invalid configuration and mismatched replay event never issue a request', async t => {
  const send = t.mock.method(globalThis, 'fetch', async () => Response.json({ok:true}));
  assert.equal(await refreshConcertSheet('another-event'), false);
  for (const url of ['', webhook+'?x', webhook+'#x', webhook.replace('https:', 'http:'), webhook.replace('.com', '.com.example.invalid'),
    webhook.replace('script.', 'user@script.'), webhook.replace('/exec', '/dev')]) {
    process.env.LVZ_CONCERT_SHEET_WEBHOOK = url;
    assert.equal(await refreshConcertSheet(), false);
  }
  process.env.LVZ_CONCERT_SHEET_WEBHOOK = webhook;
  process.env.LVZ_CONCERT_ATTENDANCE_SHEET = eventId+'/sheet/extra';
  assert.equal(await refreshConcertSheet(), false);
  assert.equal(send.mock.callCount(), 0);
});

test('blocks credential-forwarding redirects, redirect chains and sign-in pages', async t => {
  const send = t.mock.method(globalThis, 'fetch');
  for (const url of [finalUrl.replace('https:', 'http:'), finalUrl.replace('.com', '.com.example.invalid'),
    finalUrl.replace('/echo', '/other'), finalUrl.replace('script.', 'user@script.'), finalUrl.split('?')[0]]) {
    send.mock.mockImplementation(async () => Response.redirect(url, 302));
    const count = send.mock.callCount();
    assert.equal(await refreshConcertSheet(), false);
    assert.equal(send.mock.callCount(), count+1);
  }
  send.mock.mockImplementation(async () => Response.redirect(finalUrl, 307));
  assert.equal(await refreshConcertSheet(), false);
  send.mock.mockImplementation(async () => Response.redirect(finalUrl, 303));
  const count = send.mock.callCount();
  assert.equal(await refreshConcertSheet(), false);
  assert.equal(send.mock.callCount(), count+2);
  send.mock.mockImplementation(async () => new Response('<html>Sign in</html>'));
  assert.equal(await refreshConcertSheet(), false);
});

test('retries transient failures once and requires an explicit success receipt', async t => {
  let calls = 0;
  const send = t.mock.method(globalThis, 'fetch', async () =>
    ++calls === 1 ? new Response(null,{status:429}) : Response.json({ok:true}));
  assert.equal(await refreshConcertSheet(), true);
  assert.equal(calls, 2);
  for (const fail of [async () => { throw new TypeError('network error'); }, async () => new Response(null,{status:503}), async () => Response.json({ok:false})]) {
    const count = send.mock.callCount();
    send.mock.mockImplementation(fail);
    assert.equal(await refreshConcertSheet(), false);
    assert.equal(send.mock.callCount(), count+2);
  }
  const count = send.mock.callCount();
  send.mock.mockImplementation(async () => new Response(null,{status:403}));
  assert.equal(await refreshConcertSheet(), false);
  assert.equal(send.mock.callCount(), count+1);
});
