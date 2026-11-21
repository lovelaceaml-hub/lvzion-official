// The paper cut and its gilding share one stationary outline.
const cut = `M50 4.9
  C42 -.6 32 .2 23 2 C15 3.5 14 6 6 6 Q2 6 2 13
  L2 19 Q2 21 .65 22 L.65 64 C.65 67 4 67 4 70 C4 73 .65 73 .65 76
  L.65 87 Q.65 90 3.6 90 Q6 90 6 93 L6 94.2 Q6 96 10 96 L34 96 Q43 96 50 99.4
  Q57 96 66 96 L90 96 Q94 96 94 94.2 L94 93 Q94 90 96.4 90 Q99.35 90 99.35 87
  L99.35 76 C99.35 73 96 73 96 70 C96 67 99.35 67 99.35 64 L99.35 22
  Q98 21 98 19 L98 13 Q98 6 94 6 C86 6 85 3.5 77 2 C68 .2 58 -.6 50 4.9Z`;
const ribbon = 'M0 50 Q0 10 6 3 Q10 -1 15 12 C37 13 65 4 99.6 5 L96 45 L100 84 C63 81 37 99 15 88 Q11 100 7 98 Q0 92 0 50Z';

export function InvitationFrame({id}: {id:string}) {
  const contour='#'+id+'-paper';
  return <svg className="cc-invitation-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <path id={id+'-paper'} d={cut} pathLength="100" vectorEffect="non-scaling-stroke"/>
      <clipPath id={id+'-cut'} clipPathUnits="objectBoundingBox"><use href={contour} transform="scale(.01)"/></clipPath>
      <clipPath id={id+'-ribbon'} clipPathUnits="objectBoundingBox"><path d={ribbon} transform="scale(.01)"/></clipPath>
      <linearGradient id={id+'-festival'} x1="0%" x2="94%" y1="0%" y2="85%">
        <stop stopColor="#f29a32"/><stop offset=".21" stopColor="#ffe99c"/><stop offset=".45" stopColor="#f15d6f"/>
        <stop offset=".7" stopColor="#ffdee2"/><stop offset="1" stopColor="#89cce8"/>
      </linearGradient>
    </defs>
    <g fill="none" strokeLinejoin="round">
      <use href={contour} stroke={'url(#'+id+'-festival)'} strokeWidth="4" vectorEffect="non-scaling-stroke"/>
      <use href={contour} className="cc-edge-light cc-edge-rose" stroke="#ffdae1" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
      <use href={contour} className="cc-edge-light cc-edge-gold" stroke="#fff5c0" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
      <use href={contour} transform="translate(1.25 1.1) scale(.975 .977)" stroke="#af805e" strokeOpacity=".73" strokeWidth=".75" vectorEffect="non-scaling-stroke"/>
    </g>
    <svg x="44" y="94.5" width="12" height="4.1" viewBox="0 0 54 22" fill="none">
      <g stroke="#aa7e56" strokeWidth="1">
        <path d="M1 9 Q10 13 18 9 M36 9 Q44 13 53 9"/>
        <path fill="#ffb779" d="M27 18 C24 15 19 12 19 8 C19 3 25 3 27 7 C29 3 35 3 35 8 C35 12 30 15 27 18Z"/>
      </g>
      <path fill="#fff9e1" d="M31 3 L32 6 L35 7 L32 8 L31 11 L30 8 L27 7 L30 6Z"/>
    </svg>
  </svg>;
}
