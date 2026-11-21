import {Children, Fragment, isValidElement, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal, flushSync} from 'react-dom';
import {ArrowRight} from '../home-icons';
type PageTurn = (target: HTMLElement | null, direction: 'forward' | 'back', page: number) => void;

type Layout = {starts: number[]; anchor: number};

function pageOf(starts: number[], unit: number) {
  return starts.filter(start => start <= unit).length - 1;
}

export function RegistrationForm({id, active, busy, multipleGuests, festival, confirmAttendance, footer, progress,
  children, label, onFinish, onPageTurn}: {
  id: string; active: boolean; busy: boolean; multipleGuests: boolean; festival: boolean; confirmAttendance: boolean;
  footer: HTMLElement | null; progress: ReactNode; children: ReactNode; label: string;
  onPageTurn: PageTurn;
  onFinish: (submitter: HTMLElement | null) => void;
}) {
  const fields = useRef<HTMLFieldSetElement>(null);
  const nav = useRef<HTMLDivElement>(null);
  const position = useRef<HTMLSpanElement>(null);
  const units = Children.toArray(isValidElement<{children: ReactNode}>(children) && children.type === Fragment
    ? children.props.children : children);
  const [layout, setLayout] = useState<Layout>({starts:[0], anchor:0});
  const starts = festival ? layout.starts : [0];
  const page = pageOf(starts, layout.anchor);
  const paged = starts.length > 1;
  const last = page === starts.length - 1;

  useLayoutEffect(() => {
    const group = fields.current;
    const pager = nav.current;
    const body = group?.closest<HTMLElement>('.cc-dialog-inner');
    if (!festival || !active || !group || !pager || !body) return;
    function measure() {
      if (!group || !pager || !body || !body.clientHeight) return;
      // Reveal the mounted rows for one layout read. The browser lays out the real
      // labels, progress, poster, footer and any messages at the current zoom.
      const rows = Array.from(group.children) as HTMLElement[];
      const concealed = rows.filter(row => row.hidden);
      const focused = rows.findIndex(row => row.contains(document.activeElement));
      const hadPager = !pager.hidden;
      for (const row of concealed) row.hidden = false;
      const gap = parseFloat(getComputedStyle(group).rowGap) || 0;
      const formGap = parseFloat(getComputedStyle(group.parentElement!).rowGap) || 0;
      const pagerSpace = hadPager ? pager.offsetHeight + formGap : 0;
      const overflow = () => body.scrollHeight - body.clientHeight;
      const breaks = [0];
      if (rows.length > 1 && overflow() > pagerSpace + 1) {
        pager.hidden = false;
        const budget = group.getBoundingClientRect().height - overflow();
        let used = 0;
        rows.forEach((row, i) => {
          const height = row.getBoundingClientRect().height;
          if (used && used + gap + height > budget + 1) {
            breaks.push(i);
            used = 0;
          }
          used += (used ? gap : 0) + height;
        });
      }
      for (const row of concealed) row.hidden = true;
      pager.hidden = !hadPager;
      setLayout(current => {
        const anchor = focused >= 0 ? focused : Math.min(current.anchor, rows.length - 1);
        return current.anchor === anchor && breaks.length === current.starts.length &&
          breaks.every((start, i) => start === current.starts[i]) ? current : {starts:breaks, anchor};
      });
    }
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(body);
    resize.observe(body.closest('dialog')!);
    resize.observe(group);
    for (const row of group.children) resize.observe(row);
    for (const child of body.children) resize.observe(child);
    if (footer) resize.observe(footer);
    window.visualViewport?.addEventListener('resize', measure);
    window.addEventListener('resize', measure);
    return () => {
      resize.disconnect();
      window.visualViewport?.removeEventListener('resize', measure);
      window.removeEventListener('resize', measure);
    };
  }, [festival, active, units.length, footer]);

  function showPage(index: number, animate = true) {
    flushSync(() => setLayout(current => ({...current, anchor: starts[index]})));
    position.current?.focus();
    if (animate) onPageTurn(position.current, index < page ? 'back' : 'forward', index);
  }

  const submit = <button type="submit" form={id} className="ui-button cc-reg-next" disabled={busy}
    data-festival={festival || undefined} data-confirm-attendance={(last && confirmAttendance) || undefined}>
    {busy ? 'Please wait…' : <>{last ? label : 'Next'}<ArrowRight size={19}/></>}
  </button>;

  return <form id={id} className="cc-reg-form" data-layout={festival ? (paged ? 'paged' : multipleGuests ? 'scroll' : 'fit') : undefined}
    noValidate={festival} onSubmit={event => {
      event.preventDefault();
      if (busy || !active || !fields.current) return;
      if (!festival) {
        onFinish((event.nativeEvent as SubmitEvent).submitter);
        return;
      }
      const rows = Array.from(fields.current.children) as HTMLElement[];
      // Next validates the visible page. Final submit also catches earlier
      // fields exposed by a resize or changed by autofill.
      for (const [index, row] of rows.entries()) {
        if (!last && row.hidden) continue;
        const invalid = row.querySelector<HTMLInputElement>('input:invalid, select:invalid, textarea:invalid');
        if (invalid) {
          if (row.hidden) showPage(pageOf(starts, index), false);
          invalid.reportValidity();
          invalid.focus();
          return;
        }
      }
      if (!last) showPage(page + 1);
      else onFinish((event.nativeEvent as SubmitEvent).submitter);
    }}>
    {progress}
    <div ref={nav} hidden={!paged}>
      <nav className="cc-page-nav cc-reg-tools" data-for="form" aria-label="Form pages">
        <button type="button" className="cc-reg-link" disabled={!page || busy} onClick={() => showPage(page - 1)}>Previous page</button>
        <span ref={position} tabIndex={-1}>Page {page + 1} of {starts.length}</span>
      </nav>
    </div>
    <fieldset ref={fields} className="cc-answer-fields" disabled={busy}>
      {festival ? units.map((unit, index) => <div key={isValidElement(unit) ? unit.key : index}
        data-form-unit={isValidElement<{className?: string}>(unit) && unit.props.className === 'cc-additional-guests' ? 'guests' : 'field'}
        hidden={pageOf(starts, index) !== page}>{unit}</div>) : children}
    </fieldset>
    {footer ? active && createPortal(submit, footer) : submit}
  </form>;
}

export function ResultPages({children, festival, onPageTurn}: {children: ReactNode[]; festival: boolean; onPageTurn: PageTurn}) {
  const [index, setIndex] = useState(0);
  const current = Math.min(index, children.length - 1);
  const position = useRef<HTMLSpanElement>(null);
  function go(next: number) {
    flushSync(() => setIndex(next));
    position.current?.focus();
    onPageTurn(position.current, next < current ? 'back' : 'forward', next);
  }
  if (!festival) return <ul className="cc-reg-results">{children}</ul>;
  return <>
    {children.length > 1 && <nav className="cc-page-nav cc-reg-tools" data-for="results" aria-label="Invitation results">
      <button type="button" className="cc-reg-link" disabled={!current} onClick={() => go(current - 1)}>Previous invitation</button>
      <span ref={position} tabIndex={-1}>Invitation {current + 1} of {children.length}</span>
      <button type="button" className="cc-reg-link" disabled={current === children.length - 1} onClick={() => go(current + 1)}>Next invitation</button>
    </nav>}
    <ul className="cc-reg-results">{children[current]}</ul>
  </>;
}
