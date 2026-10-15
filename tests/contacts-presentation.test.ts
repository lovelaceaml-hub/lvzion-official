import test from 'node:test';
import assert from 'node:assert/strict';
import {contactCounts,findLoadedContacts} from '../lib/contacts/presentation.ts';
import type {ContactSummary} from '../lib/contacts/server-contract.ts';
const owner='00000000-0000-4000-9000-000000000001',other='00000000-0000-4000-9000-000000000002';
const record=(id:number,name:string,lifecycle:ContactSummary['lifecycle'],archived=false,ownerId=owner):ContactSummary=>({
 id:'00000000-0000-4000-9000-'+String(id).padStart(12,'0'),ownerId,name,lifecycle,archived,
 preferred:'unknown',doNotContact:false,version:1
});
const rows=[record(1,'Zoë Visitor','active'),record(2,'Ana Person','new'),record(3,'Mila Contact','paused'),record(4,'Lee Closed','closed'),record(5,'Archive One','closed',true),record(6,'Hidden Other','active',false,other)];
test('Contacts loaded search only examines current authorized owner records',()=>{
 assert.deepEqual(findLoadedContacts(rows,owner,'all','').map(c=>c.name),['Ana Person','Archive One','Lee Closed','Mila Contact','Zoë Visitor']);
 assert.deepEqual(findLoadedContacts(rows,owner,'all','hidden'),[]);
 assert.deepEqual(findLoadedContacts(rows,owner,'all','zoë').map(c=>c.name),['Zoë Visitor']);
 assert.deepEqual(findLoadedContacts(rows,other,'all','').map(c=>c.name),['Hidden Other']);
});
test('Contacts filters keep archived separate from closed, even when searching',()=>{
 assert.deepEqual(findLoadedContacts(rows,owner,'open','').map(c=>c.name),['Ana Person','Mila Contact','Zoë Visitor']);
 assert.deepEqual(findLoadedContacts(rows,owner,'closed','').map(c=>c.name),['Lee Closed']);
 assert.deepEqual(findLoadedContacts(rows,owner,'archived','').map(c=>c.name),['Archive One']);
 assert.deepEqual(findLoadedContacts(rows,owner,'new','').map(c=>c.name),['Ana Person']);
 assert.deepEqual(findLoadedContacts(rows,owner,'paused','').map(c=>c.name),['Mila Contact']);
});
test('Contacts counts cannot include other member records',()=>{
 assert.deepEqual(contactCounts(rows,owner),{loaded:5,open:3,new:1,active:1,paused:1,closed:1,archived:1});
 assert.deepEqual(contactCounts(rows,other),{loaded:1,open:1,new:0,active:1,paused:0,closed:0,archived:0});
});
test('Malformed workspace missing owner identifiers fails closed',()=>{
 const malformed={...record(9,'Should remain hidden','active'),ownerId:undefined};
 assert.deepEqual(findLoadedContacts([malformed as unknown as ContactSummary],undefined as unknown as string,'all',''),[]);
 assert.equal(contactCounts([malformed as unknown as ContactSummary],undefined as unknown as string).loaded,0);
});
