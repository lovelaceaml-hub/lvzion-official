/* LV Zion: cache only this public fallback and generic icons. Never cache application data. */
'use strict';
const CACHE_NAME = 'lvz-public-offline-v1';
const ASSETS = ['/offline.html','/icons/lvz-192.png','/icons/lvz-512.png','/icons/lvz-maskable-512.png'];
self.addEventListener('install', event => {
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  for(const path of ASSETS){
   const request=new Request(new URL(path,self.location.origin),{credentials:'same-origin',cache:'reload'});
   const response=await fetch(request);
   if(!response.ok||response.redirected||new URL(response.url).origin!==self.location.origin||new URL(response.url).pathname!==path)throw new Error('Public offline asset unavailable');
   if(path==='/offline.html'&&!(await response.clone().text()).includes('data-lvz-offline="public-only"'))throw new Error('Unexpected offline asset');
   await cache.put(path,response);
  }
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('lvz-public-offline-')&&key!==CACHE_NAME)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Auth, API, POST bodies, cross-origin calls, and all non-navigation requests bypass the cache.
 if(request.method!=='GET'||request.mode!=='navigate'||url.origin!==self.location.origin||/^\/(api|auth)(\/|$)/.test(url.pathname))return;
 event.respondWith((async()=>{
  try{return await fetch(request);}catch{
   const fallback=await caches.match('/offline.html',{cacheName:CACHE_NAME});
   return fallback||new Response('You are offline. Reconnect to open LV Zion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  }
 })());
});
