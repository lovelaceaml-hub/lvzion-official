import assert from 'node:assert/strict';
import {test} from 'node:test';
import {deliveryLabel,filterInvitations,groupInvitations,openLabel,trackerStats,type InvitationRow} from '../lib/concert/invitation-tracker.ts';
const example:InvitationRow={id:'fixture',sender:'Example sender',senderEmail:'sender@example.invalid',leader:'Example leader',name:'Example guest',email:'guest@example.invalid',createdAt:'2026-11-23T17:00:00Z',test:false,mailStatus:'sent',mailUpdatedAt:null,attempts:1,rsvp:'Pending',registration:'No linked ticket',canResend:true};
test('test records are excluded by default without deleting them',()=>{
 const rows=[example,{...example,id:'test',test:true}];
 assert.equal(filterInvitations(rows,'','exclude','all','all').length,1);
 assert.equal(filterInvitations(rows,'','include','all','all').length,2);
 assert.equal(filterInvitations(rows,'','only','all','all')[0].id,'test');
});
test('sender email distinguishes people with the same name; missing leaders stay unknown',()=>{
 const rows=[example,{...example,id:'other',senderEmail:'other@example.invalid',leader:null}];
 assert.equal(groupInvitations(rows,'member').length,2);
 assert.equal(groupInvitations(rows,'leader').length,2);
});
test('application sending is not delivery; open evidence and RSVP are independent',()=>{
 assert.equal(deliveryLabel(example),'Sent – delivery unverified');
 assert.equal(openLabel(example),'Not observed / unknown');
 const opened={...example,providerEvent:'opened'};
 assert.equal(deliveryLabel(opened),'Delivered');
 assert.equal(openLabel(opened),'Open reported');
 assert.equal(trackerStats([opened]).confirmed,0);
 assert.equal(trackerStats([{...example,providerEvent:'bounced'}]).bounced,1);
});
test('separate registration is never counted as a confirmed invitation',()=>{
 const separate={...example,registration:'Possible separate registration'};
 assert.equal(trackerStats([separate]).confirmed,0);
 assert.equal(filterInvitations([separate],'','exclude','Possible separate registration','all').length,1);
});
