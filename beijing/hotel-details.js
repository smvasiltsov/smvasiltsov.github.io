'use strict';

// Price and room observations: Trip.com, 1 November 2026.
// Travel ranges are editorial planning estimates, not live routing results.
const HOTEL_DESTINATIONS = [
  'Запретный город · южный вход', 'Храм Неба · восточные ворота',
  'Летний дворец · Бэйгунмэнь', 'Шичахай / Гулоу',
  'Храм Юнхэгун', 'Цяньмэнь', 'Арт-квартал 798'
];
const rub = value => new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0
}).format(value);
const meanTravel = hotel => Math.round(
  hotel.times.reduce((sum, [lo, hi]) => sum + (lo + hi) / 2, 0) / hotel.times.length / 5
) * 5;

function hotelElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function hotelSection(title) {
  const section = hotelElement('section', undefined, 'hotel-section');
  section.append(hotelElement('h3', title));
  return section;
}

function hotelList(items) {
  const list = hotelElement('ul');
  for (const item of items) list.append(hotelElement('li', item));
  return list;
}

function renderHotel(point, points, onChoose) {
  const summary = document.getElementById('hotel-summary');
  const details = document.getElementById('hotel-details');
  summary.replaceChildren();
  details.replaceChildren();
  const h = point.hotel;
  summary.hidden = details.hidden = !h;
  if (!h) return;

  summary.append(hotelElement('p', h.district, 'hotel-location'));
  const stats = hotelElement('div', undefined, 'hotel-stats');
  const price = hotelElement('div', undefined, 'hotel-stat');
  price.append(hotelElement('span', 'Выбранный номер с окном'),
    hotelElement('strong', `${rub(h.total / 7)} / ночь`),
    hotelElement('span', `${rub(h.total)} за 7 ночей`));
  const travel = hotelElement('div', undefined, 'hotel-stat');
  travel.append(hotelElement('span', 'Средняя оценка пути'),
    hotelElement('strong', `≈ ${meanTravel(h)} мин`),
    hotelElement('span', 'по 7 городским точкам · в одну сторону'));
  stats.append(price, travel);
  summary.append(stats, hotelElement('p', h.verdict, 'hotel-verdict'),
    hotelElement('p', '7–14 ноября 2026 · 2 взрослых · проверено 1 ноября', 'hotel-small'));

  const room = hotelSection('Номер с окном и цена');
  room.append(hotelElement('p', h.room, 'hotel-room-name'),
    hotelElement('p', `${h.area} · ${h.bed} · ${h.window}`),
    hotelElement('p', 'Собственная ванная · для некурящих. Для сравнения выбраны категории от 18 м² с подтверждённым окном.'),
    hotelElement('p', `${rub(h.total)} за 7 ночей, налоги и сборы включены. За ночь — средняя стоимость: сумма / 7. Завтрак не включён. Предоплата онлайн; на момент проверки — бесплатная отмена до 7 ноября, 18:00 по местному времени отеля.`),
    hotelElement('p', h.discount, 'hotel-small'),
    hotelElement('p', h.roomWarning, 'hotel-callout'),
    hotelElement('p', 'Это снимок предложения Trip.com, а не текущая гарантированная цена. Скидки и наличие зависят от аккаунта и условий акции; финальную сумму и правила отмены проверьте перед оплатой.', 'hotel-small'));
  details.append(room);

  const routes = hotelSection('До основных достопримечательностей');
  routes.append(hotelElement('p', h.metro), hotelElement('p',
    'Ориентировочно, метро + пешком от отеля до подхода ко входу. Диапазоны — оценка для планирования, без живого расчёта маршрута, очередей и досмотра.', 'hotel-small'));
  const table = hotelElement('table', undefined, 'hotel-routes');
  const caption = hotelElement('caption', 'Оценка времени в одну сторону');
  const head = hotelElement('thead');
  const heading = hotelElement('tr');
  for (const title of ['Место', 'Время']) {
    const th = hotelElement('th', title); th.scope = 'col'; heading.append(th);
  }
  head.append(heading);
  const body = hotelElement('tbody');
  h.times.forEach(([low, high], index) => {
    const row = hotelElement('tr');
    row.append(hotelElement('td', HOTEL_DESTINATIONS[index] +
      (point.id === 'H1' && index === 3 ? ' · пешком' : '')),
      hotelElement('td', `${low}–${high} мин`));
    body.append(row);
  });
  table.append(caption, head, body);
  routes.append(table, hotelElement('p', `Средняя оценка ≈ ${meanTravel(h)} мин — среднее середин семи диапазонов, округлённое до 5 минут. Это сравнительный ориентир, а не измеренное среднее.`, 'hotel-small'),
    hotelElement('p', `Мутяньюй отдельно: ${h.wall[0]}–${h.wall[1]} мин на автомобиле в одну сторону до туристического центра. Пробки могут увеличить время; трансфер к стене и канатная дорога сюда не входят.`, 'hotel-callout'));
  const subwayLink = hotelElement('a', 'Проверить маршрут на официальном сайте метро ↗');
  subwayLink.href = 'https://www.bjsubway.com/';
  subwayLink.target = '_blank'; subwayLink.rel = 'noopener';
  routes.append(subwayLink);
  details.append(routes);

  const comparison = hotelSection('В сравнении с остальными четырьмя');
  const columns = hotelElement('div', undefined, 'hotel-pro-con');
  const pros = hotelElement('div');
  const cons = hotelElement('div');
  pros.append(hotelElement('h4', 'Плюсы'), hotelList(h.pros));
  cons.append(hotelElement('h4', 'Минусы'), hotelList(h.cons));
  columns.append(pros, cons);
  comparison.append(columns, hotelElement('p',
    `Trip.com: ${h.rating} · ${h.reviewCount.toLocaleString('ru-RU')} отзывов на момент проверки. Упоминания проблем — отдельные отзывы, а не гарантия качества каждого номера.`, 'hotel-small'));
  details.append(comparison);

  const shortlist = hotelSection('Все 5 отелей');
  shortlist.append(hotelElement('p', 'Одинаковые даты и состав гостей; категории номеров и скидки различаются.', 'hotel-small'));
  const cards = hotelElement('div', undefined, 'hotel-shortlist');
  for (const other of points.filter(p => p.hotel)) {
    const button = hotelElement('button', undefined, 'hotel-switch');
    button.type = 'button';
    button.setAttribute('aria-label', `Открыть ${other.hotel.shortName}`);
    button.setAttribute('aria-pressed', String(other.id === point.id));
    button.append(hotelElement('strong', `${other.id} · ${other.hotel.shortName}`),
      hotelElement('span', `${rub(other.hotel.total / 7)} / ночь · ${other.hotel.area}`),
      hotelElement('span', `≈ ${meanTravel(other.hotel)} мин · средняя оценка пути`));
    button.addEventListener('click', () => onChoose(other));
    cards.append(button);
  }
  shortlist.append(cards);
  details.append(shortlist);

  const sources = hotelElement('p', undefined, 'hotel-small hotel-sources');
  sources.append(document.createTextNode('Источник номеров, цен и отзывов: '));
  const trip = hotelElement('a', 'Trip.com ↗');
  trip.href = point.url; trip.target = '_blank'; trip.rel = 'noopener';
  sources.append(trip, document.createTextNode('. Сравнительные выводы и время в пути — авторская оценка. Метка показывает расположение объекта; вход уточняйте в AMap. Фотографии относятся к отелю в целом.'));
  details.append(sources);
}
