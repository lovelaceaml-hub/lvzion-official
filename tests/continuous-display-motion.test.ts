import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const file=new URL('../public/billboard-preview/motion-scenes.css',import.meta.url);
test('cinematic scenes: four independent visual families exist',async()=>{
 const css=await readFile(file,'utf8');
 for(const selector of ['.editorial .art i:nth-child(1)', '.schedule .date-block::before', '.event .art i:nth-child(1)', '.campaign .art::before']) assert.ok(css.includes(selector),selector);
 for(const keyframe of ['lvz-leaf-left','lvz-date-sheen','lvz-event-sun','lvz-bubbles-float']) assert.ok(css.includes('@keyframes '+keyframe),keyframe);
});
test('cinematic scenes: motion never controls content eligibility',async()=>{
 const css=await readFile(file,'utf8');
 for(const forbidden of ['/api/', 'http://','https://','@import','url(', 'animation-play-state:running']) assert.ok(!css.includes(forbidden),'No remote or API content in motion stylesheet: '+forbidden);
});
test('cinematic scenes: still and reduced-motion gate all animations',async()=>{
 const css=await readFile(file,'utf8');
 assert.ok(css.includes('body.motion-still *'));assert.ok(css.includes('prefers-reduced-motion:reduce'));assert.ok(css.includes('animation:none!important'));
});
test('cinematic scenes: offline shell caches motion resources but not studio source',async()=>{
 const sw=await readFile(new URL('../public/billboard-preview/sw.js',import.meta.url),'utf8');
 assert.ok(sw.includes("'/billboard-preview/motion.css'"));
 assert.ok(sw.includes("'/billboard-preview/motion-scenes.css'"));
 assert.ok(!sw.includes("'/billboard-preview/studio.mjs'"));
});
test('cinematic scenes: phone lab has clear four-mode control',async()=>{
 const studio=await readFile(new URL('../public/billboard-preview/studio.mjs',import.meta.url),'utf8');
 for(const mode of ['standard','lively','still','calm'])assert.ok(studio.includes(mode));
 assert.ok(studio.includes("motionMode=modes[(modes.indexOf(motionMode)+1)%modes.length]"));
});
