import {openFestivalSky, type FestivalScene} from './festival-sky';
import './festival-motion.css';
import './register-attention.css';

type FestivalDirection = 'forward' | 'back' | 'success';

const reducedMotion = '(prefers-reduced-motion: reduce)';
const activeTransitions = new WeakMap<HTMLDialogElement, () => void>();
const stepScenes: Record<string, FestivalScene> = {
  start:'horizon', member:'curtains', identity:'halo', guest:'hearts', sender:'ribbon',
  quantity:'sparkles', invite:'page-turn', verifySender:'beam', manage:'pearls',
  recover:'ripple', verifyRecovery:'trails', tickets:'gold',
};

const entrances: Partial<Record<FestivalScene, string>> = {
  horizon:'translateY(10px)', curtains:'translateX(18px) rotateY(12deg)',
  halo:'scale(.96)', hearts:'translateY(22px)', ribbon:'scaleX(.96)',
  sparkles:'scale(.94)', 'page-turn':'translate(16px, 8px) rotate(2deg)',
  beam:'translateY(-12px)', pearls:'rotate(-2deg) translateY(8px)',
  ripple:'scale(.985)', trails:'translateY(6px) scale(.97)', gold:'scale(.95)',
  'ticket-success':'translateY(16px) scale(.94)', return:'translateY(-5px)',
  'field-page':'translateY(7px)', 'recipient-page':'translateX(10px)',
  'result-page':'scale(.985)',
};

const leafFlights = [
  // Start and end heights, size, delay, and color across three depth planes.
  [76, 25, 27, 15, 'rose'], [84, 31, 21, 52, 'gold'],
  [52, 12, 22, 54, 'sage'], [63, 19, 18, 86, 'fern'],
  [27, 3, 13, 62, 'gold'], [69, 25, 13, 97, 'sage'],
  [93, 43, 10, 117, 'rose'], [44, 9, 9, 128, 'gold'],
  [86, 12, 8, 137, 'sage'], [54, 20, 7, 152, 'fern'],
] as const;

// Shared by opening, route changes and the adaptive form pager.
export function playFestivalTransition(target: HTMLElement | null, stepDirection: FestivalDirection,
  context?: 'return' | 'recipient-page') {
  const section = target?.closest<HTMLElement>('.cc-registration[data-festival]');
  const sheet = section?.closest<HTMLDialogElement>('.cc-concert-stage[open]');
  if (!section || !sheet || target?.closest('[hidden]')) return;
  const success = stepDirection === 'success';
  const opening = !success && sheet.hasAttribute('data-opening-scene');
  sheet.removeAttribute('data-opening-scene');
  activeTransitions.get(sheet)?.();
  const preference = matchMedia(reducedMotion);
  if (!section.animate || preference.matches || document.hidden) return;

  const direction = opening ? 'open' : stepDirection;
  const pager = target?.closest<HTMLElement>('.cc-page-nav');
  const motif: FestivalScene = opening ? 'open' : context ??
    (pager ? pager.dataset.for === 'form' ? 'field-page' : 'result-page' :
      success && section.dataset.step === 'tickets' ? 'ticket-success' : stepScenes[section.dataset.step ?? ''] ?? 'horizon');
  const form = section.querySelector('.cc-reg-form');
  const content = (pager?.dataset.for === 'results'
    ? Array.from(section.querySelectorAll<HTMLElement>('.cc-reg-results'))
    : form ? Array.from(form.querySelectorAll<HTMLElement>('[data-form-unit]:not([hidden])'))
      : Array.from(section.querySelectorAll<HTMLElement>(':scope > :not(h3, .cc-reg-back, .cc-page-nav, [hidden])')))
    .flatMap(element => element.matches('.cc-choices') ? Array.from(element.children) as HTMLElement[] : [element])
    .filter(element => !element.contains(document.activeElement) && !element.closest('[hidden]'));
  const paging = motif.endsWith('-page');
  const entry = opening ? 'translateY(12px)' : direction === 'back'
    ? paging ? 'translateX(-7px)' : 'translateY(-6px)' : entrances[motif] ?? 'none';
  // Keep the heading visible and the field hit targets stationary during entry.
  // Animate children so the section does not contain the floating Back button.
  const animations = content.map((element, index) => {
    const transform = element.hasAttribute('data-form-unit') ? 'none' :
      motif === 'curtains' && index % 2 === 0 ? 'translateX(-18px) rotateY(-12deg)' : entry;
    return element.animate(
      [{transform, opacity:opening ? 0 : paging ? .7 : .35}, {transform:'none', opacity:1}],
      {id:'festival-entry-' + motif, delay:(opening ? 220 : paging ? 0 : 35) + Math.min(index, 4)*(motif === 'beam' ? 70 : 35),
        duration:opening ? 350 : paging ? 280 : motif === 'ripple' ? 520 : 380,
        easing:'cubic-bezier(.19,.72,.24,1)', fill:'backwards'},
    );
  });
  if (opening) {
    animations.push(sheet.animate(
      [{transform:'translateY(32px)', opacity:.52},
        {offset:.72, transform:'translateY(-4px)', opacity:1},
        {transform:'none', opacity:1}],
      {id:'festival-dialog', duration:580, easing:'cubic-bezier(.19,.72,.24,1)'},
    ));
    const artwork = sheet.querySelector<HTMLElement>('.cc-poster-stage');
    if (artwork) animations.push(artwork.animate(
      [{opacity:0}, {opacity:1}],
      {id:'festival-artwork', delay:110, duration:420, easing:'ease-out', fill:'backwards'},
    ));
  }

  const scene = document.createElement('span');
  scene.className = 'cc-festival-leaves';
  scene.setAttribute('aria-hidden', 'true');
  scene.dataset.direction = direction;
  for (const [start, end, size, delay, color] of opening ? leafFlights : []) {
    const flight = document.createElement('span');
    flight.className = 'cc-leaf-flight';
    flight.style.setProperty('--flight-from', start+'%');
    flight.style.setProperty('--flight-to', end+'%');
    flight.style.setProperty('--leaf-size', size+'cqi');
    flight.style.setProperty('--leaf-delay', delay+'ms');
    flight.dataset.color = color;
    flight.append(document.createElement('i'));
    scene.append(flight);
  }
  sheet.dataset.scene = direction;
  if (opening) sheet.append(scene);
  const sky = openFestivalSky(sheet, motif, direction === 'back');

  const stopForFocus = (event: FocusEvent) => {
    if (!(event.target instanceof HTMLElement)) return;
    // A pointer-focused button still needs to receive its click in the same place.
    if (event.target.matches('input,select,textarea,button:focus-visible,a[href]:focus-visible')) clear();
  };
  const clear = () => {
    if (activeTransitions.get(sheet) !== clear) return;
    activeTransitions.delete(sheet);
    for (const animation of animations) animation.cancel();
    window.clearTimeout(timer);
    scene.remove();
    sky?.remove();
    delete sheet.dataset.scene;
    preference.removeEventListener('change', clear);
    document.removeEventListener('visibilitychange', clear);
    sheet.removeEventListener('close', clear);
    sheet.removeEventListener('focusin', stopForFocus);
  };
  const timer = window.setTimeout(clear, opening ? 1380 : paging ? 560 : 1100);
  activeTransitions.set(sheet, clear);
  preference.addEventListener('change', clear);
  document.addEventListener('visibilitychange', clear);
  sheet.addEventListener('close', clear);
  sheet.addEventListener('focusin', stopForFocus);

  return clear;
}

