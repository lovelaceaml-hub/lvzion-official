import test from 'node:test';import assert from 'node:assert/strict';
import {attendanceCsv,parseProgram,parseProgramEntries,parseGuestRsvp,parseMemberCommand,parseScan,tokenFromScan,whenLine,databaseError} from '../lib/concert/domain.ts';
import {ticketHtml,ticketText,ticketSubject} from '../lib/concert/email.ts';
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
 const r=parseGuestRsvp({invite:'abcdefghijklmnopqrstuv',name:'  Gail   Guest ',email:' Gail@Example.COM ',phone:'',partySize:2});
 assert.deepEqual(r,{invite:'abcdefghijklmnopqrstuv',name:'Gail Guest',email:'gail@example.com',phone:null,partySize:2});
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

test('program entries are validated and the public program keeps order',()=>{
 assert.deepEqual(parseProgramEntries([{songNumber:' App 33 ',title:' I Reminisce About Your Love ',duration:'5:13',performers:'Choir + Orchestra'},{songNumber:'',title:'The Rose',duration:null,performers:''}]),
  [{songNumber:'App 33',title:'I Reminisce About Your Love',duration:'5:13',performers:'Choir + Orchestra'},{songNumber:null,title:'The Rose',duration:null,performers:null}]);
 assert.throws(()=>parseProgramEntries([{songNumber:null,title:'',duration:null,performers:null}]),/needs a title/);
 assert.throws(()=>parseProgramEntries([{songNumber:null,title:'X',duration:'5 min',performers:null}]),/like 3:08/);
 assert.throws(()=>parseProgramEntries(Array.from({length:41},()=>({songNumber:null,title:'X',duration:null,performers:null}))),/40 songs/);
 assert.deepEqual(parseProgram([{position:1,title:'A',performers:null}]),[{position:1,title:'A',performers:null}]);
 assert.throws(()=>parseProgram([{position:2,title:'A',performers:null}]));
});
