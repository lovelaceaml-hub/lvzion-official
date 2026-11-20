// Feedback is decorative. Validation, focus and submission stay with the form.
export function answerPulse(control: HTMLElement | null) {
  if (!control?.animate || !control.closest('.cc-concert-stage[open]') ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
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
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
