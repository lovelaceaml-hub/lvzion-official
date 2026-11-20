'use client';

import {useEffect, useId, useRef, type CSSProperties, type ReactNode} from 'react';
import Image from 'next/image';
import {PEACE_CONCERT_POSTER, PEACE_CONCERT_TITLE} from '../../lib/concert/branding';
import './registration-stage.css';
import {InvitationFrame} from './invitation-frame';
import {HeartFlight, HeartSignature, PosterHeart} from './popup-heart';
import {acknowledgeField} from './answer-motion';
import {ArrowRight, X} from '../home-icons';

// Back to front on each side of the printed concert program.
const leaves = [
  {lane:-3, ink:'#acb89b'}, {lane:3, ink:'#beabc9'},
  {lane:-2, ink:'#eac08a'}, {lane:2, ink:'#8aaec7'},
  {lane:-1, ink:'#df9d95'}, {lane:1, ink:'#c28fac'},
];

export default function ConcertDialog({label, title, primary = false, children, onOpen, onClose, presentation, showPoster = false, invitedBy, footer}: {
  label: string;
  title: string;
  primary?: boolean;
  children: ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
  presentation?: 'registration';
  showPoster?: boolean; invitedBy?: string;
  footer?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const frameId = useId().replace(/[^a-z0-9_-]/gi, '');
  const fieldAtFocus = useRef('');
  const themed = presentation === 'registration' && showPoster;
  const opensTicket = themed && primary;
  function openDialog(button: HTMLButtonElement) {
    const sheet = dialog.current;
    if (!sheet || sheet.open) return;
    button.focus({preventScroll:true});
    sheet.showModal();
    onOpen?.();
    if (!opensTicket || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sheet.setAttribute('data-opening', '');
    sheet.dispatchEvent(new CustomEvent('concert-heart'));
  }
  function finishOpening() { dialog.current?.removeAttribute('data-opening'); }

  function followLight(event: React.PointerEvent<HTMLElement>) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    element.style.setProperty('--touch-light', (x * 100).toFixed(1) + '%');
    element.style.setProperty('--fan-tilt', (14 * x - 7).toFixed(1) + 'deg');
  }
  function centerFan(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.removeProperty('--fan-tilt');
  }

  useEffect(() => {
    const sheet = dialog.current;
    const viewport = window.visualViewport;
    if (!sheet || !viewport) return;
    function resize() {
      if (!sheet || !viewport) return;
      sheet.toggleAttribute('data-keyboard', window.innerHeight - viewport.height > 100 && viewport.scale < 1.1);
      sheet.style.setProperty('--visible-height', viewport.height + 'px');
      sheet.style.setProperty('--visible-top', viewport.offsetTop + 'px');
    }
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {viewport.removeEventListener('resize', resize);viewport.removeEventListener('scroll', resize);};
  }, []);
  return <>
    <button className={primary ? 'ui-button' : 'ui-button ui-button-secondary'} data-admission={opensTicket || undefined}
      onPointerMove={opensTicket ? followLight : undefined}
      onPointerDown={opensTicket ? followLight : undefined}
      type="button" aria-haspopup="dialog" onClick={e => openDialog(e.currentTarget)}>
      {opensTicket ? <>
        <span className="cc-admission-trails" aria-hidden="true">{['left','right'].map(side =>
          <svg key={side} viewBox="0 0 100 38" preserveAspectRatio="none">
            <path pathLength="100" d="M-5 29 C18 38 41 2 27 8 S40 39 96 18"/>
            <path className="cc-trail-star" d="m88 16 1.5 3.5L94 21l-4.5 1.5L88 27l-1.5-4.5L82 21l4.5-1.5z"/>
          </svg>)}</span>
        <span className="cc-admission-stamp" aria-hidden="true">♥</span>
        <span className="cc-admission-title">{invitedBy && <small>You’ve been invited by {invitedBy}</small>}{label}</span>
        <span className="cc-admission-stub" aria-hidden="true"><ArrowRight size={21}/></span>
      </> : <>{primary && invitedBy && <small>You’ve been invited by {invitedBy} · </small>}{label}</>}
    </button>
    <dialog className={themed ? 'ui-sheet cc-dialog cc-concert-stage' : 'ui-sheet cc-dialog'} data-presentation={presentation} data-has-footer={footer ? true : undefined} aria-labelledby={titleId} ref={dialog} style={themed ? {
        '--paper-cut':`url(#${frameId}-cut)`, '--ribbon-cut':`url(#${frameId}-ribbon)`,
      } as CSSProperties : undefined} data-ticket-sheet={opensTicket || undefined}
      onClose={() => { finishOpening(); onClose?.(); }}
      onAnimationEnd={e => { if (e.animationName === 'cc-program-turn') finishOpening(); }}
      onPointerDownCapture={finishOpening} onKeyDownCapture={finishOpening}
      onFocusCapture={e => { if (e.target instanceof HTMLInputElement) fieldAtFocus.current = e.target.value; }}
      onBlurCapture={e => {
        const field = e.target;
        if (field instanceof HTMLInputElement && field.type !== 'checkbox' && field.value !== fieldAtFocus.current &&
            field.validity.valid && (field.value.trim() || !field.required)) acknowledgeField(field);
        fieldAtFocus.current = '';
      }}
      onChangeCapture={e => {
        const field = e.target;
        if (field instanceof HTMLSelectElement || (field instanceof HTMLInputElement && field.type === 'checkbox')) acknowledgeField(field);
      }}
      onClickCapture={e => {
        const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.cc-party-size button') : null;
        if (button) acknowledgeField(button);
      }}
    >
      {themed && <><InvitationFrame id={frameId}/><HeartFlight/></>}
      <div className="ui-sheet-body cc-dialog-inner">
        <header className="cc-dialog-heading">
          {themed && <HeartSignature/>}<h2 id={titleId}>{title}</h2>{invitedBy && <span className="cc-host-signature">♥ <span>Invited by {invitedBy}</span></span>}
          <button className="cc-dialog-close" type="button" aria-label="Close" onClick={() => dialog.current?.close()}><X size={21} aria-hidden="true"/></button>
        </header>
        {showPoster ? <div className="cc-poster-stage" onPointerMove={followLight} onPointerDown={followLight}
          onPointerLeave={centerFan} onPointerUp={centerFan} onPointerCancel={centerFan}>
          <div className="cc-score-lines" aria-hidden="true">{[0,1,2,3,4].map(line => <i key={line}/>)}</div>
          <PosterHeart/>
          <div className="cc-program-fan">
            {leaves.map(({lane, ink}) => <div key={lane} aria-hidden="true" className="cc-program-leaf" style={{
              '--shift':lane * 24 + '%', '--yaw':(lane < 0 ? 1 : -1) * (40 + Math.abs(lane) * 7) + 'deg',
              '--depth':1 - Math.abs(lane) * .052, '--ink':ink,
            } as CSSProperties}><span>♪</span></div>)}
            <Image className="cc-registration-poster" src={PEACE_CONCERT_POSTER}
              alt={PEACE_CONCERT_TITLE + ' concert poster'} width={1280} height={720} unoptimized/>
            <div className="cc-program-sparks" aria-hidden="true">
              {Array.from({length:28}, (_, i) => <i key={i} style={{
                '--x':((i % 2 ? 1 : -1) * (36 + (i * 17 % 66))) + '%',
                '--y':(8 + (i * 31 % 85)) + '%', '--delay':(i * -143) + 'ms',
                '--size':(i % 4 === 0 ? 6 : 2 + i % 3) + 'px',
              } as CSSProperties}/>)}
            </div>
          </div>
        </div> : null}
        {children}
      </div>
      {footer ? <footer className="cc-dialog-footer">{footer}</footer> : null}
    </dialog>
  </>;
}
