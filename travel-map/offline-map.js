import {cityStorage} from './offline-store.js';
export async function savedMap(context) {
  if (!globalThis.caches) return null;
  try {
    const scope = context.pages.map, {active} = await cityStorage(scope).read();
    if (!active) return null;
    const cache = await caches.open(active.cacheName), url = new URL(active.map.style, scope);
    const response = await cache.match(url.href);
    if (!response) return null;
    const style = await response.json();
    const absolute = path => new URL(path, url).href.replaceAll('%7B', '{').replaceAll('%7D', '}');
    for (const source of Object.values(style.sources)) {
      if (source.tiles) source.tiles = source.tiles.map(path => absolute(path));
      if (source.url) source.url = absolute(source.url);
    }
    style.glyphs = absolute(style.glyphs);
    if (typeof style.sprite === 'string') style.sprite = absolute(style.sprite);
    return {...active.map, style};
  } catch { return null; }
}
