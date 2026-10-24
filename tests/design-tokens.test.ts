import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {designTokens,swipeTabs} from '../lib/design-tokens.ts';
import {nextTabIndex,swipeDirection} from '../lib/use-swipe-tabs.ts';

const css=readFileSync(new URL('../styles/lvz-tokens.css',import.meta.url),'utf8');
const token=(name:string)=>css.match(new RegExp('--lvz-'+name+':([^;]+);'))?.[1].trim();

test('script tokens match the CSS token file',()=>{
 assert.equal(token('ground'),designTokens.ground);
 assert.equal(token('surface'),designTokens.surface);
 assert.equal(token('ink'),designTokens.ink);
 assert.equal(token('accent'),designTokens.accent);
});

test('the manifest uses the shared base colors',async()=>{
 const {default:manifest}=await import('../app/manifest.ts');
 const m=manifest();
 assert.equal(m.theme_color,designTokens.accent);
 assert.equal(m.background_color,designTokens.ground);
});

test('a tab swipe needs distance, a mostly horizontal path and speed',()=>{
 assert.equal(swipeDirection(-swipeTabs.minDistance,0,100),1);
 assert.equal(swipeDirection(swipeTabs.minDistance,0,100),-1);
 assert.equal(swipeDirection(-(swipeTabs.minDistance-1),0,100),0,'too short');
 assert.equal(swipeDirection(-90,60,100),0,'not horizontal enough');
 assert.equal(swipeDirection(-91,60,100),1);
 assert.equal(swipeDirection(-200,0,swipeTabs.maxDurationMs),0,'too slow');
});

test('swiping never wraps past the first or last tab',()=>{
 assert.equal(nextTabIndex(0,3,-1),0);
 assert.equal(nextTabIndex(2,3,1),2);
 assert.equal(nextTabIndex(1,3,1),2);
 assert.equal(nextTabIndex(1,3,0),1);
});