// Feedback is decorative. Validation, focus and submission stay with the form.
export function answerPulse(control: HTMLElement | null) {
  if (!control?.animate || !control.closest('.cc-concert-stage[open]') ||
      matchMedia(reducedMotion).matches) return null;
  if (control.closest('.cc-festival-stage')) {
    if (!control.matches('.cc-festival-choice')) return null;
    return control.animate(
      [{transform:'scale(1)'}, {offset:.5, transform:'scale(.984)'}, {transform:'scale(1)'}],
      {id:'concert-answer', duration:135, easing:'ease-out'},
    );
  }
  control.closest('dialog')?.dispatchEvent(new CustomEvent('concert-heart', {detail:control}));
  for (const previous of control.getAnimations()) {
    if (previous.id === 'concert-answer') previous.cancel();
  }
  return control.animate([
    {boxShadow:'inset 0 0 0 1px #f8d59d55, 0 0 0 0 #eeb8ac50'},
    {offset:.42, boxShadow:'inset 0 0 0 2px #ffe3b5, 0 0 0 3px #eeb8ac65'},
    {boxShadow:'inset 0 0 0 1px #fac7ac80, 0 0 0 6px #eeb8ac00'},
  ], {id:'concert-answer', duration:195, easing:'ease-out'});
}

export function acknowledgeField(control: HTMLElement) {
  const form = control.closest('form');
  if (!form) return;
  const target = control.closest<HTMLElement>('.cc-vip-toggle') ?? control;
  if (target.closest('.cc-festival-stage')) {
    if (matchMedia(reducedMotion).matches) return;
    const field = target.closest<HTMLElement>('.ui-field, .cc-vip-toggle');
    if (!field?.animate) return;
    for (const previous of field.getAnimations()) {
      if (previous.id === 'festival-field') previous.cancel();
    }
    field.animate(
      [{boxShadow:'0 0 0 0 #c39a4c00'}, {offset:.38, boxShadow:'0 0 0 3px #c39a4c85'},
        {boxShadow:'0 0 0 6px #c39a4c00'}],
      {id:'festival-field', duration:200, easing:'ease-out'},
    );
    return;
  }
  const pulse = answerPulse(target);
  if (!pulse) return;
  void pulse.finished.then(() => {
    if (!form.isConnected || form.closest('[hidden]') || !form.closest('dialog[open]') ||
        matchMedia(reducedMotion).matches) return;
    const meter = form.querySelector<HTMLElement>('.cc-field-progress:not([hidden]) progress');
    const focused = document.activeElement;
    const nextLabel = focused !== control && form.contains(focused) ? focused?.closest('.ui-field')?.querySelector('span, label') : null;
    const next = nextLabel ?? meter ?? Array.from(form.elements).find(element => element instanceof HTMLButtonElement && element.type === 'submit');
    if (!(next instanceof HTMLElement)) return;
    for (const previous of next.getAnimations()) {
      if (previous.id === 'concert-answer-arrives') previous.cancel();
    }
    next.animate([{filter:'brightness(1)'},{offset:.4,filter:'brightness(1.65)'},{filter:'brightness(1)'}],
      {id:'concert-answer-arrives',duration:325,easing:'ease-out'});
  }, () => { /* A newer answer took over the same control. */ });
}
