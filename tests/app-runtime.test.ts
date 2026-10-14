import test from'node:test';
import assert from'node:assert/strict';
import{parseModuleFeed,parseFavoriteChange,parseNoticeRead,emptyModuleFeed}from'../lib/app-runtime.ts';
const a='77777777-7777-4777-8777-000000000001',b='77777777-7777-4777-8777-000000000002';
const notice='99999999-9999-4999-8999-000000000001';
const activity='88888888-8888-4888-8888-000000000001';
const moduleA={id:a,name:'Synthetic authorized module',shortName:'S',description:'Fictional test only',accent:'#52718c',status:'approved',route:'/modules/sample-a',canManage:false};
const feed=()=>({
 modules:[{...moduleA}],
 activities:[{id:activity,moduleId:a,title:'Example own activity',date:'2026-10-15',startTime:'13:30',endTime:'14:30',context:'Non-sensitive summary',source:'approved-module'}],
 notifications:[{id:notice,moduleId:a,title:'Update available in Synthetic authorized module',description:'A new update is available',createdAt:'2026-10-14T08:00:00Z',readAt:null,requiresAction:false,route:'/modules/sample-a'}],
 favorites:[a],favoriteVersion:1
});
test('empty module feed does not produce invented content',()=>assert.deepEqual(emptyModuleFeed(),{modules:[],activities:[],notifications:[],favorites:[],favoriteVersion:0}));
test('module projection returns approved authorized entries',()=>{const result=parseModuleFeed(feed());assert.equal(result.modules.length,1);assert.equal(result.activities.length,1);assert.equal(result.notifications.length,1);assert.deepEqual(result.favorites,[a]);});
test('module data projection strips unknown keys and account details',()=>{const p=feed();(p as any).secret='do not expose';(p.modules[0] as any).privateEmail='hidden@elsewhere.invalid';const v=parseModuleFeed(p);assert(!JSON.stringify(v).includes('secret'));assert(!JSON.stringify(v).includes('hidden@elsewhere.invalid'));});
test('unapproved module is rejected in a purported live feed',()=>{const p=feed();(p.modules[0] as any).status='draft';assert.throws(()=>parseModuleFeed(p));});
test('cross-module activity cannot be injected',()=>{const p=feed();(p.activities[0] as any).moduleId=b;assert.throws(()=>parseModuleFeed(p));});
test('cross-module notice cannot be injected',()=>{const p=feed();(p.notifications[0] as any).moduleId=b;assert.throws(()=>parseModuleFeed(p));});
test('external or manipulated module routes rejected',()=>{for(const route of ['https://outside.invalid','//outside.invalid','/modules/sample-a/../../','/api/users','/modules/<script>']){const p=feed();p.modules[0].route=route;assert.throws(()=>parseModuleFeed(p));}});
test('unsafe CSS color rejected',()=>{const p=feed();p.modules[0].accent='url(https://outside.invalid)';assert.throws(()=>parseModuleFeed(p));});
test('invalid activity day and clock rejected',()=>{for(const bad of ['2026-02-30','2026-13-01']){const p=feed();p.activities[0].date=bad;assert.throws(()=>parseModuleFeed(p));}const p=feed();p.activities[0].startTime='25:00';assert.throws(()=>parseModuleFeed(p));});
test('favorite version must be monotone nonnegative integer',()=>{const p=feed();(p as any).favoriteVersion=-1;assert.throws(()=>parseModuleFeed(p));});
test('favorite list cannot contain unauthorized module',()=>{const p=feed();p.favorites=[b];assert.throws(()=>parseModuleFeed(p));});
test('duplicate favorite list is rejected',()=>{const p=feed();p.favorites=[a,a];assert.throws(()=>parseModuleFeed(p));});
test('favorites save validates exact fields and identifiers',()=>{assert.deepEqual(parseFavoriteChange({moduleIds:[a],expectedVersion:1}),{moduleIds:[a],expectedVersion:1});for(const value of [null,{moduleIds:[b,b],expectedVersion:1},{moduleIds:[a],expectedVersion:1,actorId:a},{moduleIds:['invalid'],expectedVersion:1},{moduleIds:[a],expectedVersion:-1},{moduleIds:[],expectedVersion:0.5},{moduleIds:[a,a],expectedVersion:1}])assert.throws(()=>parseFavoriteChange(value));});
test('a max-eight favorite list accepted, ninth rejected',()=>{const list=Array.from({length:9},(_,i)=>'77777777-7777-4777-8777-'+String(i+1).padStart(12,'0'));assert.equal(parseFavoriteChange({moduleIds:list.slice(0,8),expectedVersion:0}).moduleIds.length,8);assert.throws(()=>parseFavoriteChange({moduleIds:list,expectedVersion:0}));});
test('notice read accepts only one UUID parameter',()=>{assert.equal(parseNoticeRead({noticeId:notice}),notice);for(const v of [{noticeId:'other'},{noticeId:notice,memberId:a},{},null])assert.throws(()=>parseNoticeRead(v));});
