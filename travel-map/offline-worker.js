import {cityStorage, canonicalRequest, isRuntimeResource} from './offline-store.js';
const scope = self.registration.scope, storage = cityStorage(scope);
let state;
const current = () => state ||= storage.read();
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type === 'CITY_CACHE_CHANGED') event.waitUntil((async () => {
    state = storage.read(); await state; event.ports[0]?.postMessage({ok: true});
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('X-Travel-Download')) return;
  event.respondWith((async () => {
    const active = (await current()).active;
    if (active) {
      const cache = await caches.open(active.cacheName);
      const cached = await cache.match(canonicalRequest(request.url, scope, request.mode === 'navigate'));
      if (cached) return cached;
    }
    try { return await fetch(request,isRuntimeResource(request.url,scope,request.mode==='navigate')?{cache:'no-cache'}:undefined); }
    catch {
      return new Response(request.mode === 'navigate' ? 'Этот город ещё не сохранён. Подключитесь к интернету и скачайте город на главной странице.' : '', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    }
  })());
});
