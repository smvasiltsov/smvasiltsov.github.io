// Only explicit, verified city downloads enter these caches.
export function cityStorage(scope, cacheStorage = globalThis.caches) {
  const base = new URL(scope), prefix = `travel-city:${base.pathname}:`;
  const stateUrl = new URL('.offline-state.json', base).href;
  return {
    prefix,
    packageName: version => prefix + 'package:' + version,
    async read() {
      const names = await cacheStorage.keys();
      if (!names.includes(prefix + 'meta')) return {};
      const response = await (await cacheStorage.open(prefix + 'meta')).match(stateUrl);
      return response ? response.json() : {};
    },
    async write(state) {
      const cache = await cacheStorage.open(prefix + 'meta');
      await cache.put(stateUrl, new Response(JSON.stringify(state), {headers: {'Content-Type': 'application/json'}}));
    },
    async clear() {
      for (const name of await cacheStorage.keys()) if (name.startsWith(prefix)) await cacheStorage.delete(name);
    }
  };
}
export function canonicalRequest(url, scope, navigation = false) {
  const result = new URL(url), base = new URL(scope);
  if (result.origin !== base.origin) return result.href;
  if (navigation && (result.pathname === base.pathname || result.pathname === base.pathname + 'index.html' || result.pathname === base.pathname + 'compare.html')) {
    if (result.pathname.endsWith('/index.html')) result.pathname = base.pathname;
    result.search = ''; result.hash = '';
  }
  return result.href;
}
export function validateManifest(manifest, scope) {
  const base = new URL(scope);
  if (manifest.schemaVersion !== 1 || !/^[a-f\d]{24}$/.test(manifest.version) || !Array.isArray(manifest.files) || !manifest.files.length) throw new Error('Некорректный пакет города');
  const seen = new Set(); let size = 0;
  for (const file of manifest.files) {
    const url = new URL(file.url, base);
    if (url.origin !== base.origin || !(url.pathname.startsWith(base.pathname) || url.pathname.startsWith('/travel-map/')) || url.search || url.hash || !/^[a-f\d]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || seen.has(url.href)) throw new Error('Некорректный файл пакета');
    seen.add(url.href); size += file.bytes;
  }
  if (size !== manifest.bytes || !seen.has(new URL(manifest.map.style, base).href)) throw new Error('Неполный пакет города');
  for (const page of ['', 'compare.html']) if (!seen.has(new URL(page, base).href)) throw new Error('В пакете нет страниц города');
  return manifest;
}
export async function digest(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
}
