'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const rub = value => new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0}).format(value);
  const collator = new Intl.Collator('ru', {numeric: true});
  const defaults = {score: 'desc', price: 'asc', travel: 'asc', area: 'desc', reviews: 'desc', name: 'asc'};
  const labels = {score: 'экспертная оценка', price: 'цена за сутки', travel: 'среднее время пути', area: 'минимальная площадь', reviews: 'рейтинг Trip.com', name: 'название'};
  const params = new URLSearchParams(location.search);
  let field = Object.hasOwn(defaults, params.get('sort')) ? params.get('sort') : 'score';
  let direction = ['asc', 'desc'].includes(params.get('direction')) ? params.get('direction') : defaults[field];
  function el(tag, text, className) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (className) e.className = className;
    return e;
  }
  function link(text, href, className) {
    const a = el('a', text, className); a.href = href; return a;
  }
  function list(items) {
    const ul = el('ul', undefined, 'comparison-list');
    for (const text of items) ul.append(el('li', text));
    return ul;
  }
  function row(p) {
    const h = p.hotel, assessment = HotelAssessment.assess(h), tr = el('tr');
    tr.dataset.hotel = p.id;
    const hotel = el('td');
    const imageLink = link(undefined, `./?hotel=${p.id}`);
    imageLink.setAttribute('aria-label', `Карточка ${h.shortName}`);
    const image = el('img', undefined, 'hotel-image');
    image.src = p.photos[0].src;
    image.alt = `${h.shortName} · ${h.room}`;
    image.width = p.photos[0].width; image.height = p.photos[0].height;
    image.loading = 'lazy'; image.decoding = 'async'; imageLink.append(image);
    hotel.append(imageLink, el('span', p.id, 'hotel-id'), link(h.shortName, `./?hotel=${p.id}`, 'hotel-name'),
      el('p', h.room, 'hotel-room'), el('p', `${h.area} · ${h.bed}`, 'hotel-meta'),
      el('p', `${h.window} · минимум ${h.assessmentFacts.minArea} м²`, 'hotel-meta'));
    const credit = link('Фото категории · Trip.com ↗', p.url, 'source-link');
    credit.target = '_blank'; credit.rel = 'noopener'; hotel.append(credit);
    const price = el('td');
    price.append(el('div', rub(h.total / 7), 'numeric'), el('p', `${rub(h.total)} / 7 ночей`, 'hotel-meta'),
      el('p', p.id === 'H10' ? '2 завтрака включены' : 'Без завтрака', 'hotel-meta'),
      el('p', h.discount, 'hotel-meta'));
    const travel = el('td');
    travel.append(el('div', `≈ ${HotelAssessment.travel(h)} мин`, 'numeric'),
      el('p', 'Метро + пешком · в одну сторону', 'hotel-meta'), el('p', 'Среднее по 7 городским точкам', 'hotel-meta'));
    const score = el('td'); score.append(HotelAssessment.render(h, {compact: true}),
      el('p', `Trip.com: ${h.rating}`, 'hotel-meta'), el('p', `${h.reviewCount.toLocaleString('ru-RU')} отзывов`, 'hotel-meta'));
    if (h.reviewCount < 200) score.append(el('p', 'Мало отзывов: больше неопределённости', 'hotel-meta'));
    const comment = el('td'); comment.append(el('p', h.verdict, 'verdict'));
    const opinion = el('details', undefined, 'room-opinion');
    opinion.append(el('summary', 'Мой вывод о номере'), el('p', assessment.opinion)); comment.append(opinion);
    const pros = el('td'), cons = el('td'); pros.append(list(h.pros)); cons.append(list(h.cons));
    tr.append(hotel, price, travel, score, comment, pros, cons);
    return tr;
  }
  const rows = new Map(HOTEL_POINTS.map(p => [p.id, row(p)]));
  function value(p) {
    const h = p.hotel;
    return {score: () => HotelAssessment.assess(h).score, price: () => h.total / 7,
      travel: () => HotelAssessment.travel(h), area: () => h.assessmentFacts.minArea,
      reviews: () => Number(h.rating.split('/')[0].trim().replace(',', '.')), name: () => h.shortName}[field]();
  }
  function render() {
    const sorted = [...HOTEL_POINTS].sort((a, b) => {
      const va = value(a), vb = value(b);
      const comparison = field === 'name' ? collator.compare(va, vb) : va - vb;
      return comparison * (direction === 'asc' ? 1 : -1) || collator.compare(a.id, b.id);
    });
    $('hotel-rows').replaceChildren(...sorted.map(p => rows.get(p.id)));
    $('sort-field').value = field;
    $('sort-direction').textContent = direction === 'asc' ? 'По возрастанию ↑' : 'По убыванию ↓';
    $('sort-status').textContent = `${sorted.length} отелей · ${labels[field]}, ${direction === 'asc' ? 'по возрастанию' : 'по убыванию'}`;
    document.querySelectorAll('th[data-field]').forEach(th => {
      const active = th.dataset.field === field;
      th.setAttribute('aria-sort', active ? direction === 'asc' ? 'ascending' : 'descending' : 'none');
      th.querySelector('span').textContent = active ? direction === 'asc' ? ' ↑' : ' ↓' : '';
    });
    const url = new URL(location.href); url.searchParams.set('sort', field); url.searchParams.set('direction', direction);
    history.replaceState(null, '', url);
  }
  function chooseField(next) {
    if (field === next) direction = direction === 'asc' ? 'desc' : 'asc';
    else { field = next; direction = defaults[field]; }
    render();
  }
  $('sort-field').addEventListener('change', () => {field = $('sort-field').value; direction = defaults[field]; render();});
  $('sort-direction').addEventListener('click', () => {direction = direction === 'asc' ? 'desc' : 'asc'; render();});
  document.querySelectorAll('button[data-sort]').forEach(button => button.addEventListener('click', () => chooseField(button.dataset.sort)));
  render();
})();
