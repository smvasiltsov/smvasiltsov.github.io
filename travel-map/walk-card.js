import {el,link} from './dom.js';
import {walkScore} from './assessment.js';
import {number,date} from './format.js';
export function renderWalk(point,context,container) {
  const w=point.walk,r=context.city.assessment.walk,n=value=>number(value,context.city.locale);
  const top=el('div',undefined,'walk-score-heading');top.append(el('strong',`★ ${n(walkScore(point,context))} / 5`,'walk-score'),el('span','Авторская оценка прогулки'));
  container.append(top,el('p',`${w.kind} · ${w.duration}`,'walk-format'),el('p',w.verdict,'walk-verdict'));
  const details=el('details',undefined,'walk-breakdown');details.append(el('summary','Оценки и критерии'));
  for(const c of r.criteria){
    const item=el('div',undefined,'walk-component'),line=el('div',undefined,'walk-component-line');line.append(el('strong',`${c.label} · ${Math.round(c.weight*100)}%`),el('span',`${n(w.scores[c.id])} / 5`));
    const meter=el('meter');meter.min=1;meter.max=5;meter.value=w.scores[c.id];meter.setAttribute('aria-label',c.label);
    item.append(line,meter,el('p',w.reasons[c.id]),el('p',c.description,'walk-criterion'));details.append(item);
  }
  details.append(el('p',`Итог — взвешенное среднее авторских баллов, округлённое до 0,1. Шкала: 1 — слабо, 3 — умеренно, 5 — очень сильно по этому критерию. ${context.trip.seasonContext} Авторская оценка по опубликованным описаниям; это не рейтинг посетителей и не результат личной инспекции. Разница в 0,1–0,2 несущественна.`,'walk-method'),el('p',r.note,'walk-method'));container.append(details);
  if(w.photoNote)container.append(el('p',w.photoNote,'walk-method'));
  if(w.photoGalleryUrl)container.append(link(w.photoGalleryLabel,w.photoGalleryUrl,'walk-external-gallery',true));
  if(w.sources?.length){const sources=el('p','О месте: ','walk-sources');w.sources.forEach((url,i)=>{if(i)sources.append(document.createTextNode(' · '));sources.append(link(`источник ${i+1} ↗`,url,undefined,true));});container.append(sources);}
  container.append(el('p',`Оценка на ${date(w.checked,context.city.locale)} · метка — ориентир, не граница прогулочного района.`,'walk-method'));
}
