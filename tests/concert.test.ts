import test from 'node:test';import assert from 'node:assert/strict';
import {attendanceCsv,parseProgram,parseProgramEntries,parseGuestRsvp,parseMemberCommand,parseScan,tokenFromScan,whenLine,databaseError} from '../lib/concert/domain.ts';
import {hostReceiptHtml,invitationHtml,ticketGroupHtml,ticketHtml,ticketText,ticketSubject} from '../lib/concert/email.ts';
import {concertDetails,concertDisplayTitle,concertTimeLabel,PEACE_CONCERT_ITINERARY,PEACE_CONCERT_TITLE} from '../lib/concert/branding.ts';
const token='A'.repeat(21)+'b-_'+'9'.repeat(19);

test('scanned codes accept only the ticket link or the bare token',()=>{
 assert.equal(token.length,43);
 assert.equal(tokenFromScan('https://lvz.app/concert/ticket/'+token),token);
 assert.equal(tokenFromScan('https://lvz.app/concert/ticket/'+token+'?sent=1'),token);
 assert.equal(tokenFromScan(token),token);
 assert.equal(tokenFromScan('https://lvz.app/concert/ticket/'+token+'x'),null,'longer token is not a ticket');
 assert.equal(tokenFromScan('WIFI:S:church;;'),null);
 assert.equal(tokenFromScan(42),null);
 assert.equal(tokenFromScan('x'.repeat(301)),null);
});

test('guest RSVP is validated and normalized',()=>{
 const party={invite:'abcdefghijklmnopqrstuv',name:'  Gail   Guest ',email:' Gail@Example.COM ',phone:'',partySize:2,inviterName:'  Alex   Example ',attendeeNames:['Second Guest']};
 assert.deepEqual(parseGuestRsvp(party),{invite:'abcdefghijklmnopqrstuv',name:'Gail Guest',email:'gail@example.com',phone:null,partySize:2,inviterName:'Alex Example',attendeeNames:['Second Guest']});
 assert.throws(()=>parseGuestRsvp({...party,inviterName:'   '}),/who invited you/);
 assert.throws(()=>parseGuestRsvp({...party,attendeeNames:[]}),/every attendee/);
 assert.throws(()=>parseGuestRsvp({invite:'short',name:'Gail',email:'g@example.com',partySize:1}),/invitation link/);
 assert.throws(()=>parseGuestRsvp({invite:'abcdefghijklmnopqrstuv',name:'G',email:'g@example.com',partySize:1}),/full name/);
 assert.throws(()=>parseGuestRsvp({invite:'abcdefghijklmnopqrstuv',name:'Gail',email:'nope',partySize:1}),/email/);
 assert.throws(()=>parseGuestRsvp({invite:'abcdefghijklmnopqrstuv',name:'Gail',email:'g@example.com',partySize:11}),/Party size/);
 assert.throws(()=>parseGuestRsvp({invite:'abcdefghijklmnopqrstuv',name:'Gail',email:'g@example.com',partySize:1,memberId:'x'}),/Unexpected/);
});

test('member commands reject extra fields and bad event times',()=>{
 assert.deepEqual(parseMemberCommand({op:'rsvp',email:'A@B.co',partySize:1}),{op:'rsvp',email:'a@b.co',partySize:1});
 assert.throws(()=>parseMemberCommand({op:'rsvp',email:'a@b.co',partySize:1,memberId:'x'}),/Unexpected/);
 const event={op:'create',title:'Healing Concert',date:'2026-12-06',startTime:'18:00',doorsTime:'17:30',venue:'Main Hall',details:'',capacity:null,rsvpOpen:true};
 assert.equal(parseMemberCommand(event).op,'create');
 assert.throws(()=>parseMemberCommand({...event,doorsTime:'18:30'}),/Doors/);
 assert.throws(()=>parseMemberCommand({...event,date:'2026-02-30'}),/valid date/);
 assert.throws(()=>parseMemberCommand({...event,capacity:0}),/Capacity/);
 assert.throws(()=>parseMemberCommand({op:'checkin',ticketId:'not-a-uuid'}),/identifier/);
});

