import {useId} from 'react';
import type {ProgramItem} from '../../lib/concert/domain';

/** The concert program shows the configured order, titles and performers. */
export default function Program({items, heading = 'Program'}: {
  items: ProgramItem[];
  heading?: string;
}) {
  const headingId = useId();
  if (!items.length) return null;
  return <section className="cc-panel cc-program" aria-labelledby={headingId}>
    <h2 id={headingId}>{heading}</h2>
    <ol className="cc-program-songs">{items.map(item => <li key={item.position}>
      <span className="cc-program-number" aria-hidden="true">{item.position}</span>
      <span className="cc-program-body"><strong>{item.title}</strong>{item.performers ? <span>{item.performers}</span> : null}</span>
    </li>)}</ol>
  </section>;
}
