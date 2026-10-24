import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,DEPARTMENTS,PRAYERS,USHERS,allowedTogether,departmentOf,dutyLabel,hasChoir,hasDuty,hasThanks,pairKey} from '../lib/worship-duty/domain.ts';
import {serviceLabel,vegasDate} from '../lib/worship-duty/service-time.ts';
import type {Duty} from '../lib/worship-duty/domain.ts';
test('worship catalog preserves 27 duties across eight departments without imported identities',()=>{assert.equal(CATALOG.length,27);assert.equal(DEPARTMENTS.length,8);assert.equal(new Set(CATALOG.map(d=>d.id)).size,27);});
test('worship exhaustively preserves every ordered pair: only prayer and usher by default',()=>{
 for(const a of CATALOG)for(const b of CATALOG){const expected=a.id!==b.id&&((PRAYERS.includes(a.id)&&USHERS.includes(b.id))||(USHERS.includes(a.id)&&PRAYERS.includes(b.id)));assert.equal(allowedTogether([a.id,b.id]),expected,`${a.id}/${b.id}`);}
});
test('worship all 19683 ordered triples are refused, including approved pairs',()=>{for(const a of CATALOG)for(const b of CATALOG)for(const c of CATALOG)assert.equal(allowedTogether([a.id,b.id,c.id],[pairKey(a.id,b.id),pairKey(b.id,c.id),pairKey(a.id,c.id)]),false);});
test('worship explicit pair approvals never override Opening Prayer or duplicate slots',()=>{assert.equal(allowedTogether(['media_1','offering_1'],[pairKey('media_1','offering_1')]),true);assert.equal(allowedTogether(['opening_prayer','usher_1'],[pairKey('opening_prayer','usher_1')]),false);assert.equal(allowedTogether(['thanks_prayer','lobby_security']),false);assert.equal(allowedTogether(['usher_1','usher_1']),false);assert.equal(allowedTogether(['not-a-duty' as Duty]),false);});
test('worship service applicability preserves weekly, prayer-week and feast distinctions',()=>{
 const s={worship:'Sabbath Day',period:'Morning'};assert.equal(hasThanks(s),true);assert.equal(hasChoir(' Sabbath  DAY '),true);
 assert.equal(hasDuty({...s,period:'Afternoon'},'thanks_prayer'),false);
 assert.equal(hasDuty({...s,worship:'Third Day'},'thanks_prayer'),false);
 assert.equal(hasDuty({...s,worship:'Prayer Week'},'closing_prayer'),false);
 assert.equal(hasDuty({...s,worship:'Pentecost'},'closing_prayer'),false);
 assert.equal(hasDuty({...s,worship:'Pentecost'},'thanks_prayer'),true);
 assert.equal(hasDuty({...s,worship:''},'closing_prayer'),true);
 assert.equal(hasDuty({...s,period:'Evening'},'usher_1'),true);
});
test('worship dates and times use Las Vegas rather than the viewing device',()=>{assert.equal(vegasDate('2026-10-21T02:30:00Z'),'2026-10-20');assert.match(serviceLabel('2026-10-21T02:30:00Z'),/^Tue, Oct 20, 7:30\sPM$/);assert.equal(vegasDate('2026-11-02T07:30:00Z'),'2026-11-01');});
test('worship duty labels and departments come from the catalog',()=>{assert.equal(dutyLabel('lobby_security'),'Lobby Security');assert.equal(departmentOf('lobby_security'),'Usher Brothers');assert.equal(departmentOf('thanks_prayer'),'Worship');});
