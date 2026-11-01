'use strict';
const start = performance.now();
const $ = id => document.getElementById(id);
const styleURL = 'https://tiles.openfreemap.org/styles/liberty';
const observedHosts = new Set();
const errors = [];
const visits = [];
const views = {
  center: {name:'Центр Пекина',center:[116.397,39.916],zoom:13},
  rihe: {name:'Rihe · Дасин',center:[116.32309,39.68314],zoom:14},
  yutong: {name:'Yutong · Тунчжоу',center:[116.6519,39.8922],zoom:14},
  wall: {name:'Мутяньюй',center:[116.5704,40.4319],zoom:13}
};
let map, firstLoad = null, moveStarted = null, currentView = 'Центр Пекина', moveTimer;
const seconds = milliseconds => (milliseconds / 1000).toFixed(1) + ' с';
function log(message) {
  $('log').textContent += `[${seconds(performance.now()-start)}] ${message}\n`;
}
function status(title, description, state) {
  $('status').textContent = title;
  $('detail').textContent = description;
  $('indicator').className = 'indicator ' + (state || '');
}
function error(message) {
  errors.push(String(message));
  $('error-count').textContent = errors.length;
  log('Ошибка: ' + message);
}
function report() {
  return [
    'OpenFreeMap + MapLibre: проверка Пекина',
    'Время проверки (UTC): ' + new Date().toISOString(),
    'Сеть (указано вручную): ' + $('network').selectedOptions[0].textContent,
    'Статус: ' + $('status').textContent,
    'Первый вид: ' + $('first-load').textContent,
    'Последнее перемещение: ' + $('move-load').textContent,
    'Ошибок: ' + errors.length,
    'Браузер: ' + navigator.userAgent,
    'Ресурсы карты: ' + [...observedHosts].join(', '),
    'Проверенные виды: ' + (visits.length ? visits.map(v=>`${v.name}: ${v.seconds}, ошибок в этой загрузке: ${v.errors}`).join('; ') : 'ещё не загружены'),
    'Ошибки: ' + (errors.slice(-8).join(' | ') || 'не зафиксированы'),
    'Страница не проверяет страну выхода в интернет. Повторные загрузки могут использовать кэш.'
  ].join('\n');
}
$('copy').onclick = async () => {
  const value = report();
  $('report').value = value;
  $('report').hidden = false;
  try {
    await navigator.clipboard.writeText(value);
    $('copy-status').textContent = 'Результат скопирован';
  } catch {
    $('report').focus(); $('report').select();
    $('copy-status').textContent = 'Скопируйте выделенный текст';
  }
};
$('retry').onclick = () => location.reload();
for (const button of document.querySelectorAll('[data-view]')) {
  button.disabled = true;
  button.onclick = () => {
    currentView = views[button.dataset.view].name;
    map.jumpTo(views[button.dataset.view]);
  };
}
window.addEventListener('error', event => {
  if(event.message) error(event.message);
});
const loadingTimeout = setTimeout(() => {
  if(firstLoad === null) status('Загрузка занимает больше 30 секунд',
    'Пока не удалось полностью загрузить первый вид карты. Дождитесь результата или скопируйте отчёт. Это не определяет причину задержки.', 'error');
},30000);
const script = document.createElement('script');
script.src = './vendor/maplibre-5.6.1/maplibre-gl.js';
script.onerror = () => {
  clearTimeout(loadingTimeout);
  error('Не удалось загрузить MapLibre с этого сайта');
  status('Библиотека карты не загрузилась','Проблема возникла до обращения к OpenFreeMap.','error');
};
script.onload = () => {
  log('MapLibre загружен с этого сайта');
  status('Загружаю улицы и подписи…','Первый вид: центр Пекина. Все ресурсы основы запрашиваются из браузера.');
  let errorsAtMove = 0;
  try {
    map = new maplibregl.Map({
      container:'map',style:styleURL,center:views.center.center,zoom:13,
      transformRequest:(url,type)=>{
        const host = new URL(url,location.href).host;
        if(!observedHosts.has(host)) {observedHosts.add(host);log(`Источник ${type}: ${host}`);}
        return {url};
      }
    });
  } catch(e) {
    clearTimeout(loadingTimeout);error(e.message);
    status('Не удалось создать карту',e.message,'error');return;
  }
  map.addControl(new maplibregl.NavigationControl(),'top-right');
  map.addControl(new maplibregl.ScaleControl(),'bottom-left');
  for(const [id,view] of Object.entries(views)) {
    const marker = document.createElement('div'); marker.className='sample-marker';
    marker.textContent = {center:'П',rihe:'H3',yutong:'H5',wall:'16'}[id];
    marker.title = view.name;
    new maplibregl.Marker({element:marker}).setLngLat(view.center).addTo(map);
  }
  map.on('error',e=>{
    error(e.error?.message || 'Ошибка загрузки ресурса карты');
    if(firstLoad !== null) status('Есть ошибки загрузки','Карта может отображаться частично. Проверьте улицы и подписи; подробности доступны в отчёте.','error');
  });
  map.on('movestart',()=>{
    moveStarted=performance.now();errorsAtMove=errors.length;
    clearTimeout(moveTimer);
    moveTimer=setTimeout(()=>status('Новый вид ещё загружается','После перемещения прошло больше 20 секунд. Проверьте карту и отчёт.','error'),20000);
    status('Загружаю новый участок…','Можно свободно перемещать карту и менять масштаб.');
  });
  map.on('idle',()=>{
    if(firstLoad !== null && moveStarted === null) return;
    const featureCount=map.queryRenderedFeatures().length;
    if(!featureCount) {status('На карте пока нет объектов','Дождитесь загрузки улиц. Собственные зелёные метки не подтверждают загрузку основы.');return;}
    clearTimeout(loadingTimeout);clearTimeout(moveTimer);
    const elapsed=performance.now()-(moveStarted??start);
    if(firstLoad === null) {firstLoad=performance.now()-start;$('first-load').textContent=seconds(firstLoad);}
    if(moveStarted !== null) $('move-load').textContent=seconds(elapsed);
    const viewErrors=errors.length-errorsAtMove;
    visits.push({name:currentView,seconds:seconds(elapsed),errors:viewErrors});
    log(`Карта отрисована: ${currentView}; ${featureCount} объектов; ${seconds(elapsed)}`);
    status(viewErrors?'Карта загружена с ошибками':'Карта загружена',
      'Улицы и другие объекты отрисованы. Проверьте видимые подписи и попробуйте другой район. Доступность в Китае зависит от сети, на которой открыт этот тест.',viewErrors?'error':'ok');
    for(const button of document.querySelectorAll('[data-view]')) button.disabled=false;
    moveStarted=null;
  });
  map.on('dragstart',()=>{currentView='Перетаскивание вручную';});
};
document.head.append(script);
