import {cityStorage, validateManifest} from './offline-store.js';
import {downloadCity} from './offline-download.js';
import {el} from './dom.js';
const mb = bytes => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 1}).format(bytes / 1e6) + ' МБ';
export async function setupOffline(context) {
  const button = document.getElementById('offline-toggle'), panel = document.getElementById('offline-panel');
  if (!button || !panel) return;
  button.hidden = false;
  const scope = context.pages.map, storage = cityStorage(scope);
  const title = el('strong', context.city.name + ' на устройстве'), close = el('button', 'Закрыть ×'); close.type = 'button';
  const heading = el('div', undefined, 'offline-heading'); heading.append(title, close);
  const description = el('p', `${context.city.offline?.coverageLabel || context.city.name}: карта, все карточки, сравнение отелей и фотографии. Без интернета доступна область из пакета. Остальная карта подгружается автоматически при доступном интернете.`);
  const status = el('p', 'Проверяю хранилище…'); status.id = 'offline-status'; status.setAttribute('role', 'status');
  const progress = el('progress'); progress.hidden = true; progress.setAttribute('aria-label', 'Сохранение города');
  const actions = el('div', undefined, 'offline-actions'), save = el('button', 'Скачать город'), cancel = el('button', 'Остановить'), remove = el('button', 'Удалить с устройства');
  for (const action of [save, cancel, remove]) action.type = 'button';
  save.id = 'offline-save'; cancel.id = 'offline-cancel'; remove.id = 'offline-remove'; cancel.hidden = remove.hidden = true;
  actions.append(save, cancel, remove);
  const note = el('p', 'Город хранится в этом браузере на этом устройстве. Очистка данных сайта удалит пакет. Для навигации в AMap и внешних ссылок нужен интернет.', 'offline-note');
  panel.replaceChildren(heading, description, status, progress, actions, note);
  const toggle = open => { panel.hidden = !open; button.setAttribute('aria-expanded', String(open)); if (open) close.focus(); };
  button.onclick = () => toggle(panel.hidden); close.onclick = () => { toggle(false); button.focus(); };
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); toggle(false); button.focus(); } });
  if (!('serviceWorker' in navigator) || !globalThis.caches || !globalThis.crypto?.subtle) {
    status.textContent = 'Этот браузер не поддерживает сохранение города. Откройте сайт в современном Safari, Chrome или Firefox.'; save.hidden = true; return;
  }
  let manifest, state = {}, controller, busy = false, registration;
  const channel = globalThis.BroadcastChannel ? new BroadcastChannel('travel-city:' + new URL(scope).pathname) : null;
  function summary() {
    button.textContent = state.active ? 'Город сохранён ✓' : state.pending ? 'Продолжить скачивание' : 'Сохранить город';
    save.textContent = state.pending ? 'Продолжить скачивание' : state.active ? 'Проверить обновления' : manifest ? 'Скачать · ' + mb(manifest.bytes) : 'Скачать город';
    remove.hidden = !state.active && !state.pending;
    if (state.active) status.textContent = `Сохранено ${new Date(state.active.savedAt).toLocaleString(context.city.locale)} · ${mb(state.active.bytes)}. Карта, карточки и фотографии доступны без интернета.`;
    else if (state.pending) status.textContent = 'Предыдущая загрузка не завершена. Её можно продолжить; уже загруженные файлы сохранятся.';
    else if (manifest) status.textContent = `${context.points.length} мест · ${context.points.reduce((n,p) => n+p.photos.length, 0)} фотографий · ${mb(manifest.bytes)}. Оставьте вкладку открытой до завершения скачивания.`;
    else status.textContent = 'Для первой загрузки города подключитесь к интернету.';
  }
  async function freshManifest() {
    const response = await fetch(new URL('offline/manifest.json', scope), {cache: 'no-store', headers: {'X-Travel-Download': '1'}});
    if (!response.ok) throw new Error('Не удалось получить пакет города. Проверьте подключение.');
    manifest = validateManifest(await response.json(), scope); return manifest;
  }
  async function refreshWorker() {
    const worker = navigator.serviceWorker.controller || registration.active;
    if (!worker) throw new Error('Не удалось включить доступ без интернета. Перезагрузите страницу.');
    await new Promise((resolve, reject) => {
      const message = new MessageChannel(), timer = setTimeout(() => reject(new Error('Не удалось обновить сохранённый город. Перезагрузите страницу.')), 5000);
      message.port1.onmessage = () => { clearTimeout(timer); message.port1.close(); resolve(); };
      worker.postMessage({type: 'CITY_CACHE_CHANGED'}, [message.port2]);
    });
  }
  const exclusive = async action => {
    if (navigator.locks) return navigator.locks.request('travel-city:' + new URL(scope).pathname, {ifAvailable: true}, lock => {
      if (!lock) throw new Error('Город уже загружается в другой вкладке.'); return action();
    });
    return action();
  };
  save.onclick = async () => {
    if (busy) return;
    busy = true; save.disabled = true; remove.disabled = true;
    controller = new AbortController();
    try {
      await exclusive(async () => {
        await freshManifest(); state = await storage.read();
        if (state.active?.version === manifest.version) { status.textContent = 'На устройстве уже сохранена последняя версия города.'; return; }
        const estimate = await navigator.storage?.estimate?.();
        let remaining = manifest.bytes;
        const staging = storage.packageName(manifest.version);
        if ((await caches.keys()).includes(staging)) {
          const saved = new Set((await (await caches.open(staging)).keys()).map(request => request.url));
          remaining = manifest.files.filter(file => !saved.has(new URL(file.url, scope).href)).reduce((sum, file) => sum + file.bytes, 0);
        }
        if (estimate?.quota && estimate.quota - estimate.usage < remaining * 1.1) throw new Error(`Недостаточно свободного места. Для оставшихся файлов нужно около ${mb(remaining * 1.1)}.`);
        cancel.hidden = false; progress.hidden = false; progress.max = manifest.bytes; progress.value = 0;
        const active = await downloadCity({manifest, scope, storage, signal: controller.signal, progress: value => {
          progress.value = value.bytes;
          const percent = Math.floor(value.bytes / value.totalBytes * 100);
          status.textContent = `Скачано ${value.done} из ${value.total} файлов · ${mb(value.bytes)} из ${mb(value.totalBytes)}. Не закрывайте вкладку.`;
          button.textContent = 'Скачивание · ' + percent + '%';
        }});
        state = {active}; await refreshWorker(); channel?.postMessage({type: 'changed', action: 'saved'});
        summary();
        try { sessionStorage.setItem('travel-city:saved-panel:' + new URL(scope).pathname, '1'); } catch {}
        location.reload();
      });
    } catch (error) {
      state = await storage.read(); summary();
      status.textContent = error.name === 'AbortError' ? 'Загрузка остановлена. Нажмите «Продолжить скачивание», чтобы догрузить оставшиеся файлы.' : error.name === 'QuotaExceededError' ? 'В хранилище закончилось место. Освободите место и продолжите загрузку.' : error.message;
    } finally { busy = false; save.disabled = false; remove.disabled = false; cancel.hidden = true; progress.hidden = true; }
  };
  cancel.onclick = () => { controller?.abort(); cancel.disabled = true; status.textContent = 'Останавливаю загрузку…'; setTimeout(() => cancel.disabled = false, 500); };
  remove.onclick = async () => {
    if (busy) return;
    try {
      await exclusive(async () => { await storage.clear(); state = {}; await refreshWorker(); channel?.postMessage({type: 'changed', action: 'deleted'}); summary(); document.dispatchEvent(new Event('travel-offline-changed')); });
    } catch (error) { status.textContent = error.message; }
  };
  channel?.addEventListener('message', async event => { if (!busy) { if (event.data?.action === 'saved') { location.reload(); return; } state = await storage.read(); summary(); document.dispatchEvent(new Event('travel-offline-changed')); } });
  try {
    registration = await navigator.serviceWorker.register(new URL('sw.js', scope), {scope, type: 'module', updateViaCache: 'none'});
  } catch (error) {
    registration = await navigator.serviceWorker.getRegistration(scope);
    if (!registration?.active) { status.textContent = 'Не удалось включить сохранение. Подключитесь к интернету и перезагрузите страницу.'; save.hidden = true; return; }
  }
  if (!registration.active) await new Promise(resolve => {
    const worker = registration.installing || registration.waiting;
    if (!worker) { resolve(); return; }
    worker.addEventListener('statechange', () => { if (worker.state === 'activated' || worker.state === 'redundant') resolve(); });
  });
  state = await storage.read();
  if (state.active && !(await caches.keys()).includes(state.active.cacheName)) { state = {}; await storage.write(state); }
  summary();
  try { const key = 'travel-city:saved-panel:' + new URL(scope).pathname; if (sessionStorage.getItem(key)) { sessionStorage.removeItem(key); toggle(true); } } catch {}
  if (!state.active) { try { await freshManifest(); summary(); } catch {} }
}
