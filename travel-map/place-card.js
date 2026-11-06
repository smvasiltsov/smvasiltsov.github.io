import {el,link,list} from './dom.js';
import {date} from './format.js';
import {pointBadge} from './point-labels.js';

export const visitFields = [
  ['duration','Время на месте'], ['bestTime','Когда лучше идти'],
  ['hours','Часы работы'], ['cost','Стоимость'],
  ['booking','Бронирование'], ['access','Доступ'],
];
export function visitFactText(fact) {
  if (fact.status === 'unknown') return fact.note || 'Не проверено';
  if (fact.status === 'not_applicable') return fact.note || 'Не применимо';
  return fact.value;
}
function section(title,id) {
  const node=el('section',undefined,'place-section');node.id=id;
  const heading=el('h3',title);heading.id=id+'-heading';
  node.setAttribute('aria-labelledby',heading.id);node.append(heading);return node;
}
export function renderPlaceCard(point,context,nodes,onChoose) {
  const v=point.visit;
  const intro=section('Зачем сюда идти','place-intro');intro.append(el('p',v.summary,'place-summary'));
  const facts=section('Кратко о посещении','place-facts'),grid=el('dl',undefined,'visit-facts');
  if(v.scope)facts.append(el('p',v.scope,'visit-scope'));
  for(const [key,label] of visitFields){
    const fact=v[key],item=el('div',undefined,'visit-fact');item.dataset.status=fact.status;
    const term=el('dt',label),value=el('dd',visitFactText(fact));
    if(fact.status==='estimate')value.append(el('span','Авторский ориентир','visit-fact-note'));
    if(fact.status==='documented')value.append(el('span','По источнику'+(fact.checkedAt?' · '+date(fact.checkedAt,context.city.locale):''),'visit-fact-note'));
    if(fact.status==='unknown'&&fact.note)value.append(el('span','Требует уточнения у площадки','visit-fact-note'));
    if(fact.sources.length){
      const sources=el('span',undefined,'visit-fact-note');
      fact.sources.forEach((url,i)=>{if(i)sources.append(' · ');sources.append(link('Источник '+(i+1),url,undefined,true));});value.append(sources);
    }
    item.append(term,value);grid.append(item);
  }
  facts.append(grid);
  const galleryLink=point.photoGalleryUrl||point.walk?.photoGalleryUrl;
  if(!point.photos.length){
    const gap=el('p','Фотографии места пока не добавлены.','place-photo-gap');
    if(galleryLink)gap.append(' ',link(point.photoGalleryLabel||point.walk?.photoGalleryLabel||'Посмотреть фотографии у источника ↗',galleryLink,undefined,true),' · нужен интернет');
    facts.append(gap);
  }
  const activities=section('Что здесь делать и смотреть','place-activities');
  activities.append(nodes.description,list(v.activities,'place-activities-list'));
  const advice=section('Что учесть перед посещением','visit-info');
  if(v.considerations.length)advice.append(list(v.considerations));
  if(point.photos.length&&galleryLink)advice.append(link(point.photoGalleryLabel||'Фотографии на сайте источника ↗',galleryLink,undefined,true));
  advice.hidden=!v.considerations.length&&!(point.photos.length&&galleryLink);
  const logistics=section('Как добраться и с чем совместить','place-logistics');
  for(const [key,label] of [['address','Адрес'],['metro','Метро'],['start','Начало прогулки']])if(v.arrival[key])logistics.append(el('p',`${label}: ${v.arrival[key]}`));
  if(v.arrival.note)logistics.append(el('p',v.arrival.note));
  logistics.append(nodes.actions,nodes.relations);
  const combinations=v.combineWith.filter(id=>id!==point.parentId&&context.pointMap.get(id).parentId!==point.id);
  if(combinations.length){
    const combined=el('div',undefined,'place-combinations');combined.append(el('h4','С чем совместить'));
    for(const id of combinations){const target=context.pointMap.get(id),button=el('button',`${pointBadge(target,context)} · ${target.name}`);button.type='button';button.onclick=()=>onChoose(target);combined.append(button);}
    logistics.append(combined);
  }
  const provenance=section('Источники и актуальность','place-sources');
  provenance.append(el('p',v.provenance.checkedAt?`${v.provenance.basis==='source-review'?'Источники условий посещения просмотрены':'Сведения сохранены в проекте'} ${date(v.provenance.checkedAt,context.city.locale)}. Временные изменения указаны в карточке; перед поездкой проверьте объявления площадки.`:'Дата проверки практических сведений пока не указана.'));
  if(v.provenance.sources.length){const sources=list([]);for(const url of v.provenance.sources){const item=el('li');item.append(link(new URL(url).hostname.replace(/^www\./,''),url,undefined,true));sources.append(item);}provenance.append(sources);}
  else provenance.append(el('p','Источники сведений о посещении пока не указаны. Источники фотографий приведены в галерее.'));
  provenance.append(el('p','Рекомендации и длительность — авторские ориентиры для планирования.','footnote'));
  return [intro,facts,nodes.gallery,activities,nodes.walk,advice,logistics,provenance];
}
