import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import {appearanceThemes,parseTheme,THEME_STORAGE_KEY} from '../lib/appearance-themes.ts';
import {themeBootstrap} from '../lib/appearance.ts';

test('only the 24 known theme IDs are accepted as preferences',()=>{
 assert.equal(appearanceThemes.length,24);assert.equal(new Set(appearanceThemes.map(t=>t.id)).size,24);
 for(const theme of appearanceThemes)assert.equal(parseTheme(theme.id),theme.id);
 for(const value of [null,undefined,{},4,'','default','DARK','<style>','__proto__','midnight-sapphire '])assert.equal(parseTheme(value),'default');
});
test('saved appearance is available before the first paint without exposing other storage',()=>{
 const dataset:Record<string,string>={};
 runInNewContext(themeBootstrap,{location:{pathname:'/members'},document:{documentElement:{dataset}},localStorage:{getItem(key:string){assert.equal(key,THEME_STORAGE_KEY);return 'midnight-sapphire';}}});
 assert.equal(dataset.lvzTheme,'midnight-sapphire');
});
test('blocked or invalid preference storage leaves the approved default intact',()=>{
 for(const getItem of [()=>{throw Error('Storage blocked');},()=>'<script>bad()</script>',()=>null]){
  const dataset={};assert.doesNotThrow(()=>runInNewContext(themeBootstrap,{location:{pathname:'/members'},document:{documentElement:{dataset}},localStorage:{getItem}}));assert.deepEqual(dataset,{});
 }
});
test('device theme preference does not override published audience displays',()=>{
 const dataset={};runInNewContext(themeBootstrap,{location:{pathname:'/display'},document:{documentElement:{dataset}},localStorage:{getItem(){throw Error('Should not read a device theme here');}}});assert.deepEqual(dataset,{});
});
test('every theme has a scoped CSS override and readable solid token pairs',()=>{
 const css=readFileSync(new URL('../styles/lvz-themes.css',import.meta.url),'utf8');
 function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
 function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 for(const theme of appearanceThemes){
  assert.ok(css.includes(`:root[data-lvz-theme="${theme.id}"] .app-frame`));
  assert.ok(contrast(theme.text,theme.surface)>=4.5,theme.name+' body text');
  assert.ok(contrast(theme.muted,theme.surface)>=4.5,theme.name+' secondary text');
  assert.ok(contrast(theme.onAccent,theme.accent)>=4.5,theme.name+' action text');
 }
});
