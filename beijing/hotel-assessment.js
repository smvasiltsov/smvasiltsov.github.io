'use strict';

// Editorial rubric for this trip, not a prediction of an assigned room's quality.
globalThis.HotelAssessment = (() => {
  const clamp = value => Math.max(0, Math.min(10, value));
  const weights = [0.35, 0.25, 0.25, 0.15];
  const number = value => value.toFixed(1).replace('.', ',');
  function travel(h) {
    return Math.round(h.times.reduce((sum, [lo, hi]) => sum + (lo + hi) / 2, 0) / h.times.length / 5) * 5;
  }
  function areaScore(area) {
    const anchors = [[0, 0], [12, 3.5], [15, 5], [18, 6.5], [20, 7.5], [25, 8.5], [35, 10]];
    for (let i = 1; i < anchors.length; i++) {
      const [high, score] = anchors[i], [low, previous] = anchors[i - 1];
      if (area <= high) return previous + (score - previous) * (area - low) / (high - low);
    }
    return 10;
  }
  function assess(h) {
    const f = h.assessmentFacts;
    const minutes = travel(h);
    const components = [
      {key: 'location', label: 'Расположение', weight: 35,
        value: clamp(10 - (minutes - 35) / 10),
        reason: `≈ ${minutes} мин до семи городских точек. 10 баллов при пути до 35 мин; далее −1 балл за каждые 10 мин.`},
      {key: 'comfort', label: 'Комфорт категории', weight: 25,
        value: clamp(areaScore(f.minArea) + (f.panoramic ? 0.3 : 0) + (f.appliances ? 0.5 : 0)),
        reason: `Нижняя граница площади — ${f.minArea} м².${f.panoramic ? ' Панорамное окно: +0,3.' : ''}${f.appliances ? ' Стиральная машина, холодильник и микроволновка в студии: +0,5.' : ''} Качество ремонта и тишина по фото не оцениваются.`},
      {key: 'value', label: 'Цена', weight: 25,
        value: clamp(10 - (h.total / 7 - 2500) / 400),
        reason: 'Показанный тариф: 10 баллов до 2 500 ₽/ночь; далее −1 балл за каждые 400 ₽. Завтрак и право на скидку проверяйте в условиях.'},
      {key: 'reviews', label: 'Отзывы', weight: 15,
        value: Number(h.rating.split('/')[0].trim().replace(',', '.')),
        reason: `Рейтинг Trip.com по ${h.reviewCount.toLocaleString('ru-RU')} отзывам; относится ко всему отелю, не только этой категории.${h.reviewCount < 200 ? ' Меньше 200 отзывов: вывод менее устойчив.' : ''}`}
    ];
    const total = components.reduce((sum, c, i) => sum + c.value * weights[i], 0);
    return {score: Number(total.toFixed(1)), components, opinion: f.opinion};
  }
  function element(tag, text, className) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (className) e.className = className;
    return e;
  }
  function render(h, {compact = false} = {}) {
    const a = assess(h), block = element('div', undefined, 'expert-assessment');
    const top = element('div', undefined, 'expert-heading');
    top.append(element('strong', `${number(a.score)} / 10`, 'expert-score'),
      element('span', 'Авторская оценка выбранного номера'));
    block.append(top);
    if (!compact) block.append(element('p', a.opinion, 'expert-opinion'));
    const details = element('details', undefined, 'expert-breakdown');
    details.append(element('summary', 'Из чего сложилась оценка'));
    for (const c of a.components) {
      const item = element('div', undefined, 'expert-component');
      const line = element('div', undefined, 'expert-component-line');
      line.append(element('span', `${c.label} · ${c.weight}%`), element('strong', `${number(c.value)} / 10`));
      item.append(line);
      const meter = element('meter'); meter.min = 0; meter.max = 10; meter.value = c.value;
      meter.setAttribute('aria-label', c.label); item.append(meter, element('p', c.reason));
      details.append(item);
    }
    details.append(element('p', 'Комфорт по площади: 12 м² → 3,5; 15 → 5; 18 → 6,5; 20 → 7,5; 25 → 8,5; 35 → 10. Между значениями — линейная шкала. Итог — взвешенная сумма, округлённая до 0,1. Баллы ограничены диапазоном 0–10.'));
    block.append(details);
    if (!compact) block.append(element('p', 'Для обзорной поездки 7–14 ноября 2026. Авторский ориентир по опубликованным данным на 1 ноября, без личной инспекции. Время — оценка для планирования; скидки условны. Разница в 0,1–0,2 балла несущественна.', 'expert-note'));
    return block;
  }
  return {assess, travel, render, number};
})();
