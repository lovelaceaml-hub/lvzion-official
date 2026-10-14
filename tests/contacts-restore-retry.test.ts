import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,NOW} from '../lib/contacts/fixtures.ts';
import {applyWorkflow} from '../lib/contacts/workflow.ts';
import type {State} from '../lib/contacts/policy.ts';
function archived(){let s=fixture();s=applyWorkflow(s,'maya',{requestId:'close-r3',contactId:'sample-jordan',expectedVersion:1,action:'dnc'},NOW);return applyWorkflow(s,'maya',{requestId:'archive-r3',contactId:'sample-jordan',expectedVersion:2,action:'archive'},NOW);}
const request={requestId:'restore-r3',contactId:'sample-jordan',expectedVersion:3,action:'restore'};
const deny=(s:State)=>assert.throws(()=>applyWorkflow(s,'maya',request,NOW),(e:unknown)=>(e as {code:string}).code==='DENIED');
test('identical restore retry returns same state with one audit and one receipt',()=>{const before=archived(),after=applyWorkflow(before,'maya',request,NOW);assert.equal(applyWorkflow(after,'maya',request,NOW),after);assert.equal(after.audit.filter(x=>x.id==='restore-r3').length,1);assert.equal(after.receipts.filter(x=>x.requestId==='restore-r3').length,1);assert.equal(after.contacts[1].version,4);assert.equal(after.contacts[1].lifecycle,'closed');assert.equal(after.contacts[1].doNotContact,true);assert.equal(after.contacts[1].archived,false);});
test('restore retry canonicalizes property order',()=>{const s=applyWorkflow(archived(),'maya',request,NOW);assert.equal(applyWorkflow(s,'maya',{action:'restore',expectedVersion:3,contactId:'sample-jordan',requestId:'restore-r3'},NOW),s);});
test('restore retry rechecks active membership',()=>{const s=applyWorkflow(archived(),'maya',request,NOW);s.members[0].active=false;deny(s);});
test('restore retry rechecks module grant',()=>{const s=applyWorkflow(archived(),'maya',request,NOW);s.members[0].access=false;deny(s);});
test('restore retry rechecks placement',()=>{const s=applyWorkflow(archived(),'maya',request,NOW);s.members[0].placement='changed-placement';deny(s);});
test('restore retry after handoff cannot disclose prior receipt',()=>{let s=applyWorkflow(archived(),'maya',request,NOW);s=applyWorkflow(s,'maya',{requestId:'handoff-r3',contactId:'sample-jordan',expectedVersion:4,action:'reassign',target:'leo'},NOW);deny(s);});
test('different restore payload on same key conflicts',()=>{const s=applyWorkflow(archived(),'maya',request,NOW);assert.throws(()=>applyWorkflow(s,'maya',{...request,expectedVersion:4},NOW),(e:unknown)=>(e as {code:string}).code==='CONFLICT');});
test('new restore request for an already restored contact is denied',()=>{const s=applyWorkflow(archived(),'maya',request,NOW);assert.throws(()=>applyWorkflow(s,'maya',{...request,requestId:'new-r3',expectedVersion:4},NOW),(e:unknown)=>(e as {code:string}).code==='DENIED');});