test('scan results are checked before display',()=>{
 assert.deepEqual(parseScan({result:'ok',ticketId:'x',name:'Gail Guest',partySize:3,checkedInAt:'2026-12-07T01:42:00Z'}),{result:'ok',name:'Gail Guest',partySize:3,checkedInAt:'2026-12-07T01:42:00Z'});
 assert.throws(()=>parseScan({result:'maybe'}));
 assert.equal(databaseError('LVZCF').code,'full');
 assert.equal(databaseError('42501').status,403);
});

test('ticket email carries the link, details and escapes names',()=>{
 const m={name:'Gail <b>Guest</b>',partySize:2,ticketUrl:'https://lvz.app/concert/ticket/'+token,event:{title:'Healing Concert',date:'2026-12-06',startTime:'18:00',doorsTime:'17:30',venue:'Main Hall',details:'',program:[]}};
 assert.equal(ticketSubject(m),'Your ticket: Healing Concert');
 const text=ticketText(m);
 assert.match(text,/Sunday, December 6, 2026/);assert.match(text,/Doors open 5:30 PM\. Starts 6:00 PM\./);assert.ok(text.includes(m.ticketUrl));assert.match(text,/Party of 2/);
 const html=ticketHtml(m,'ticket-qr');
 assert.ok(html.includes('cid:ticket-qr'));assert.ok(html.includes('Gail &lt;b&gt;Guest&lt;/b&gt;'));assert.ok(!html.includes('<b>Guest'));
 assert.equal(whenLine(m.event),'Sunday, December 6, 2026 · Doors 5:30 PM · Starts 6:00 PM');
});

test('attendance CSV neutralizes spreadsheet formulas',()=>{
 const csv=attendanceCsv({event:null,tickets:[{id:'1',name:'=HYPERLINK("x")',email:'a@b.co',phone:null,partySize:1,member:false,invitedBy:'Ava, Example',createdAt:'',checkedInAt:null,checkedInBy:null}]});
 assert.match(csv,/^Name,Email/);assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));assert.ok(csv.includes('"Ava, Example"'));
});

test('December concert uses the flyer title and time while preserving other event schedules',()=>{
 const event={title:'The Words of Mother’s Love Healing Concert',date:'2026-12-06',startTime:'16:30',doorsTime:null,venue:'Fictional Hall, 100 Example Ave, Las Vegas, NV 89146',details:'',program:[]};
 const mail={name:'Gail Guest',partySize:2,event,ticketUrl:'https://lvz.app/concert/ticket/'+token};
 assert.equal(concertDisplayTitle(event),PEACE_CONCERT_TITLE);
 assert.equal(concertTimeLabel(event),'4:30–6:00 PM Pacific');
 assert.equal(concertDisplayTitle({...event,date:'2027-12-06'}),event.title);
 assert.equal(concertTimeLabel({...event,startTime:'14:00'}),'Starts 2:00 PM');
 assert.ok(ticketSubject(mail).includes(PEACE_CONCERT_TITLE));
 assert.match(ticketHtml(mail,'ticket-qr'),/4:30–6:00 PM.*Fictional Hall<br>100 Example Ave/s);
 const group=ticketGroupHtml(event,[{name:'Gail Guest',url:mail.ticketUrl,qrCid:'first'},{name:'Guest <Two>',url:mail.ticketUrl+'?guest=2',qrCid:'second'}]);
 assert.match(group,/Mother’s Love.*That Bring Peace/s);
 assert.match(group,/cid:first.*cid:second/s);
 assert.match(group,/Open ticket for Guest &lt;Two&gt;/);
 assert.match(invitationHtml({event,name:'Gail Guest',sender:'Fictional <Host>',url:mail.ticketUrl}),/Fictional &lt;Host&gt;.*Open your invitation/s);
 assert.deepEqual(concertDetails('Concert description\n\n'+PEACE_CONCERT_ITINERARY),{
  description:'Concert description',itinerary:[{time:'4:30 PM',title:'Welcome Presentation'},{time:'5:00 PM',title:'Choir & Orchestra Performances'},{time:null,title:'Closing Remarks'}],
 });
});

