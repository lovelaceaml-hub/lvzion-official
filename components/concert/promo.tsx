'use client';

import {filmPalette} from './film-palette';
import {useEffect, useRef, useState} from 'react';

export type PromoMedia = {video?: string; poster?: string};
import {PEACE_CONCERT_POSTER as artwork} from '../../lib/concert/branding';

export default function ConcertPromo({video, poster}: PromoMedia) {
  const player = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = player.current;
    if (!element || !video) return;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void element.play().catch(() => { /* The native play control remains available. */ });
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const scene = element.closest<HTMLElement>('.ml-invitation');
    function paint() {
      const index = Math.min(filmPalette.length - 1, Math.floor((element?.currentTime || 0) / 2));
      scene?.style.setProperty('--film-color', filmPalette[reduce.matches ? 0 : index]);
    }
    const onChange = () => { if (reduce.matches) element.pause(); paint(); };
    element.addEventListener('timeupdate', paint);
    element.addEventListener('seeked', paint);
    paint();
    reduce.addEventListener('change', onChange);
    return () => { reduce.removeEventListener('change', onChange); element.removeEventListener('timeupdate',paint); element.removeEventListener('seeked',paint); scene?.style.removeProperty('--film-color'); };
  }, [video, failed]);
  return <div className="ml-promo">
    {video && !failed ? <video ref={player} src={video} poster={poster ?? artwork} controls
      playsInline muted preload="metadata" onError={() => setFailed(true)} aria-label="Healing Concert promotional film"/>
      : <img src={artwork} width="1280" height="720" alt="Words of Mother’s Love concert poster"/>}
    <small>{!video || failed ? 'Concert preview · Film unavailable' : 'Concert promo'}</small>
  </div>;
}
