import {after} from 'next/server';
import {redirect} from 'next/navigation';
import {ticketTokenFor} from '../../../../lib/concert/server';
import {deliverConcertMail, namedInvitation} from '../../../../lib/concert/registration-server';
import {authAdminClient} from '../../../../lib/server/supabase';
import ConcertRsvpPage from '../../../../components/concert/rsvp-page';
import '../../../../components/concert/concert.css';

export const dynamic = 'force-dynamic';
export const metadata = {title:'Your concert invitation · LV Zion',robots:{index:false,follow:false},referrer:'no-referrer'};

export default async function Page({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const invitation = await Promise.resolve().then(() => namedInvitation(authAdminClient(),token)).catch(() => null);
  if (!invitation) return <main className="ui-main cc-page cc-public">
    <section className="cc-panel cc-public-head"><h1>This invitation is unavailable</h1><p>Ask the person who invited you to send a current link.</p>
    <a className="ui-button" href="/concert/rsvp">Open the concert page</a></section>
  </main>;
  if (invitation.confirmedTicket) {
    const ticketId = invitation.confirmedTicket;
    after(async () => { await Promise.allSettled([
      deliverConcertMail('tickets',ticketId), deliverConcertMail('registered',invitation.id),
    ]); });
    redirect('/concert/ticket/'+ticketTokenFor(ticketId));
  }
  return <ConcertRsvpPage entry={{eventId:invitation.eventId}} event={invitation.event}
    open={invitation.available || invitation.accepted} full={false} invitedBy={invitation.senderName}
    personal={{token, email:invitation.email ?? '', name:invitation.name}}/>;
}
