import {digest, validateManifest} from './offline-store.js';
export async function downloadCity({manifest, scope, storage, signal, progress = () => {}, cacheStorage = caches, fetcher = fetch, persist = () => globalThis.navigator?.storage?.persist?.() || Promise.resolve(false)}) {
  validateManifest(manifest, scope);
  const cacheName = storage.packageName(manifest.version), cache = await cacheStorage.open(cacheName);
  const previous = await storage.read();
  await storage.write({...previous, pending: {cacheName, version: manifest.version}});
  let done = 0, bytes = 0, next = 0, failure;
  const report = file => { done++; bytes += file.bytes; progress({done, bytes, total: manifest.files.length, totalBytes: manifest.bytes}); };
  async function worker() {
    while (!failure && next < manifest.files.length) {
      signal.throwIfAborted();
      const file = manifest.files[next++], url = new URL(file.url, scope).href;
      if (await cache.match(url)) { report(file); continue; }
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        signal.throwIfAborted();
        const controller = new AbortController(), abort = () => controller.abort(signal.reason);
        signal.addEventListener('abort', abort, {once: true});
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetcher(url, {signal: controller.signal, cache: 'no-store', headers: {'X-Travel-Download': '1'}});
          if (!response.ok) throw new Error(`Файл недоступен (HTTP ${response.status})`);
          const data = await response.arrayBuffer();
          if (data.byteLength !== file.bytes || await digest(data) !== file.sha256) throw new Error('Пакет на сервере изменился. Обновите страницу и повторите загрузку.');
          signal.throwIfAborted();
          await cache.put(url, new Response(data, {headers: {'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream'}}));
          lastError = null; break;
        } catch (error) { lastError = error; }
        finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); }
        if (lastError?.name === 'QuotaExceededError') break;
      }
      if (lastError) { failure = lastError; break; }
      report(file);
    }
  }
  const results = await Promise.allSettled(Array.from({length: 4}, () => worker()));
  signal.throwIfAborted();
  const rejection = results.find(result => result.status === 'rejected');
  if (failure || rejection) throw failure || rejection.reason;
  if (done !== manifest.files.length) throw new Error('Загрузка не завершена');
  // Complete manifest and pointer are written only after every verified file.
  await cache.put(new URL('offline/manifest.json', scope), new Response(JSON.stringify(manifest), {headers: {'Content-Type': 'application/json'}}));
  const persistent = await persist().catch(() => false) || false;
  const active = {cacheName, version: manifest.version, bytes, files: done, savedAt: new Date().toISOString(), persistent, map: manifest.map};
  await storage.write({active});
  for (const name of await cacheStorage.keys()) if (name.startsWith(storage.prefix + 'package:') && name !== cacheName) await cacheStorage.delete(name);
  return active;
}
