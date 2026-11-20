import {authAdminClient} from '../../../../../lib/server/supabase';

export const dynamic = 'force-dynamic';

// Only the two approved invitation assets can receive a playback URL.
export async function GET(_request: Request, {params}: {params: Promise<{asset: string}>}) {
  const {asset} = await params;
  if (asset !== 'film.mp4' && asset !== 'poster.webp') return new Response(null, {status: 404});
  const headers = {'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer'};
  try {
    const {data, error} = await authAdminClient().storage.from('concert-media')
      .createSignedUrl('december-2026/revision-3/' + asset, 15 * 60);
    if (!error && data?.signedUrl) {
      return new Response(null, {status: 307, headers: {...headers, Location: data.signedUrl}});
    }
  } catch { /* Playback can fail independently of registration. */ }
  return new Response(null, {status: 503, headers});
}
