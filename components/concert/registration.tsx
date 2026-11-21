'use client';

import {useEffect, useEffectEvent, useLayoutEffect, useId, useRef, useState, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight, ChevronRight, Music, Heart, UserRound, UsersRound} from '../home-icons';
import {createPortal} from 'react-dom';
import TicketWallet from './ticket-wallet';
import {MAX_PARTY, type PublicEvent} from '../../lib/concert/domain';
import {type InviteDraft, type InviteSummary, type NamedTicket} from '../../lib/concert/registration';
import ConcertDialog from './concert-dialog';
import {answerPulse} from './answer-motion';

type Step = 'start' | 'member' | 'identity' | 'guest' | 'sender' | 'quantity' | 'invite'
  | 'verifySender' | 'manage' | 'recover' | 'verifyRecovery' | 'tickets';
type PersonalInvite = {token: string; email: string; name: string};
type ApiResult = {batchProof?: string; tickets?: NamedTicket[]; invitations?: InviteSummary[]; existing?: boolean; emailed?: boolean; proof?: string; challenge?: string};
type RecipientDraft = Omit<InviteDraft, 'vip'> & {includeVip: boolean; vip: NonNullable<InviteDraft['vip']>};
const emptyInvite: RecipientDraft = {
  name:'', relationship:'', email:'', firstVisit:false, includeVip:false, vip:{title:'',organization:'',category:''},
};
const emptyMember = {firstName:'', lastName:'', leader:''};

