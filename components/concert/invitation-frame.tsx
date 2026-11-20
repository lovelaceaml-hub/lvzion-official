'use client';

import {useEffect, useRef} from 'react';

// All three poses share the same curves. The clip and the gilding use the
// same animated path, so the paper edge and the travelling lights coincide.
function ticketContour(fold: number) {
  const cleft = 4.9 - fold * 2.8;
  const shoulder = 9 - fold * 3.7;
  const notch = 4 - fold * 2.4;
  return `M50 ${cleft}
    C42 -0.6 32 0.2 23 2 C15 3.5 14 ${shoulder} 6 ${shoulder}
    Q2 ${shoulder} 2 13 L2 19 Q2 21 .65 22 L.65 64
    C.65 67 ${notch} 67 ${notch} 70 C${notch} 73 .65 73 .65 76
    L.65 87 Q.65 90 3.6 90 Q6 90 6 93 L6 94.2
    Q6 96 10 96 L34 96 Q43 96 50 99.4
    Q57 96 66 96 L90 96 Q94 96 94 94.2 L94 93
    Q94 90 96.4 90 Q99.35 90 99.35 87 L99.35 76
    C99.35 73 ${100-notch} 73 ${100-notch} 70 C${100-notch} 67 99.35 67 99.35 64
    L99.35 22 Q98 21 98 19 L98 13 Q98 ${shoulder} 94 ${shoulder}
    C86 ${shoulder} 85 3.5 77 2 C68 0.2 58 -0.6 50 ${cleft} Z`;
}
const cut = ticketContour(0);
const ribbon = 'M0 50 Q0 10 6 3 Q10 -1 15 12 C37 13 65 4 99.6 5 L96 45 L100 84 C63 81 37 99 15 88 Q11 100 7 98 Q0 92 0 50Z';

export function InvitationFrame({id}: {id:string}) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const layer = svg.current;
    const sheet = layer?.closest('dialog');
    if (!layer || !sheet) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    function unfold(event:Event) {
      if (reduce.matches) return;
      const source = (event as CustomEvent<HTMLElement>).detail;
      // Keep the frame still while typing. Choice and submit buttons set off
      // a second, gentler flex along its shoulders.
      if (source && !(source instanceof HTMLButtonElement)) return;
      const motion = layer!.querySelector<SVGAnimateElement>(source ? '.cc-frame-answer' : '.cc-frame-unfold');
      motion?.beginElement?.();
    }
    function stop() {
      layer!.querySelectorAll<SVGAnimateElement>('animate').forEach(a => a.endElement?.());
    }
    sheet.addEventListener('concert-heart',unfold);
    sheet.addEventListener('close',stop);
    reduce.addEventListener('change',stop);
    return () => {sheet.removeEventListener('concert-heart',unfold);sheet.removeEventListener('close',stop);reduce.removeEventListener('change',stop);};
  },[]);
  const contour='#'+id+'-paper';
  return <svg className="cc-invitation-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" ref={svg}>
    <defs>
      <path id={id+'-paper'} d={cut} pathLength="100" vectorEffect="non-scaling-stroke">
        <animate className="cc-frame-unfold" attributeName="d" values={[ticketContour(1),ticketContour(-.24),cut].join(';')}
          keyTimes="0;.65;1" calcMode="spline" keySplines=".22 .63 .19 1;.25 .6 .22 1" dur=".94s" begin="indefinite"/>
        <animate className="cc-frame-answer" attributeName="d" values={[cut,ticketContour(-.32),cut].join(';')}
          keyTimes="0;.4;1" calcMode="spline" keySplines=".24 .52 .25 1;.2 .65 .25 1" dur=".68s" begin="indefinite"/>
      </path>
      <clipPath id={id+'-cut'} clipPathUnits="objectBoundingBox"><use href={contour} transform="scale(.01)"/></clipPath>
      <clipPath id={id+'-ribbon'} clipPathUnits="objectBoundingBox"><path d={ribbon} transform="scale(.01)"/></clipPath>
      <linearGradient id={id+'-gold'} x1="0%" x2="94%" y1="0%" y2="85%">
        <stop stopColor="#b07753"/><stop offset=".21" stopColor="#fff3c5"/><stop offset=".45" stopColor="#b6805a"/>
        <stop offset=".7" stopColor="#fff1ba"/><stop offset="1" stopColor="#ad735c"/>
      </linearGradient>
    </defs>
    <g fill="none" strokeLinejoin="round">
      <use href={contour} stroke={'url(#'+id+'-gold)'} strokeWidth="7" vectorEffect="non-scaling-stroke"/>
      <use href={contour} className="cc-edge-light cc-edge-rose" stroke="#ffe3e7" strokeWidth="4" vectorEffect="non-scaling-stroke"/>
      <use href={contour} className="cc-edge-light cc-edge-gold" stroke="#fff5c0" strokeWidth="4" vectorEffect="non-scaling-stroke"/>
      <use href={contour} transform="translate(1.25 1.1) scale(.975 .977)" stroke="#af805e" strokeOpacity=".73" strokeWidth=".75" vectorEffect="non-scaling-stroke"/>
    </g>
    <svg x="44" y="94.5" width="12" height="4.1" viewBox="0 0 54 22" fill="none">
      <g stroke="#aa7e56" strokeWidth="1">
        <path d="M1 9 Q10 13 18 9 M36 9 Q44 13 53 9"/>
        <path fill="#f9dbb4" d="M27 18 C24 15 19 12 19 8 C19 3 25 3 27 7 C29 3 35 3 35 8 C35 12 30 15 27 18Z"/>
      </g>
      <path fill="#fff9e1" d="M31 3 L32 6 L35 7 L32 8 L31 11 L30 8 L27 7 L30 6Z"/>
    </svg>
  </svg>;
}
