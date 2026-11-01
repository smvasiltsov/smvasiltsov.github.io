import {el} from './dom.js';
import {hotelScore,meanTravel} from './assessment.js';
import {date,dateRange,money,number} from './format.js';
export function renderHotelAssessment(h,context,{compact=false}={}) {
  const a=hotelScore(h,context), r=context.city.assessment.hotel, n=value=>number(value,context.city.locale);
  const block=el('div',undefined,'expert-assessment'), top=el('div',undefined,'expert-heading');
  top.append(el('strong',`${n(a.score)} / 10`,'expert-score'),el('span','Авторская оценка выбранного номера'));block.append(top);
  if(!compact)block.append(el('p',a.opinion,'expert-opinion'));
  const details=el('details',undefined,'expert-breakdown');details.append(el('summary','Из чего сложилась оценка'));
  const components=[
    ['location','Расположение',`≈ ${meanTravel(h,context)} мин до ${context.city.hotelDestinations.length} городских точек. 10 баллов при пути до ${r.travel.bestMinutes} мин; далее −1 балл за каждые ${r.travel.minutesPerPoint} мин.`],
    ['comfort','Комфорт категории',`Нижняя граница площади — ${h.assessmentFacts.minArea} м².${h.assessmentFacts.panoramic?` Панорамное окно: +${n(r.panoramicBonus)}.`:''}${h.assessmentFacts.appliances?` Стиральная машина, холодильник и микроволновка в студии: +${n(r.appliancesBonus)}.`:''} Качество ремонта и тишина по фото не оцениваются.`],
    ['value','Цена',`Показанный тариф: 10 баллов до ${money(r.price.bestNightly,context)}/ночь; далее −1 балл за каждые ${money(r.price.perPoint,context)}. Завтрак и право на скидку проверяйте в условиях.`],
    ['reviews','Отзывы',`Рейтинг Trip.com по ${h.reviewCount.toLocaleString(context.city.locale)} отзывам; относится ко всему отелю, не только этой категории.${h.reviewCount<r.lowReviewCount?' Мало отзывов: вывод менее устойчив.':''}`]
  ];
  for(const [key,label,reason] of components){
    const item=el('div',undefined,'expert-component'), line=el('div',undefined,'expert-component-line');
    line.append(el('span',`${label} · ${Math.round(r.weights[key]*100)}%`),el('strong',`${n(a.values[key])} / 10`));
    const meter=el('meter');meter.min=0;meter.max=10;meter.value=a.values[key];meter.setAttribute('aria-label',label);
    item.append(line,meter,el('p',reason));details.append(item);
  }
  details.append(el('p',`Комфорт по площади: ${r.areaAnchors.filter(([area])=>area>0).map(([area,score])=>`${area} м² → ${n(score)}`).join('; ')}. Между значениями — линейная шкала. Итог — взвешенная сумма, округлённая до 0,1. Баллы ограничены диапазоном 0–10.`));block.append(details);
  if(!compact)block.append(el('p',`${context.trip.assessmentContext} ${dateRange(context.trip,context.city.locale)}. Авторский ориентир по опубликованным данным на ${date(context.trip.pricesCheckedAt,context.city.locale)}, без личной инспекции. Время — оценка для планирования; скидки условны. Разница в 0,1–0,2 балла несущественна.`,'expert-note'));
  return block;
}
