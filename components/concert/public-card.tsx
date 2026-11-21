import type {ReactNode} from 'react';
import './festival-registration.css';

export default function ConcertPublicCard({title, children}: {title: string; children: ReactNode}) {
  return <main className="ui-main cc-page cc-public cc-concert-receipt">
    <section className="cc-panel cc-festival-paper" aria-labelledby="concert-receipt-title">
      <header className="cc-receipt-heading">
        <img src="/concert/festival-logo.webp" width="55" height="35" alt=""/>
        <h1 id="concert-receipt-title">{title}</h1>
      </header>
      {children}
    </section>
  </main>;
}
