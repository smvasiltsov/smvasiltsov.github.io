import {el} from './dom.js';
import {InstallPrompt, installedDisplay} from './install-prompt.js';
export function setupInstall() {
  const button = document.getElementById('install-app');
  if (!button) return;
  const modes = ['standalone', 'fullscreen', 'minimal-ui'].map(mode => matchMedia(`(display-mode: ${mode})`));
  const standalone = () => installedDisplay({standalone: modes[0].matches, fullscreen: modes[1].matches, minimalUi: modes[2].matches, iosStandalone: navigator.standalone === true});
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(navigator.userAgent);
  const dialog = el('dialog'); dialog.id = 'install-dialog'; dialog.setAttribute('aria-labelledby', 'install-title');
  const heading = el('div', undefined, 'install-heading'), title = el('h2', 'Карта на главном экране'), close = el('button', 'Закрыть ×');
  title.id = 'install-title'; close.type = 'button'; heading.append(title, close);
  const intro = el('p', 'Открывайте сохранённый город с иконки, как отдельное приложение.');
  const status = el('p'); status.id = 'install-status'; status.setAttribute('role', 'status'); status.hidden = true;
  const native = el('button', 'Установить приложение'); native.id = 'install-native'; native.type = 'button'; native.hidden = true;
  const prompt = new InstallPrompt(() => { native.hidden = !prompt.offer; });
  function guide(label, steps, open) {
    const details = el('details'), list = el('ol'); details.open = open; details.append(el('summary', label));
    for (const step of steps) list.append(el('li', step)); details.append(list); return details;
  }
  const iphone = guide('iPhone / iPad · Safari', [
    'Откройте этот сайт в Safari. Если вы во встроенном браузере другого приложения, сначала перейдите в Safari.',
    'Нажмите «Поделиться» — значок квадрата со стрелкой вверх — и выберите «На экран „Домой“». Если пункта нет, найдите его через «Изменить действия».',
    'Если есть переключатель «Открывать как веб-приложение», оставьте его включённым. Нажмите «Добавить».'
  ], ios);
  const google = guide('Android · Chrome', [
    'Откройте этот сайт в Chrome на телефоне.',
    'Нажмите «Установить приложение» выше, если кнопка появилась. Либо откройте меню ⋮ и выберите «Установить приложение» / «Добавить на главный экран».',
    'Подтвердите установку или добавление в окне браузера.'
  ], android);
  const next = el('section', undefined, 'install-next'); next.append(el('strong', 'После установки — проверьте сохранение города'), el('p', 'Подключившись к интернету, откройте карту с новой иконки «Пекин». В самом приложении должен быть статус «Город сохранён ✓». Если его нет, нажмите «Сохранить город» и дождитесь завершения загрузки. Затем проверьте открытие в авиарежиме.'));
  next.append(el('p', 'На iPhone сохранение в Safari и в приложении может отличаться — проверяйте статус именно в приложении.', 'install-note'));
  dialog.append(heading, intro, native, status, iphone, google, next); document.body.append(dialog);
  const update = () => { button.hidden = standalone(); if (standalone() && dialog.open) dialog.close(); };
  update(); for (const mode of modes) mode.addEventListener('change', update);
  window.addEventListener('beforeinstallprompt', event => prompt.capture(event));
  window.addEventListener('appinstalled', () => {
    prompt.clear(); status.hidden = false; status.textContent = 'Приложение установлено. Откройте его с новой иконки и проверьте сохранение города.'; update();
  });
  button.onclick = () => { dialog.showModal(); close.focus(); };
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
  close.onclick = () => dialog.close(); dialog.addEventListener('close', () => button.focus());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
  native.onclick = async () => {
    native.disabled = true;
    try {
      const outcome = await prompt.request(); status.hidden = false;
      status.textContent = outcome === 'accepted' ? 'Установка подтверждена. Откройте приложение с новой иконки и проверьте сохранение города.' : 'Установка не завершена. Можно воспользоваться инструкцией для вашего телефона.';
    } catch { status.hidden = false; status.textContent = 'Браузер не открыл установку. Воспользуйтесь инструкцией ниже.'; }
    finally { native.disabled = false; }
  };
}
