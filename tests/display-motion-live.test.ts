import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDisplayMotionMode,parseDisplaySnapshotR2} from '../lib/continuous-display/operations.ts';
test('motion: only explicit four safe modes are accepted',()=>{
 for(const value of ['standard','calm','lively','still'])assert.equal(parseDisplayMotionMode(value),value);
 for(const invalid of [null,'fast','<style>',0,{},[],false])assert.throws(()=>parseDisplayMotionMode(invalid));
 assert.equal(parseDisplayMotionMode(undefined),'standard');
});
test('motion: malformed screen projection fails closed',()=>{
 const base={paired:true,screen:'Fictional screen',version:0,serverTime:'2026-10-14T23:00:00Z',leaseUntil:'2026-10-14T23:00:30Z',slides:[],operatingHours:[],overrideSlideId:null,overrideUntil:null};
 for(const mode of ['standard','calm','lively','still'])assert.equal(parseDisplaySnapshotR2({...base,motionMode:mode}).motionMode,mode);
 assert.throws(()=>parseDisplaySnapshotR2({...base,motionMode:'untrusted-css'}));
});
test('motion: owner device permission and optimistic concurrency enforced in migration',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261015004620_continuous_display_motion_r4.sql',import.meta.url),'utf8');
 for(const clause of ["require_permission(p_screen,'device')","config_version=p_expected_version","'motion_updated'","GRANT EXECUTE ON FUNCTION public.display_set_motion"])assert.ok(sql.includes(clause),clause);
 assert.ok(!sql.includes("insert into display_private.screens"));
});
test('motion: player adopts screen setting without leaking it into public unpaired flow',async()=>{
 const player=await readFile(new URL('../components/display-player.tsx',import.meta.url),'utf8');
 assert.ok(player.includes("setMotionMode(verified.packet.motionMode)"));
 assert.ok(player.includes("setMotionMode(checked.packet.motionMode)"));
 assert.ok(player.includes("cd-motion-'+motionMode"));
});
