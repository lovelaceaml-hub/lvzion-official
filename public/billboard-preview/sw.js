/* Fictional display-only offline shell. Never intercept member, auth, management or API pages. */
const CACHE='lvzion-billboard-fictional-shell-r1';
const FILES=['/billboard-preview/engine.mjs','/billboard-preview/demo.mjs','/billboard-preview/style.css'];
const PLAYER='/billboard-preview/player';
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(FILES);const r=await fetch(PLAYER,{cache:'no-store'});if(r.ok&&(r.headers.get('content-type')||'').includes('text/html')){const t=await r.clone().text();if(t.includes('id="billboard-root"')&&t.includes('Development preview'))await c.put(PLAYER,new Response(t,{headers:{'Content-Type':'text/html'}}));}})()));
// Do not skipWaiting/claim mid-slide. A new shell activates on the next browser restart.
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('lvzion-billboard-fictional-shell-')&&name!==CACHE)await caches.delete(name);})()));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||u.search||(!FILES.includes(u.pathname)&&u.pathname!==PLAYER))return;event.respondWith((async()=>{try{const r=await fetch(event.request);if(r.status===401||r.status===403){await caches.delete(CACHE);return r;}return r;}catch{const r=await caches.match(u.pathname);if(r)return r;return new Response('Welcome. The display is unavailable.',{headers:{'Content-Type':'text/plain'}});}})());});
