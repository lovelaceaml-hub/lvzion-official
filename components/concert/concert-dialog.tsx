'use client';

import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import Image from 'next/image';
import {PEACE_CONCERT_POSTER, PEACE_CONCERT_TITLE} from '../../lib/concert/branding';
import './registration-stage.css';
import './festival-registration.css';
import {acknowledgeField} from './answer-motion';
import {ArrowRight, X} from '../home-icons';

export default function ConcertDialog({label, title, primary = false, children, onOpen, onClose, presentation, showPoster = false, invitedBy, footer, help}: {
  label: string;
  title: string;
  primary?: boolean;
  children: ReactNode;
  onOpen?: (fromHelp: boolean) => void;
  onClose?: () => void;
  presentation?: 'registration';
  showPoster?: boolean; invitedBy?: string;
  footer?: ReactNode;
  help?: {active: boolean; toggle: () => void; recoveryOnly: boolean};
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const registerButton = useRef<HTMLButtonElement>(null);
  const [attention, setAttention] = useState(false);
  const corner = useRef<HTMLButtonElement>(null);
  const syncViewport = useRef<(() => void) | null>(null);
  const titleId = useId();
  const fieldAtFocus = useRef('');
  const themed = presentation === 'registration' && showPoster;
  const opensTicket = themed && primary;

  useEffect(() => {
    if (!opensTicket) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;
    setAttention(true);
    const stop = () => setAttention(false);
    const timer = window.setTimeout(stop, 60_000);
    preference.addEventListener('change', stop);
    return () => {
      window.clearTimeout(timer);
      preference.removeEventListener('change', stop);
    };
  }, [opensTicket]);
  function openDialog(button: HTMLButtonElement, fromHelp = false) {
    const sheet = dialog.current;
    if (!sheet || sheet.open) return;
    const opensScene = themed && Boolean(help) && !fromHelp;
    if (opensScene && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      const bounds = button.getBoundingClientRect();
      sheet.style.setProperty('--sky-x', bounds.left + bounds.width / 2 + 'px');
      sheet.style.setProperty('--sky-y', bounds.top + bounds.height / 2 + 'px');
    }
    setAttention(false);
    button.focus({preventScroll:true});
    sheet.toggleAttribute('data-opening-scene', opensScene);
    sheet.removeAttribute('data-keyboard');
    sheet.showModal();
    syncViewport.current?.();
    onOpen?.(fromHelp);
    corner.current?.showPopover?.();
  }

  useEffect(() => {
    const sheet = dialog.current;
    const viewport = window.visualViewport;
    if (!sheet || !viewport) return;
    const body = sheet.querySelector<HTMLElement>('.cc-dialog-inner');
    let frame = 0;
    let revealField = false;

    function update() {
      if (!sheet || !viewport || !sheet.open) return;
      // Safari can keep the viewport shortened after blur or a step change.
      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const unzoomed = Math.abs(viewport.scale - 1) < .05;
      const keyboard = unzoomed && layoutHeight - viewport.height > 100;
      sheet.toggleAttribute('data-keyboard', keyboard);
      const visibleHeight = unzoomed ? viewport.height : layoutHeight;
      const visibleTop = keyboard ? Math.max(0, viewport.offsetTop) : 0;
      sheet.style.setProperty('--visible-height', visibleHeight + 'px');
      sheet.style.setProperty('--visible-top', visibleTop + 'px');
      sheet.style.setProperty('--keyboard-inset', (keyboard ? Math.max(0, layoutHeight - visibleTop - visibleHeight) : 0) + 'px');

      const field = document.activeElement;
      if (!revealField || !keyboard || !body || !body.contains(field) ||
          !field?.matches('input, textarea, select')) return;
      // Reveal the focused field inside the sheet without scrolling the page.
      const bounds = body.getBoundingClientRect();
      const control = field.getBoundingClientRect();
      const label = field.closest('.ui-field')?.getBoundingClientRect();
      if (control.bottom > bounds.bottom - 8) body.scrollTop += control.bottom - bounds.bottom + 8;
      else if ((label?.top ?? control.top) < bounds.top + 8) body.scrollTop += (label?.top ?? control.top) - bounds.top - 8;
    }

    function schedule(event: Event) {
      revealField ||= event.type !== 'scroll';
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
        revealField = false;
      });
    }

    syncViewport.current = update;
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    sheet.addEventListener('focusin', schedule);
    return () => {
      syncViewport.current = null;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      sheet.removeEventListener('focusin', schedule);
    };
  }, []);
  return <>
    {!(themed && help?.recoveryOnly) && <button className={primary ? 'ui-button' : 'ui-button ui-button-secondary'} data-admission={opensTicket || undefined} data-festival-action={opensTicket || undefined}
      ref={registerButton} data-register-attention={attention || undefined}
      onFocus={e => { if (e.currentTarget.matches(':focus-visible')) setAttention(false); }}
      onPointerEnter={e => { if (e.pointerType === 'mouse') setAttention(false); }}
      type="button" aria-haspopup="dialog" aria-label={!primary && !presentation ? label : undefined} onClick={e => openDialog(e.currentTarget)}>
      {opensTicket ? <>
        <span className="cc-admission-stamp" aria-hidden="true"><img src="/concert/festival-logo.webp" width="45" height="29" alt=""/></span>
        <span className="cc-admission-title">{invitedBy && <small>You’ve been invited by {invitedBy}</small>}{label}</span>
        <span className="cc-admission-stub" aria-hidden="true"><ArrowRight size={21}/></span>
      </> : <>{primary && invitedBy && <small>You’ve been invited by {invitedBy} · </small>}{label}</>}
    </button>}
    {attention && <button type="button" className="cc-corner-help cc-festival-help cc-stop-register" aria-label="Stop button animation"
      onClick={() => {setAttention(false); registerButton.current?.focus({preventScroll:true});}}>
      <span className="cc-help-badge" aria-hidden="true">Ⅱ</span>
    </button>}
    {themed && help && <button type="button" className="cc-corner-help cc-festival-help" aria-label="Tickets & help"
      aria-haspopup="dialog" onClick={e => openDialog(e.currentTarget, true)}><span className="cc-help-badge" aria-hidden="true">?</span></button>}
    <dialog className={themed ? 'ui-sheet cc-dialog cc-concert-stage cc-festival-stage' : 'ui-sheet cc-dialog'} data-presentation={presentation} data-has-footer={footer ? true : undefined} aria-labelledby={titleId} ref={dialog} data-ticket-sheet={opensTicket || undefined} data-corner-help={themed && help ? true : undefined}
      onClose={e => { if (e.target === e.currentTarget) { corner.current?.hidePopover?.(); onClose?.(); } }}
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
        if (!(e.target instanceof Element)) return;
        const focused = document.activeElement;
        if (e.target.closest('button.cc-reg-back, button.cc-corner-help, button.cc-dialog-close') &&
            e.currentTarget.contains(focused) &&
            (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) focused.blur();
        const partySize = e.target.closest<HTMLButtonElement>('.cc-party-size button');
        if (partySize) acknowledgeField(partySize);
      }}
    >
      <div className="ui-sheet-body cc-dialog-inner">
        <header className="cc-dialog-heading">
          {themed && <img className="cc-heart-signature" src="/concert/festival-logo.webp" width="55" height="35" alt=""/>}<h2 id={titleId}>{title}</h2>{invitedBy && <span className="cc-host-signature">♥ <span>Invited by {invitedBy}</span></span>}
          <button className="cc-dialog-close" type="button" aria-label="Close" onClick={() => dialog.current?.close()}><X size={21} aria-hidden="true"/></button>
        </header>
        {showPoster ? <div className="cc-poster-stage">
          <div className="cc-program-fan">
            <Image className="cc-registration-poster" src={PEACE_CONCERT_POSTER}
              alt={PEACE_CONCERT_TITLE + ' concert poster'} width={1280} height={720} unoptimized/>
          </div>
        </div> : null}
        {children}
      </div>
      {footer ? <footer className="cc-dialog-footer">{footer}</footer> : null}
      {themed && help && <button type="button" popover="manual" ref={corner} className="cc-corner-help cc-festival-help"
        aria-label={help.recoveryOnly ? 'Close ticket help' : help.active ? 'Back to registration' : 'Tickets & help'}
        onClick={() => help.recoveryOnly ? dialog.current?.close() : help.toggle()}>
        <span className="cc-help-badge" aria-hidden="true">{help.active ? '↶' : '?'}</span>
      </button>}
    </dialog>
  </>;
}
