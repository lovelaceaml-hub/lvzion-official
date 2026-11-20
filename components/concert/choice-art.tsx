export type ChoiceArtKind = 'member' | 'guest' | 'ticket' | 'envelope' | 'both';

export function ChoiceArt({kind}: {kind: ChoiceArtKind}) {
  const ticket = <g transform="rotate(-12 26 20)"><path fill="#fdeac8" d="M8 9h33v7a4 4 0 0 0 0 8v7H8v-7a4 4 0 0 0 0-8z"/><path strokeDasharray="2 2" d="M31 10v20"/><path d="M16 23v-8l8-2v8"/><ellipse cx="14" cy="23" rx="2" ry="1.5"/><ellipse cx="22" cy="21" rx="2" ry="1.5"/></g>;
  return <svg viewBox="0 0 52 40" width="48" height="38" fill="none" stroke="#764557" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    {(kind === 'ticket' || kind === 'both') && ticket}
    {(kind === 'envelope' || kind === 'both') && <g transform={kind === 'both' ? 'translate(7 8) scale(.84)' : undefined}><rect x="6" y="10" width="39" height="25" rx="2" fill="#f1c7cb"/><path d="m7 11 18 15 19-15M7 34l13-12m24 12L31 22"/><circle cx="25" cy="25" r="3.5" fill="#e1b265"/></g>}
    {kind === 'member' && <g><path d="M6 33V15q19-22 39 0v18" fill="#f4d4bf"/><path d="M12 30V17q14-15 27 0v13" fill="#fff7ec"/><path d="M22 24v-9l9-2v9"/><ellipse cx="19" cy="25" rx="3" ry="2"/><ellipse cx="28" cy="23" rx="3" ry="2"/><path d="M6 34h39"/></g>}
    {kind === 'guest' && <g><path d="M8 9h33v22H8z" fill="#fff1d8" transform="rotate(8 24 19)"/><path d="M7 12h34v22H7z" fill="#f0c5c8"/><path d="m7 13 17 12 17-12"/><path d="M24 27q-9-6-5-9 3-2 5 1 3-4 6-1 3 3-6 9z" fill="#e2ad5e"/></g>}
  </svg>;
}
