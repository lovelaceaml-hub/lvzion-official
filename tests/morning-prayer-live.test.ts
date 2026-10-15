import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('actual Morning Prayer landing is member and module authorized',async()=>{
 const source=await readFile('app/modules/work-mission-prayer/page.tsx','utf8');
 assert.match(source,/requireMember/);assert.match(source,/member_module_home/);
 assert.match(source,/parseModuleFeed/);assert.doesNotMatch(source,/demoWorkspace|MorningPrayerPreview/);
});
test('actual Morning Prayer GET API is private and server-session scoped',async()=>{
 const source=await readFile('app/api/morning-prayer/route.ts','utf8');
 assert.match(source,/requireMember/);assert.match(source,/mpg_live_home/);assert.match(source,/privateHeaders/);
 assert.match(await readFile('lib/morning-prayer/server.ts','utf8'),/'Cache-Control':'private, no-store, max-age=0'/);
 assert.doesNotMatch(source,/authAdminClient|service_role|firebase/);
});
test('mutations require origin, membership and server RPC authorization',async()=>{
 for(const path of ['app/api/morning-prayer/command/route.ts','app/api/morning-prayer/setup/route.ts']){
 const source=await readFile(path,'utf8');assert.match(source,/request\.headers\.get\('origin'\)/);
 assert.match(source,/requireMember/);assert.match(source,/client\.rpc\('mpg_live_/);
 assert.doesNotMatch(source,/NEXT_PUBLIC_|authAdminClient|service_role/);
 }
});
test('real migration installs empty and owner-only with all private tables RLS',async()=>{
 const sql=await readFile('supabase/migrations/20261014224129_morning_prayer_live_core.sql','utf8');
 assert.match(sql,/bootstrap_receipts/);assert.match(sql,/status in \('active','intake'\)/);
 assert.match(sql,/enabled boolean not null default false/);assert.match(sql,/enable row level security/);
 assert.match(sql,/module_key='work-mission-prayer'/);assert.match(sql,/review_requests/);
 assert.match(sql,/revoke all on function public\.mpg_live_home/);
 assert.doesNotMatch(sql,/values\s*\(\s*'2026-\d{2}-\d{2}'/i);
});
