import {createHmac, timingSafeEqual} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {after} from 'next/server.js';

const lifetimeSeconds = 120;
const bindingPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([a-z0-9_-]+)$/i;
const webhookPattern = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

function configuration() {
  const match = bindingPattern.exec(process.env.LVZ_CONCERT_ATTENDANCE_SHEET ?? '');
  const webhook = process.env.LVZ_CONCERT_SHEET_WEBHOOK;
  const secret = process.env.LVZ_CONCERT_TOKEN_SECRET;
  if (!match || !webhook || !webhookPattern.test(webhook) || !secret || secret.length < 32) return null;
  return {eventId:match[1].toLowerCase(), sheetId:match[2], webhook, secret};
}

type Configuration = NonNullable<ReturnType<typeof configuration>>;

function signature(config: Configuration, expiry: string) {
  return createHmac('sha256', config.secret)
    .update(JSON.stringify(['concert-sheet-snapshot:v1', config.eventId, config.sheetId, expiry]))
    .digest('base64url');
}

export function authorizedSheet(authorization: string | null) {
  const config = configuration();
  const match = /^Bearer v1\.(\d{10})\.([A-Za-z0-9_-]{43})$/i.exec(authorization ?? '');
  if (!config || !match) return null;
  const now = Math.floor(Date.now() / 1000);
  if (+match[1] <= now || +match[1] > now + lifetimeSeconds) return null;
  if (!timingSafeEqual(Buffer.from(signature(config, match[1])), Buffer.from(match[2]))) return null;
  return {eventId:config.eventId, sheetId:config.sheetId};
}

function contentServiceLocation(location: string | null) {
  if (!location || !URL.canParse(location)) return null;
  const url = new URL(location);
  if (url.origin !== 'https://script.googleusercontent.com' || url.pathname !== '/macros/echo' ||
      url.username || url.password || url.hash || !url.searchParams.get('user_content_key') || !url.searchParams.get('lib')) return null;
  return url;
}

async function deliver(config: Configuration): Promise<'confirmed' | 'retry' | 'failed'> {
  const expiry = String(Math.floor(Date.now() / 1000) + lifetimeSeconds);
  const token = 'v1.' + expiry + '.' + signature(config, expiry);
  const options = {cache:'no-store', redirect:'manual', credentials:'omit', signal:AbortSignal.timeout(12_000)} as const;
  try {
    let response = await fetch(config.webhook, {...options, method:'POST',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({token})});
    if (response.status === 302 || response.status === 303) {
      const location = contentServiceLocation(response.headers.get('location'));
      await response.body?.cancel();
      if (!location) return 'failed';
      response = await fetch(location, {...options, method:'GET'});
    }
    if (!response.ok) {
      await response.body?.cancel();
      return [408, 429].includes(response.status) || response.status >= 500 ? 'retry' : 'failed';
    }
    const receipt = await response.json().catch(() => null);
    if (receipt?.ok === true) return 'confirmed';
    return receipt?.ok === false ? 'retry' : 'failed';
  } catch {
    return 'retry';
  }
}

export async function refreshConcertSheet(eventId?: string) {
  const config = configuration();
  if (!config || (eventId !== undefined && config.eventId !== eventId)) return false;
  let result = await deliver(config);
  if (result === 'retry') {
    await delay(300);
    result = await deliver(config);
  }
  return result === 'confirmed';
}

export function scheduleConcertSheetSync() {
  if (!process.env.LVZ_CONCERT_SHEET_WEBHOOK) return;
  after(async () => {
    if (!await refreshConcertSheet()) console.warn('Concert spreadsheet refresh was not confirmed.');
  });
}
