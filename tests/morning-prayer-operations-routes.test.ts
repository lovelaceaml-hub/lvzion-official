import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
for(const path of ['app/api/morning-prayer/access/route.ts','app/api/morning-prayer/batch/route.ts','app/api/morning-prayer/meeting/route.ts','app/api/morning-prayer/join/route.ts'])
 test('Morning Prayer R4 endpoint requires verified member identity: '+path,async()=>{
 const s=await readFile(path,'utf8');
 assert.match(s,/requireMember/);assert.match(s,/Cache|privateHeaders/);
 assert.doesNotMatch(s,/authAdminClient|service.role|NEXT_PUBLIC_SUPABASE_SECRET/i);
 });
test('Morning Prayer R4 meeting route never returns unverified URL',async()=>{
 const s=await readFile('app/api/morning-prayer/join/route.ts','utf8');
 assert.match(s,/mpg_live_join/);assert.match(s,/zoom/);assert.match(s,/guardedJSON/);
});
test('Morning Prayer R4 keeps historical Firebase automations disconnected',async()=>{
 for(const p of ['components/morning-prayer/MorningPrayerOperations.tsx','app/api/morning-prayer/access/route.ts']){
 const s=await readFile(p,'utf8');assert.doesNotMatch(s,/https:\/\/lv-wm-prayer|groupme\.com\/v3/);
 }
});