test('sender receipts link to statuses and both receipts include each attendee QR and both calendars',()=>{
 const event={title:'The Words of Mother’s Love Healing Concert',date:'2026-12-06',startTime:'16:30',doorsTime:null,venue:'Fictional Hall',details:'',program:[]};
 const url='https://example.invalid/concert/status/fictional';
 const ticket={name:'Example Guest',partySize:2,url:'https://example.invalid/concert/ticket/fixture',qrCid:'party'};
 const receipt=hostReceiptHtml(event,'Guest <One>','Your invitation was emailed.',url);
 assert.ok(receipt.includes(url));
 assert.match(receipt,/Guest &lt;One&gt;/);
 const details={name:ticket.name,email:'guest@example.invalid',additionalNames:['Example <Two>'],statusUrl:url};
 const tickets=[{...ticket,partySize:1},{name:'Example Two',url:ticket.url+'-two',qrCid:'companion',partySize:1}];
 const guest=ticketGroupHtml(event,tickets);
 const host=ticketGroupHtml(event,tickets,details);
 for(const message of [host,guest]){
  assert.ok(message.includes(ticket.url));
  assert.ok(message.includes('cid:party'));
  assert.ok(message.includes('cid:companion'));
  assert.ok(message.includes(ticket.url+'-two'));
  assert.match(message,/mothers-love\.ics/);
  assert.match(message,/20261207T003000Z%2F20261207T020000Z/);
 }
 assert.ok(host.includes(url));
 assert.ok(host.includes(details.email));
 assert.match(host,/Example &lt;Two&gt;/);
 assert.ok(!guest.includes(url));
});

test('program entries are validated and the public program keeps order',()=>{
 assert.deepEqual(parseProgramEntries([{songNumber:' App 33 ',title:' I Reminisce About Your Love ',duration:'5:13',performers:'Choir + Orchestra'},{songNumber:'',title:'The Rose',duration:null,performers:''}]),
  [{songNumber:'App 33',title:'I Reminisce About Your Love',duration:'5:13',performers:'Choir + Orchestra'},{songNumber:null,title:'The Rose',duration:null,performers:null}]);
 assert.throws(()=>parseProgramEntries([{songNumber:null,title:'',duration:null,performers:null}]),/needs a title/);
 assert.throws(()=>parseProgramEntries([{songNumber:null,title:'X',duration:'5 min',performers:null}]),/like 3:08/);
 assert.throws(()=>parseProgramEntries(Array.from({length:41},()=>({songNumber:null,title:'X',duration:null,performers:null}))),/40 songs/);
 assert.deepEqual(parseProgram([{position:1,title:'A',performers:null}]),[{position:1,title:'A',performers:null}]);
 assert.throws(()=>parseProgram([{position:2,title:'A',performers:null}]));
});

test('image-blocked party email keeps each named ticket link beside its QR fallback', () => {
  const event = {title:'Concert',date:'2026-12-06',startTime:'18:00',doorsTime:null,venue:'Main Hall',details:'',program:[]};
  const tickets = [
    {name:'Guest <One>', url:'https://example.invalid/ticket/one?a=1&b=2', qrCid:'qr-one'},
    {name:'Guest "Two"', url:'https://example.invalid/ticket/two', qrCid:'qr-two'},
  ];
  const html = ticketGroupHtml(event, tickets);
  const withoutImages = html.replace(/<img\b[^>]*>/gi, '');
  assert.match(html, /src="cid:qr-one"[^>]*alt="Ticket QR code for Guest &lt;One&gt;"/);
  assert.match(html, /src="cid:qr-two"[^>]*alt="Ticket QR code for Guest &quot;Two&quot;"/);
  assert.match(withoutImages, /<h2[^>]*>Guest &lt;One&gt;<\/h2>.*?href="https:\/\/example.invalid\/ticket\/one\?a=1&amp;b=2"[^>]*>Open ticket for Guest &lt;One&gt;<\/a>/s);
  assert.match(withoutImages, /<h2[^>]*>Guest &quot;Two&quot;<\/h2>.*?href="https:\/\/example.invalid\/ticket\/two"[^>]*>Open ticket for Guest &quot;Two&quot;<\/a>/s);
  assert.match(withoutImages, /Sunday, December 6, 2026.*Starts 6:00 PM.*Main Hall/s);
});
