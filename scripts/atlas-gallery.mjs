// Composes the Atlas side-by-side gallery from captures made by
// `LVZ_SWEEP_SPEC=atlas node scripts/design-sweep.mjs <shots-dir>`.
// Each phone image: rebuilt screen (Light, Dark) | the matching Atlas screen in
// Liquid Opal | the Study Rooms Liquid Opal reference. Wide images: rebuilt
// screen at 1280px (Light, Dark) | the Atlas desktop screen in Liquid Opal.
// Usage: node scripts/atlas-gallery.mjs <shots-dir> [out-dir] [name-filter]
// LVZ_ATLAS_DIR points at the Theme Atlas (LVZ_Theme_Atlas_2026-10-19).
import {chromium} from '@playwright/test';
import {readdirSync,readFileSync,existsSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

const shots=resolve(process.argv[2]||'docs/audit/atlas-shots');
const out=resolve(process.argv[3]||'docs/design/atlas-build');
const filter=process.argv[4]||'';
const atlas=resolve(process.env.LVZ_ATLAS_DIR||join(process.env.HOME||'','.codex/.chatgpt-projects/g-p-6ab5d4a7ab28819189d64c4be4891daa/output/LVZ_Theme_Atlas_2026-10-19'));
if(!existsSync(join(atlas,'screens')))throw Error('Set LVZ_ATLAS_DIR to the Theme Atlas folder.');
const reference=join(atlas,'screens/study-availability/mobile/liquid-opal.png');
const url=p=>pathToFileURL(p).href;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

function entries(width){
 const dir=join(shots,width);if(!existsSync(dir))return [];
 const map=new Map();
 for(const f of readdirSync(dir).filter(f=>f.endsWith('.json'))){
  const meta=JSON.parse(readFileSync(join(dir,f),'utf8'));
  if(filter&&!meta.name.includes(filter))continue;
  const e=map.get(meta.name)??{...meta,images:{}};
  e.images[meta.scheme]=join(dir,`${meta.name}-${meta.scheme}.png`);
  e.errors=[...(e.errors??[]),...meta.errors];map.set(meta.name,e);
 }
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function panel(label,src,w,h){
 return `<figure><figcaption>${esc(label)}</figcaption>${src&&existsSync(src)?`<img src="${url(src)}" style="width:${w}px;height:${h}px">`:`<div class="missing" style="width:${w}px;height:${h}px">Not captured</div>`}</figure>`;
}
const css=`html{background:#f2f2f4}body{display:inline-block;margin:0;padding:20px;background:#f2f2f4;font:14px/1.4 -apple-system,system-ui,sans-serif;color:#222}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 14px;color:#555;max-width:1500px}main{display:flex;gap:16px;align-items:flex-start}figure{margin:0}figcaption{font-weight:600;margin-bottom:6px}img{display:block;border-radius:10px;box-shadow:0 1px 6px #0002;object-fit:cover;object-position:top}.missing{display:grid;place-items:center;background:#ddd;border-radius:10px;color:#666}`;

const browser=await chromium.launch(process.env.LVZ_CHROMIUM_PATH?{executablePath:process.env.LVZ_CHROMIUM_PATH}:{channel:'chrome'});
const tmp=mkdtempSync(join(tmpdir(),'lvz-gallery-'));
mkdirSync(out,{recursive:true});
const made=[];
try{
 const page=await browser.newPage({viewport:{width:2000,height:1100}});
 async function compose(file,title,notes,panels){
  const html=join(tmp,file+'.html');
  writeFileSync(html,`<!doctype html><meta charset="utf-8"><style>${css}</style><h1>${esc(title)}</h1><p>${esc(notes)}</p><main>${panels.join('')}</main>`);
  await page.goto(url(html));await page.waitForLoadState('load');
  await page.locator('body').screenshot({path:join(out,file),type:'jpeg',quality:78});
  made.push(file);
 }
 for(const e of entries('390')){
  const target=join(atlas,'screens',e.atlas,'mobile/liquid-opal.png');
  await compose(`${e.name}-390.jpg`,`${e.title} · 390px`,`Rebuilt screen (fictional fixtures) beside Atlas "${e.atlas}" in Liquid Opal and the Study Rooms Liquid Opal reference. ${e.notes||''}`,[
   panel('Rebuilt · Light',e.images.light,390,920),panel('Rebuilt · Dark',e.images.dark,390,920),
   panel(`Atlas ${e.atlas} · Liquid Opal`,target,390,920),panel('Reference · Study Rooms Liquid Opal',reference,390,920)]);
 }
 for(const e of entries('1280')){
  const target=join(atlas,'screens',e.atlas,'desktop/liquid-opal.png');
  await compose(`${e.name}-1280.jpg`,`${e.title} · 1280px`,`Rebuilt screen at 1280px beside the Atlas "${e.atlas}" desktop composition in Liquid Opal. ${e.notes||''}`,[
   panel('Rebuilt · Light',e.images.light,640,400),panel('Rebuilt · Dark',e.images.dark,640,400),panel(`Atlas ${e.atlas} · Liquid Opal`,target,576,400)]);
 }
}finally{await browser.close();rmSync(tmp,{recursive:true,force:true});}
console.log(`Wrote ${made.length} images to ${out}`);