async function api(data: Record<string, unknown>): Promise<ApiResult> {
  const response = await fetch('/api/concert/registration', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Please try again.');
  return result;
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return <label className="ui-field"><span>{label}</span>{children}</label>;
}

function Quantity({label, item, value, change}: {label: string; item: 'attendee' | 'invitation'; value: number; change: (value: number) => void}) {
  const id = useId();
  return <div className="ui-field cc-party-field">
    <label htmlFor={id}>{label}</label>
    <div className="cc-party-size">
      <button type="button" aria-label={'Remove one ' + item} disabled={value <= 1} onClick={() => change(value - 1)}>−</button>
      <select id={id} className="ui-input" value={value} onChange={e => change(Number(e.target.value))}>
        {Array.from({length: MAX_PARTY}, (_, i) => <option key={i} value={i+1}>{i+1}</option>)}
      </select>
      <button type="button" aria-label={'Add one ' + item} disabled={value >= MAX_PARTY} onClick={() => change(value + 1)}>+</button>
    </div>
  </div>;
}

function FieldProgress() {
  const meter = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState({complete:0, total:0});
  // React commits any additional attendee and VIP fields before the count is read.
  useEffect(() => {
    const fields = meter.current?.closest('form')?.querySelectorAll<HTMLInputElement>('input[required]');
    if (!fields) return;
    const complete = Array.from(fields).filter(field => field.value.trim() && field.validity.valid).length;
    if (complete !== progress.complete || fields.length !== progress.total) setProgress({complete, total:fields.length});
  });
  return <div className="cc-field-progress" ref={meter} hidden={progress.total < 2}>
    <span>{progress.complete} of {progress.total} required fields complete</span>
    <progress value={progress.complete} max={progress.total || 1} aria-label="Required fields complete"/>
  </div>;
}

const choiceIcons = {member:Music, guest:Heart, ticket:UserRound, envelope:ArrowRight, both:UsersRound};
type ChoiceArtKind = keyof typeof choiceIcons;

function Choice({children, icon, onClick}: {children: ReactNode; icon: ChoiceArtKind; onClick: (button: HTMLButtonElement) => void}) {
  const Icon = choiceIcons[icon];
  return <button type="button" data-choice={icon} className="cc-choice" onClick={e => onClick(e.currentTarget)}>
    <span className="cc-choice-icon"><Icon size={23} aria-hidden="true"/></span>
    <span>{children}</span>
    <ChevronRight className="cc-choice-arrow" size={18} aria-hidden="true"/>
  </button>;
}

function focusRegistrationStep(heading: HTMLHeadingElement | null) {
  const dialog = heading?.closest('dialog');
  if (!dialog?.open) return;
  dialog.scrollTop = 0;
  const body = heading?.closest('.cc-dialog-inner');
  if (body) body.scrollTop = 0;
  heading?.focus({preventScroll: true});
}

export default function Registration({eventId, event, hostToken, personal, invitedBy, recoveryOnly = false, mode, showPoster}: {
  eventId: string; event?: PublicEvent; hostToken?: string;
  personal?: PersonalInvite;
  invitedBy?: string;
  recoveryOnly?: boolean;
  mode?: 'invite';
  showPoster?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(recoveryOnly);

  const [registrationId, setRegistrationId] = useState(0);
  const [lookupId, setLookupId] = useState(0);
  function startLookup() {
    setLookupId(id => id + 1);
    setShowHelp(true);
  }

  const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
  return <ConcertDialog
    label={recoveryOnly ? 'Tickets & help' : mode === 'invite' ? 'Create named invitations' : 'Tap here to register'}
    title={recoveryOnly ? 'Registration help' : 'Event Invitation and Registration'}
    primary={!recoveryOnly}
    presentation="registration"
    showPoster={showPoster} invitedBy={invitedBy}
    onOpen={() => {setShowHelp(recoveryOnly); setOpen(true);}}
    onClose={() => setOpen(false)}
    footer={<><div className="cc-submit-slot" ref={setFooterSlot}/>{!recoveryOnly && <button
      type="button"
      className="ui-button ui-button-secondary cc-dialog-help"
      aria-label={showHelp ? 'Back to registration' : 'Tickets & help'} title={showHelp ? 'Back to registration' : 'Tickets & help'}
      onClick={() => setShowHelp(value => !value)}
    >
      <span aria-hidden="true">{showHelp ? '↶' : '?'}</span>
    </button>}</>}
  >
    {!recoveryOnly ? <div hidden={showHelp}>
      <RegistrationFlow key={registrationId} onReset={() => setRegistrationId(id => id+1)} event={event} hostToken={hostToken} footerSlot={footerSlot} eventId={eventId} personal={personal} invitedBy={invitedBy} onFindTickets={startLookup} sendingInvitation={mode === 'invite'} active={open && !showHelp}/>
    </div> : null}
    <div hidden={!showHelp}>
      <RegistrationFlow key={lookupId} onReset={() => setLookupId(id => id+1)} event={event} footerSlot={footerSlot} eventId={eventId} onFindTickets={startLookup} tools active={open && showHelp}/>
    </div>
  </ConcertDialog>;
}

function RegistrationFlow({eventId, event, hostToken, footerSlot, personal, invitedBy, tools = false, sendingInvitation = false, onFindTickets, onReset, active}: {
  eventId: string; event?: PublicEvent; hostToken?: string; footerSlot: HTMLDivElement | null;
  personal?: PersonalInvite;
  invitedBy?: string;
  tools?: boolean;
  sendingInvitation?: boolean;
  onFindTickets: () => void;
  onReset: () => void;
  active: boolean;
}) {
  const formId = useId();
  const initial = tools ? 'recover' : sendingInvitation ? 'sender' : personal || hostToken ? 'guest' : 'start';
  const [steps, setSteps] = useState<Step[]>([initial]);
  const step = steps[steps.length-1];
  const [email, setEmail] = useState('');
  const [guestEmail, setGuestEmail] = useState(personal?.email ?? '');
  const [inviterName, setInviterName] = useState(invitedBy ?? '');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [member, setMember] = useState(emptyMember);
  const [senderName, setSenderName] = useState('');
  const [both, setBoth] = useState(false);
  const [memberRegistration, setMemberRegistration] = useState(false);
  const [names, setNames] = useState([personal?.name ?? '']);
  const [recipients, setRecipients] = useState([emptyInvite]);
  const [inviteIndex, setInviteIndex] = useState(0);
  const [proof, setProof] = useState('');
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [tickets, setTickets] = useState<NamedTicket[]>([]);
  const [invitations, setInvitations] = useState<InviteSummary[]>([]);
  const [emailed, setEmailed] = useState(false);
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manageOnly, setManageOnly] = useState(false);
  const pending = useRef(false);
  const saveId = useRef('');
  const batchId = useRef('');
  const cue = useRef<Animation | null>(null);
  const direction = useRef<'forward' | 'back'>('forward');
  const formHeading = useRef<HTMLHeadingElement>(null);

  const closedDuringWork = useRef(false);
  const discardCompleted = useEffectEvent(() => {
    closedDuringWork.current = pending.current;
    if (step === 'tickets' || step === 'manage') {
      onReset();
      return;
    }
    // In “Both”, the invitation draft can outlive the completed seat reservation.
    const ticketStep = steps.indexOf('tickets');
    if (ticketStep >= 0) {
      setSteps(steps.slice(ticketStep + 1));
      setTickets([]);
      setMember(emptyMember);
      setMemberRegistration(false);
      setExisting(false);
      setEmailed(false);
    }
  });
  useEffect(() => {
    const sheet = formHeading.current?.closest('dialog');
    if (!sheet) return;
    const onClose = () => discardCompleted();
    sheet.addEventListener('close', onClose);
    return () => sheet.removeEventListener('close', onClose);
  }, []);

  const previousHeight = useRef(0);
  function rememberHeight() {
    const sheet = formHeading.current?.closest<HTMLDialogElement>('.cc-concert-stage[open]');
    previousHeight.current = sheet?.getBoundingClientRect().height ?? 0;
  }
  useLayoutEffect(() => {
    const from = previousHeight.current;
    previousHeight.current = 0;
    const sheet = formHeading.current?.closest<HTMLDialogElement>('.cc-concert-stage[open]');
    if (!active || !from || !sheet || sheet.hasAttribute('data-keyboard') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const to = sheet.getBoundingClientRect().height;
    if (Math.abs(from-to) < 2) return;
    const resize = sheet.animate([{height:from+'px'},{height:to+'px'}],
      {id:'concert-window-resize',duration:390,easing:'cubic-bezier(.22,.74,.22,1)'});
    return () => resize.cancel();
  }, [active,step,inviteIndex]);

  useEffect(() => {
    if (active) focusRegistrationStep(formHeading.current);
  }, [active, step, inviteIndex]);

  useEffect(() => () => { cue.current?.cancel(); }, [active]);

  function answer(control: HTMLElement | null, action: () => void | Promise<void>) {
    void run(async () => {
      const pulse = answerPulse(control);
      if (pulse) {
        cue.current = pulse;
        control?.setAttribute('data-answering', '');
        try { await pulse.finished; }
        catch { return; } // Closing the sheet or opening Help cancels the pending choice.
        finally {
          control?.removeAttribute('data-answering');
          cue.current = null;
        }
      }
      if (!formHeading.current?.closest('dialog[open]') || formHeading.current.closest('[hidden]')) return;
      direction.current = 'forward';
      await action();
    });
  }

  const next = (s: Step) => { rememberHeight(); direction.current = 'forward'; setError(''); setNotice(''); setSteps(history => [...history, s]); };
  function back() {
    rememberHeight();
    direction.current = 'back';
    setError('');
    setNotice('');
    if (step === 'invite' && inviteIndex > 0) { setInviteIndex(i => i-1); return; }
    setSteps(history => history.length > 1 ? history.slice(0,-1) : history);
  }

  function requestId(ref: React.RefObject<string>) {
    if (!ref.current) ref.current = crypto.randomUUID();
    return ref.current;
  }

  async function run(work: () => Promise<void> | void) {
    if (pending.current) return;
    closedDuringWork.current = false;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try { await work(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  }

  function finish(result: 'tickets' | 'manage') {
    if (!formHeading.current) return;
    if (closedDuringWork.current) onReset();
    else next(result);
  }

  async function register(fields: Record<string, unknown>) {
    const result = await api({op:'register', eventId, requestId:requestId(saveId), ...fields,
      ...(hostToken && fields.names ? {hostToken} : fields.member ? {} : {inviterName})});
    setTickets(result.tickets ?? []);
    setMemberRegistration(Boolean(fields.member));
    setEmailed(result.emailed === true);
    setExisting(result.existing === true);
    finish('tickets');
  }

  async function requestCode(purpose: 'sender' | 'recovery') {
    const result = await api({op:'requestCode', purpose, eventId,
      email:purpose === 'recovery' ? recoveryEmail : email});
    setCode('');
    if (purpose!=='recovery') setProof('');
    setChallenge(result.challenge ?? '');
    if (purpose === 'sender') { if (step !== 'verifySender') next('verifySender'); }
    else if (purpose === 'recovery') { if (step !== 'verifyRecovery') next('verifyRecovery'); }
    setNotice('Check your email for the eight-digit code.');
  }

  async function confirmCode(purpose: 'sender' | 'recovery') {
    const result = await api({op:'verifyCode', purpose, challenge, code,
      email:purpose === 'sender' ? email : purpose === 'recovery' ? recoveryEmail : undefined});
    if (purpose === 'recovery') {
      setTickets(result.tickets ?? []);
      setExisting(false);
      setEmailed(false);
      finish('tickets');
    } else {
      setProof(result.proof ?? '');
      await listInvitations(result.proof ?? '');
    }
  }

  async function listInvitations(verified: string) {
    const data = await api({op:'list', eventId, proof:verified});
    setInvitations(data.invitations ?? []);
    finish('manage');
  }

  async function createInvitations() {
    const data = await api({op:'create', eventId, email, requestId:requestId(batchId), senderName,
      recipients:recipients.map(({includeVip, vip, ...recipient}) => ({...recipient, vip:includeVip ? vip : null}))});
    setProof(data.batchProof ?? '');
    setInvitations(data.invitations ?? []);
    finish('manage');
  }

  async function updateInvitations(op: 'resend' | 'withdraw', id: string) {
    const result = await api({op, id, eventId, proof, ...(manageOnly ? {} : {batch:batchId.current})});
    setInvitations(result.invitations ?? []);
    setNotice(op === 'withdraw' ? 'Invitation withdrawn.' : 'Delivery status updated.');
  }

  async function share(url: string, name: string) {
    try {
      if (navigator.share) { await navigator.share({title:name, url}); return; }
      await navigator.clipboard.writeText(url);
      setNotice('Link copied.');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Open the link to copy it from your browser.');
    }
  }

  const invite = recipients[inviteIndex];
  const editInvite = (update: Partial<RecipientDraft>) => setRecipients(list =>
    list.map((item, i) => i === inviteIndex ? {...item,...update} : item));
  const editName = (index: number, value: string) => setNames(list => list.map((item,i) => i === index ? value : item));
  async function nextRecipient() {
    if (inviteIndex+1===recipients.length) { await createInvitations(); return; }
    rememberHeight();
    setInviteIndex(index => index+1);

  }

  const title = ({
    start:'Are you a member of the Church of God?',
    member:'Are you registering yourself or are you sending an invitation?',
    identity:'Reserve your seat', guest:personal || hostToken ? 'Confirm your party' : 'Your registration',
    sender:manageOnly?'Find your invitations':'Who is sending the invitations?',
    quantity:'How many invitations are you sending?', invite:`Invitation ${inviteIndex+1} of ${recipients.length}`,

    verifySender:'Verify your email', manage:'Your invitations', recover:'Find your tickets',
    verifyRecovery:'Verify your email', tickets:tickets.length?'Your tickets':existing?'Check your registration':'No tickets found',
  })[step];

  const form = (children: ReactNode, label: string, action: () => Promise<void> | void) => {
    const submit = <button type="submit" form={formId} className="ui-button cc-reg-next" data-confirm-attendance={step === 'guest' && Boolean(personal || hostToken) || undefined} disabled={busy}>
      {busy ? 'Please wait…' : <>{label}<ArrowRight size={19} aria-hidden="true"/></>}
    </button>;
    return <form id={formId} key={step} className="cc-reg-form" onSubmit={e => {
      e.preventDefault();
      const source = (e.nativeEvent as SubmitEvent).submitter ?? footerSlot?.querySelector('button') ?? null;
      answer(source, action);
    }}>
      <FieldProgress/>
      <fieldset className="cc-answer-fields" disabled={busy}>{children}</fieldset>
      {footerSlot ? active && createPortal(submit, footerSlot) : submit}</form>;
  };

  const inviterField = <Field label="Who invited you?">
    <input className="ui-input" name="inviterName" required pattern=".*\S.*" maxLength={120} value={inviterName} onChange={e => setInviterName(e.target.value)}/>
  </Field>;

  function content() {
    switch (step) {
      case 'start': return <div className="cc-choices">
        <Choice icon="member" onClick={button => answer(button, () => next('member'))}>I am a member.</Choice>
        <Choice icon="guest" onClick={button => answer(button, () => {setBoth(false); next('guest');})}>I am a guest.</Choice>
      </div>;
      case 'member': return <div className="cc-choices">
        <Choice icon="ticket" onClick={button => answer(button, () => {setBoth(false); next('identity');})}>I am registering myself.</Choice>
        <Choice icon="envelope" onClick={button => answer(button, () => {setBoth(false); setManageOnly(false); next('sender');})}>I am sending an invitation.</Choice>
        <Choice icon="both" onClick={button => answer(button, () => {setBoth(true); setManageOnly(false); next('identity');})}>Both.</Choice>
      </div>;
      case 'identity': return form(<>
        <div className="cc-reg-row">
          <Field label="First name"><input className="ui-input" required maxLength={60} autoComplete="given-name" value={member.firstName} onChange={e => setMember({...member,firstName:e.target.value})}/></Field>
          <Field label="Last name"><input className="ui-input" required maxLength={60} autoComplete="family-name" value={member.lastName} onChange={e => setMember({...member,lastName:e.target.value})}/></Field>
        </div>
        <Field label="Email address"><input className="ui-input" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></Field>
        <Field label="Group leader’s name"><input className="ui-input" required maxLength={120} value={member.leader} onChange={e => setMember({...member,leader:e.target.value})}/></Field>
      </>, 'Register me', async () => {
        setSenderName(member.firstName+' '+member.lastName);
        await register({email, member});
      });
      case 'guest': return form(<>
        <Field label="Your full name"><input className="ui-input" required minLength={2} maxLength={120} autoComplete="name" value={names[0]} onChange={e => editName(0,e.target.value)}/></Field>
        <Quantity item="attendee" label="How many people, including you?" value={names.length} change={count => setNames(list => Array.from({length:count},(_,i) => list[i] ?? ''))}/>
        {names.slice(1).map((name, index) => <Field key={index} label={`Attendee ${index+2} full name`}>
          <input className="ui-input" required minLength={2} maxLength={120} value={name} onChange={e => editName(index+1,e.target.value)}/>
        </Field>)}
        <Field label="Email for tickets"><input className="ui-input" type="email" required maxLength={254} autoComplete="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)}/></Field>
        {personal || hostToken ? <p className="cc-hint">{invitedBy || 'Your host'} will receive your party details and a copy of your QR ticket.</p> : inviterField}
      </>, personal || hostToken ? 'Confirm your attendance' : names.length>1?'Get tickets':'Get my ticket',
        () => register({email:guestEmail,names, ...(personal ? {invitation:personal.token} : {})}));
      case 'sender': return form(<>
        {manageOnly?null:<Field label="Your full name"><input className="ui-input" required minLength={2} maxLength={120} autoComplete="name" value={senderName} onChange={e => setSenderName(e.target.value)}/></Field>}
        <Field label="Your email address"><input className="ui-input" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></Field>
      </>, manageOnly?'Send verification code':'Continue', async () => {if (manageOnly) await requestCode('sender'); else next('quantity');});
      case 'quantity': return form(
        <Quantity item="invitation" label="Number of invitations" value={recipients.length} change={count => setRecipients(list => Array.from({length:count},(_,i) => list[i] ?? emptyInvite))}/>,
        'Add recipients', () => {setInviteIndex(0);next('invite');});
      case 'invite': return form(<>
        <Field label="Guest’s full name"><input className="ui-input" required minLength={2} maxLength={120} value={invite.name} onChange={e => editInvite({name:e.target.value})}/></Field>
        <label className="cc-vip-toggle"><input type="checkbox" checked={invite.includeVip}
          onChange={e => editInvite({includeVip:e.target.checked})}/> VIP</label>
        {invite.includeVip && <fieldset className="cc-vip-fields"><legend>VIP details</legend>
        <Field label="VIP title"><input className="ui-input" required maxLength={120} value={invite.vip.title} onChange={e => editInvite({vip:{...invite.vip,title:e.target.value}})}/></Field>
        <Field label="Organization"><input className="ui-input" required maxLength={120} value={invite.vip.organization} onChange={e => editInvite({vip:{...invite.vip,organization:e.target.value}})}/></Field>
        <Field label="Category"><input className="ui-input" required maxLength={120} value={invite.vip.category} onChange={e => editInvite({vip:{...invite.vip,category:e.target.value}})}/></Field>
        </fieldset>}
        <Field label="Relationship"><input className="ui-input" required maxLength={120} value={invite.relationship} onChange={e => editInvite({relationship:e.target.value})}/></Field>
        <Field label="Guest’s email (optional)"><input className="ui-input" type="email" maxLength={254} value={invite.email} onChange={e => editInvite({email:e.target.value})}/></Field>
        <label className="cc-vip-toggle"><input type="checkbox" checked={invite.firstVisit} onChange={e => editInvite({firstVisit:e.target.checked})}/> First time visiting</label>
      </>, inviteIndex+1<recipients.length?'Next recipient':(recipients.length===1?'Create invitation':'Create invitations'), nextRecipient);
      case 'recover': return <>
        {form(<Field label="Registration email"><input className="ui-input" type="email" required maxLength={254} autoComplete="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)}/></Field>,
          'Send verification code', () => requestCode('recovery'))}
        <button type="button" className="cc-reg-link" onClick={e => answer(e.currentTarget, () => {setManageOnly(true);next('sender');})}>Manage invitations I sent</button>
        <a className="cc-reg-link" href="/concert/setup">Set up your LV Zion account</a>
      </>;
      case 'verifySender':
      case 'verifyRecovery': {
        const purpose = step==='verifySender'?'sender':'recovery';
        return <>
          {form(<Field label="Eight-digit email code"><input className="ui-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} value={code} onChange={e => setCode(e.target.value)}/></Field>,
            'Verify email',
            async () => {
              if (step==='verifySender'&&proof) await listInvitations(proof);
              else await confirmCode(purpose);
            })}
          <button type="button" className="cc-reg-link" disabled={busy} onClick={() => void run(() => requestCode(purpose))}>Send a new code</button>
        </>;
      }
      case 'manage': return <>
        {invitations.length ? <ul className="cc-reg-results">{invitations.map(item => <li key={item.id}>
          <div><strong>{item.name}</strong>{item.vip?<span className="cc-vip-badge">VIP</span>:null}</div>
          <small>{item.withdrawn?'Withdrawn':item.accepted?'Registered':item.delivery==='sent'?'Email sent':item.delivery==='failed'?'Email delivery failed':item.hasEmail?'Email pending':'Personal link ready'}</small>
          {!item.withdrawn && !item.accepted ? <div className="cc-reg-tools">
            <button type="button" className="cc-reg-link" onClick={() => void share(item.url,item.name+'’s concert invitation')}>Share link</button>
            <a className="cc-reg-link" href={item.url}>Open invitation</a>
            {item.hasEmail?<button type="button" className="cc-reg-link" disabled={busy} onClick={() => void run(() => updateInvitations('resend',item.id))}>Resend</button>:null}
            <button type="button" className="cc-reg-link" disabled={busy} onClick={() => {
              if (window.confirm('Withdraw the invitation for '+item.name+'?')) void run(() => updateInvitations('withdraw',item.id));
            }}>Withdraw</button>
          </div> : null}
        </li>)}</ul> : <p className="cc-hint">There are no invitations for this email.</p>}
      </>;
      case 'tickets': {
        return <>
          {tickets.length && event && tickets[0].svg ? <TicketWallet event={event} tickets={tickets} embedded/>
            : tickets.length ? <div className="cc-reg-tools">{tickets.map(t=><div key={t.id}><strong>{t.name}</strong> <a href={t.url}>Open QR ticket</a></div>)}</div> : <p className="cc-hint">{existing?'This email already has a registration or the invitation was already accepted. Verify the ticket email to retrieve the registration.':'Check the email used to register and try again.'}</p>}
          {emailed?<p className="cc-hint">We’ll send a copy to your email.</p>:null}
          {existing?<button type="button" className="ui-button ui-button-secondary" onClick={e => answer(e.currentTarget, onFindTickets)}>Find my tickets</button>:null}
          {tools && <button type="button" className="ui-button ui-button-secondary" onClick={e => answer(e.currentTarget, onFindTickets)}>
            {tickets.length ? 'Find tickets for another email' : 'Try another email'}
          </button>}
          {both&&memberRegistration?<button type="button" className="ui-button" onClick={e => answer(e.currentTarget, () => next('quantity'))}>Continue to invitations</button>:null}
          {memberRegistration&&!both?<a className="cc-reg-link" href="/concert/setup">Set up your LV Zion account</a>:null}
        </>;
      }
    }
  }

  return <section key={step + inviteIndex} data-step={step} data-direction={direction.current} className="cc-registration" aria-busy={busy}>
    <h3 ref={formHeading} tabIndex={-1}>{title}</h3>
    {content()}
    {error?<p className="cc-error" role="alert">{error}</p>:null}
    {notice?<p className="cc-hint" role="status">{notice}</p>:null}
    {steps.length>1 && !['tickets','manage'].includes(step)?<button type="button" className="cc-reg-link cc-reg-back" disabled={busy} onClick={back}><ArrowLeft size={18} aria-hidden="true"/>Back</button>:null}
  </section>;
}
