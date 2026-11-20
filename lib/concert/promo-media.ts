import 'server-only';

function playbackUrl(value: string | undefined) {
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try {
    const url = new URL(value);
    if (url.username || url.password) return undefined;
    if (url.protocol === 'https:' || (process.env.LVZ_DATABASE_ENV === 'local' && url.protocol === 'http:' && url.hostname === '127.0.0.1')) return url.href;
  } catch { /* Invalid configuration uses the illustrated fallback. */ }
  return undefined;
}

// These URLs must point to a host that enforces media access itself.
export function concertPromoMedia() {
  return {
    video: playbackUrl(process.env.LVZ_CONCERT_PROMO_URL) ?? '/api/concert/promo/film.mp4',
    poster: playbackUrl(process.env.LVZ_CONCERT_PROMO_POSTER_URL) ?? '/api/concert/promo/poster.webp',
  };
}
