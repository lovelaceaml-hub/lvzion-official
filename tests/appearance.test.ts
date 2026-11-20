import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import {appearanceChoices,APPEARANCE_STORAGE_KEY,legacyDarkThemes,legacyLightThemes,parseAppearance,resolveScheme} from '../lib/appearance-preference.ts';
import {themeBootstrap} from '../lib/appearance.ts';
import {moduleStyles} from '../lib/module-styles.ts';

function boot(saved:unknown,{path='/members',dark=false}:{path?:string;dark?:boolean}={}){
 const dataset:Record<string,string>={};
 runInNewContext(themeBootstrap,{location:{pathname:path},document:{documentElement:{dataset}},matchMedia:()=>({matches:dark}),localStorage:{getItem(key:string){assert.equal(key,APPEARANCE_STORAGE_KEY);if(saved instanceof Error)throw saved;return saved;}}});
 return dataset;
}

test('only Light, Dark and System are offered, and anything unknown means System',()=>{
 assert.deepEqual(appearanceChoices.map(c=>c.id),['system','light','dark']);
 for(const id of ['system','light','dark'])assert.equal(parseAppearance(id),id);
 for(const value of [null,undefined,{},4,'','default','DARK','<style>','__proto__','dark '])assert.equal(parseAppearance(value),'system');
});
test('choices saved from the 24-theme release keep working',()=>{
 assert.equal(legacyDarkThemes.length+legacyLightThemes.length,24);
 for(const id of legacyDarkThemes)assert.equal(parseAppearance(id),'dark');
 for(const id of legacyLightThemes)assert.equal(parseAppearance(id),'light');
});
test('System follows the device and explicit choices do not',()=>{
 assert.equal(resolveScheme('system',true),'dark');assert.equal(resolveScheme('system',false),'light');
 assert.equal(resolveScheme('light',true),'light');assert.equal(resolveScheme('dark',false),'dark');
});
test('the saved appearance applies before the first paint',()=>{
 assert.deepEqual(boot('dark'),{lvzAppearance:'dark',lvzScheme:'dark'});
 assert.deepEqual(boot('light',{dark:true}),{lvzAppearance:'light'});
 assert.deepEqual(boot(null,{dark:true}),{lvzAppearance:'system',lvzScheme:'dark'});
 assert.deepEqual(boot('midnight-sapphire'),{lvzAppearance:'dark',lvzScheme:'dark'});
 assert.deepEqual(boot('liquid-opal',{dark:true}),{lvzAppearance:'light'});
});
test('blocked or invalid storage falls back to System without throwing',()=>{
 for(const saved of [Error('Storage blocked'),'<script>bad()</script>',null])assert.doesNotThrow(()=>boot(saved));
 assert.deepEqual(boot(Error('blocked')),{lvzAppearance:'system'});
});
test('device appearance does not override published audience displays',()=>{
 const dataset={};
 runInNewContext(themeBootstrap,{location:{pathname:'/display'},document:{documentElement:{dataset}},matchMedia:()=>({matches:true}),localStorage:{getItem(){throw Error('Should not read appearance here');}}});
 assert.deepEqual(dataset,{});
});

// Every palette block in the token file must keep text, secondary text, links
// and button labels readable (WCAG AA 4.5:1) on both its ground and surface.
const css=['lvz-tokens.css','guidance-teachers-tokens.css']
 .map(file=>readFileSync(new URL('../styles/'+file,import.meta.url),'utf8')).join('\n');
function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function block(selector:string){
 const start=css.indexOf(selector+'{')>=0?css.indexOf(selector+'{'):css.indexOf(selector+',');
 assert.ok(start>=0,'missing '+selector);
 const body=css.slice(css.indexOf('{',start)+1,css.indexOf('}',start));
 return (name:string)=>body.match(new RegExp('--lvz-'+name+':(#[0-9a-f]{6});'))?.[1];
}
const palettes:[string,string][]=[[':root','base light'],[':root[data-lvz-scheme="dark"]','base dark']];
for(const m of moduleStyles){
 palettes.push([`[data-lvz-module="${m.key}"]`,m.key+' light']);
 if(!m.darkByDesign)palettes.push([`:root[data-lvz-scheme="dark"] [data-lvz-module="${m.key}"]`,m.key+' dark']);
}
test('every module in the registry has a style, and every style is readable',()=>{
 for(const [selector,label] of palettes){
  const read=block(selector);
  const [ground,surface,ink,quiet,accent,onAccent]=['ground','surface','ink','ink-quiet','accent','on-accent'].map(read) as string[];
  for(const value of [ground,surface,ink,quiet,accent,onAccent])assert.ok(value,label+' defines every palette token');
  for(const bg of [ground,surface]){
   assert.ok(contrast(ink,bg)>=4.5,label+' text');
   assert.ok(contrast(quiet,bg)>=4.5,label+' secondary text '+contrast(quiet,bg).toFixed(2));
   assert.ok(contrast(accent,bg)>=4.5,label+' links '+contrast(accent,bg).toFixed(2));
  }
  assert.ok(contrast(onAccent,accent)>=4.5,label+' button text');
  // The gradient action runs from the accent to its partner; labels stay readable across it.
  const partner=read('accent-2');assert.ok(partner,label+' defines the gradient partner');
  assert.ok(contrast(onAccent,partner!)>=4.5,label+' button text on the gradient end '+contrast(onAccent,partner!).toFixed(2));
 }
});
