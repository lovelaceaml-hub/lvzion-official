'use client';

import {filmPalette} from './film-palette';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';

export type PromoMedia = {video?: string; poster?: string};
import {PEACE_CONCERT_POSTER as artwork} from '../../lib/concert/branding';

// Registration can open via showModal() and close via Escape, close(), or unmount.
export function observeRegistrationDialog(scene: Element | null, change: (open: boolean) => void) {
  const root = scene?.querySelector('.ml-actions') ?? scene;
  let previous: boolean | undefined;
  function sync() {
    const open = !!root?.querySelector('dialog[data-presentation="registration"][open]');
    if (open !== previous) {
      previous = open;
      change(open);
    }
  }
  const observer = new MutationObserver(sync);
  if (root) observer.observe(root, {subtree: true, attributeFilter: ['open'], childList: true});
  sync();
  return () => observer.disconnect();
}

export default function ConcertPromo({video, poster}: PromoMedia) {
  const player = useRef<HTMLVideoElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => {
    if (restoreFocus.current) {
      (failed ? retry.current : player.current)?.focus({preventScroll:true});
      restoreFocus.current = false;
    }
  }, [failed]);
  useEffect(() => {
    const element = player.current;
    if (!element || !video) return;
    // A server-rendered player can fail before React attaches its error listener.
    if (element.error) {
      setFailed(true);
      return;
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const scene = element.closest<HTMLElement>('.ml-invitation');
    let covered = false;
    let playOnClose = !reduce.matches;
    let color = '';
    function paint() {
      if (covered || !scene) return;
      const index = Math.min(filmPalette.length - 1, Math.floor((element?.currentTime || 0) / 2));
      const next = filmPalette[reduce.matches ? 0 : index];
      if (color === next) return;
      color = next;
      scene.style.setProperty('--film-color', color);
    }
    const stopObserving = observeRegistrationDialog(scene, open => {
      covered = open;
      if (open) {
        playOnClose ||= !element.paused && !element.ended;
        element.pause();
      } else {
        if (playOnClose && !reduce.matches) {
          void element.play().catch(() => { /* Native controls remain available. */ });
        }
        playOnClose = false;
        paint();
      }
    });
    const onChange = () => {
      if (reduce.matches) {
        playOnClose = false;
        element.pause();
      }
      paint();
    };
    element.addEventListener('timeupdate', paint);
    element.addEventListener('seeked', paint);
    reduce.addEventListener('change', onChange);
    return () => {
      stopObserving();
      reduce.removeEventListener('change', onChange);
      element.removeEventListener('timeupdate', paint);
      element.removeEventListener('seeked', paint);
      scene?.style.removeProperty('--film-color');
    };
  }, [video, failed]);
  return <div className="ml-promo">
    {video && !failed ? <video ref={player} src={video} poster={poster ?? artwork} controls
      playsInline muted preload="metadata" onError={e => {
        restoreFocus.current = document.activeElement === e.currentTarget;
        setFailed(true);
      }} aria-label="Healing Concert promotional film"/>
      : <img src={artwork} width="1280" height="720" alt="Words of Mother’s Love concert poster"/>}
    {failed && video && <button type="button" ref={retry} className="ml-promo-retry" onClick={() => {
      restoreFocus.current = true;
      setFailed(false);
    }}>Retry film</button>}
    <small>{!video || failed ? 'Concert preview · Film unavailable' : 'Concert promo'}</small>
  </div>;
}
