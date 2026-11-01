'use strict';
// Subjective editorial scores for a November city walk; not visitor ratings.
const WalkAssessment = (() => {
  const labels = ['Модность', 'Крутость / атмосфера', 'Масштаб прогулки', 'Интересность'];
  const descriptions = [
    'Современные кафе, дизайн, независимые магазины и культурная среда.',
    'Характер места, выразительность архитектуры и желание задержаться.',
    'Сколько можно гулять и менять маршрут: 1 — одна короткая остановка; 3 — около часа; 5 — большой район на несколько часов. Это не площадь в гектарах.',
    'Разнообразие остановок: архитектура, культура, магазины, еда и местная жизнь.'
  ];
  const score = point => Number((point.walk.scores.reduce((a, b) => a + b, 0) / 4).toFixed(1));
  const number = value => value.toFixed(1).replace('.', ',');
  function el(tag, text, cls) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function render(point) {
    const container = document.getElementById('walk-summary');
    container.replaceChildren(); container.hidden = !point.walk;
    if (!point.walk) return;
    const w = point.walk;
    const top = el('div', undefined, 'walk-score-heading');
    top.append(el('strong', `★ ${number(score(point))} / 5`, 'walk-score'), el('span', 'Авторская оценка прогулки'));
    container.append(top, el('p', `${w.kind} · ${w.duration}`, 'walk-format'), el('p', w.verdict, 'walk-verdict'));
    const details = el('details', undefined, 'walk-breakdown');
    details.append(el('summary', 'Оценки и критерии'));
    labels.forEach((label, i) => {
      const item = el('div', undefined, 'walk-component');
      const line = el('div', undefined, 'walk-component-line');
      line.append(el('strong', label), el('span', `${number(w.scores[i])} / 5`));
      const meter = el('meter'); meter.min = 1; meter.max = 5; meter.value = w.scores[i]; meter.setAttribute('aria-label', label);
      item.append(line, meter, el('p', w.reasons[i]), el('p', descriptions[i], 'walk-criterion')); details.append(item);
    });
    details.append(el('p', 'Итог — среднее четырёх авторских баллов с одинаковым весом 25%, округлённое до 0,1. Шкала: 1 — слабо, 3 — умеренно, 5 — очень сильно по этому критерию. Оценивается прогулка в ноябре, без бонуса за летние фестивали. Авторская оценка по опубликованным описаниям; это не рейтинг посетителей и не результат личной инспекции. Разница в 0,1–0,2 несущественна.', 'walk-method'));
    details.append(el('p', 'Небольшая терраса может быть интересной и атмосферной, но получить низкий балл масштаба. Большой парк может быть хорош для отдыха при умеренной «модности». Продолжительность — ориентир с остановками, не измеренный маршрут.', 'walk-method'));
    container.append(details);
    if (w.photoNote) container.append(el('p', w.photoNote, 'walk-method'));
    if (w.photoGalleryUrl) {
      const gallery = el('a', w.photoGalleryLabel, 'walk-external-gallery');
      gallery.href = w.photoGalleryUrl; gallery.target = '_blank'; gallery.rel = 'noopener';
      container.append(gallery);
    }
    if (w.sources?.length) {
      const sources = el('p', 'О месте: ', 'walk-sources');
      for (const [i, href] of w.sources.entries()) {
        const a = el('a', `источник ${i + 1} ↗`); a.href = href; a.target = '_blank'; a.rel = 'noopener';
        if (i) sources.append(document.createTextNode(' · ')); sources.append(a);
      }
      container.append(sources);
    }
    if (point.id === 'K') container.append(el('p', 'Положение метки приблизительное; точный вход уточняйте в AMap.', 'walk-method'));
    container.append(el('p', 'Оценка на 1 ноября 2026 · метка — ориентир, не граница прогулочного района.', 'walk-method'));
  }
  return {score, number, render};
})();
