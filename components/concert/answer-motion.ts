import './festival-motion.css';

export type FestivalDirection = 'open' | 'forward' | 'back' | 'success';

const reducedMotion = '(prefers-reduced-motion: reduce)';
const activeTransitions = new WeakMap<HTMLDialogElement, () => void>();

// Shared by opening, route changes and the adaptive form pager.
export function playFestivalTransition(target: HTMLElement | null, direction: FestivalDirection) {
  const section = target?.closest<HTMLElement>('.cc-registration[data-festival]');
  const sheet = section?.closest<HTMLDialogElement>('.cc-concert-stage[open]');
  if (!section || !sheet || target?.closest('[hidden]')) return;
  activeTransitions.get(sheet)?.();
  const preference = matchMedia(reducedMotion);
  if (!section.animate || preference.matches || document.hidden) return;

  const success = direction === 'success';
  const opening = direction === 'open';
  const entry = success ? 'translateY(8px)' : `translateX(${direction === 'back' ? -14 : 14}px)`;
  // Transforming the section would re-anchor the footer's absolute Back control.
  const content = section.querySelectorAll<HTMLElement>(':scope > :not(.cc-reg-back, [hidden])');
  const animations = Array.from(content, element => element.animate(
    [{transform:entry, opacity:.88}, {transform:'none', opacity:1}],
    {id:'festival-step', duration:200, easing:'cubic-bezier(.2,.75,.25,1)'},
  ));
  const artwork = sheet.querySelector<HTMLElement>('.cc-registration-poster');
  if (artwork) {
    animations.push(artwork.animate([{filter:'blur(1.6px)'}, {filter:'blur(0px)'}],
      {id:'festival-artwork', duration:210, easing:'ease-out'}));
  }

  // Prepare the entire ornament offscreen, then attach it in one DOM update.
  // Each leaf animates in CSS without measuring the sheet in the tap handler.
  const burst = document.createElement('span');
  burst.className = 'cc-festival-leaves';
  burst.setAttribute('aria-hidden', 'true');
  burst.dataset.direction = direction;
  if (opening) burst.append(document.createElement('b'), document.createElement('b'));
  const count = success ? 9 : 6;
  for (let i = 0; i < count; i++) {
    const leaf = document.createElement('i');
    const angle = success || opening ? 2*Math.PI*i/count : (-76+125*i/(count-1))*Math.PI/180;
    const radius = 42+(i%3)*12;
    const dx = (direction === 'back' ? -1 : 1)*Math.cos(angle)*radius;
    const dy = Math.sin(angle)*radius;
    leaf.style.setProperty('--leaf-x', dx+'px');
    leaf.style.setProperty('--leaf-y', dy+'px');
    leaf.style.setProperty('--leaf-turn', Math.atan2(dy,dx)*180/Math.PI+'deg');
    burst.append(leaf);
  }
  sheet.append(burst);
  const clear = () => {
    for (const animation of animations) animation.cancel();
    window.clearTimeout(timer);
    burst.remove();
    preference.removeEventListener('change', clear);
    document.removeEventListener('visibilitychange', clear);
    sheet.removeEventListener('close', clear);
    if (activeTransitions.get(sheet) === clear) activeTransitions.delete(sheet);
  };
  const timer = window.setTimeout(clear, opening || success ? 560 : 440);
  activeTransitions.set(sheet, clear);
  preference.addEventListener('change', clear);
  document.addEventListener('visibilitychange', clear);
  sheet.addEventListener('close', clear);

  return clear;
}

// Feedback is decorative. Validation, focus and submission stay with the form.
export function answerPulse(control: HTMLElement | null) {
  if (!control?.animate || !control.closest('.cc-concert-stage[open]') ||
      matchMedia(reducedMotion).matches) return null;
  // Festival navigation starts its own cue on the committed destination.
  const festival = control.closest<HTMLElement>('.cc-festival-stage');
  if (festival) {
    festival.dataset.answerChoice = control.dataset.choice || 'confirm';
    return null;
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
