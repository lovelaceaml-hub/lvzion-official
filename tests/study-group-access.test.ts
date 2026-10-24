import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGroupAccess,accessState} from '../lib/study-rooms/group-access.ts';

const id='44444444-4444-4444-8444-000000000108';
test('group access accepts only on/off for one member id',()=>{
 assert.deepEqual(parseGroupAccess({action:'enable',memberId:id,extra:'ignored'}),{action:'enable',memberId:id});
 assert.deepEqual(parseGroupAccess({action:'disable',memberId:id}),{action:'disable',memberId:id});
 for(const bad of [null,'enable',{action:'list',memberId:id},{action:'grant',memberId:id},{action:'enable'},{action:'enable',memberId:'108'},{action:'enable',memberId:42}])
  assert.throws(()=>parseGroupAccess(bad));
});
test('leaders and managers show as fixed; members follow their switch',()=>{
 const base={id,name:'Hugo Example',unit:'Demo Unit B1',automatic:false,enabled:false,locked:false,self:false};
 assert.deepEqual(accessState({...base,automatic:true}),{on:true,fixed:true,note:'On automatically'});
 assert.deepEqual(accessState({...base,automatic:true,enabled:true,locked:true}),{on:true,fixed:true,note:'Reservation manager'});
 assert.deepEqual(accessState({...base,enabled:true,locked:true}),{on:true,fixed:true,note:'Reservation manager'});
 assert.deepEqual(accessState({...base,enabled:true}),{on:true,fixed:false,note:'Can book study rooms'});
 assert.deepEqual(accessState(base),{on:false,fixed:false,note:'Cannot book yet'});
});
