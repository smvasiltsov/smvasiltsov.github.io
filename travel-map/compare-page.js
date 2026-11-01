import {loadCity,hotels} from './data.js';
import {$,el,link,list} from './dom.js';
import {hotelScore,meanTravel} from './assessment.js';
import {renderHotelAssessment} from './assessment-view.js';
import {money,number,nights,stayLabel,tripLabel,date,pointUrl,plural} from './format.js';
function method(context){
 const r=context.city.assessment.hotel,n=value=>number(value,context.city.locale),container=$('comparison-method');
 container.append(el('p',`${context.trip.assessmentContext}: расположение ${r.weights.location*100}%, комфорт категории ${r.weights.comfort*100}%, цена ${r.weights.value*100}%, отзывы ${r.weights.reviews*100}%. Это авторская оценка опубликованных данных, без личной инспекции отеля.`));
 container.append(el('p',`Для расположения используем среднее середин диапазонов пути, округлённое до ${r.travel.roundTo} минут: 10 баллов при пути до ${r.travel.bestMinutes} минут, далее −1 за каждые ${r.travel.minutesPerPoint} минут. Комфорт считаем по нижней границе площади: ${r.areaAnchors.filter(([area])=>area>0).map(([area,score])=>`${area} м² → ${n(score)}`).join('; ')}. Между значениями — линейная шкала. Панорамное окно даёт +${n(r.panoramicBonus)}; стиральная машина, холодильник и микроволновка в студии — +${n(r.appliancesBonus)}. Ремонт и тишину по фотографиям не оцениваем.`));
 container.append(el('p',`Цена: 10 баллов до ${money(r.price.bestNightly,context)}/ночь, далее −1 за каждые ${money(r.price.perPoint,context)}. Отзывы: рейтинг Trip.com для всего отеля. Каждый компонент ограничен диапазоном 0–10; итог — взвешенная сумма, округлённая до 0,1. Малое число отзывов отмечено отдельно; разница в 0,1–0,2 балла несущественна.`));
 container.append(el('p',`Цены проверены ${date(context.trip.pricesCheckedAt,context.city.locale)}. Цена за сутки — средняя за ${stayLabel(context)} (общая сумма / ${nights(context.trip)}). Налоги и сборы включены; завтраки и скидки различаются и указаны в каждой строке. Цена и наличие не обновляются автоматически. Время «метро + пешком» — авторская оценка, не живой маршрут; очередь и досмотр не учтены. Направления для сравнения: ${context.city.hotelDestinations.map(d=>d.label).join('; ')}. Загородные поездки показаны отдельно в карточках.`));
}
async function start(){
 const context=await loadCity(),hotelPoints=hotels(context),count=nights(context.trip),rub=value=>money(value,context),collator=new Intl.Collator(context.city.locale,{numeric:true});
 document.title=`Сравнение отелей · ${context.city.name}`;$('comparison-title').textContent=`${hotelPoints.length} ${plural(hotelPoints.length,['отель','отеля','отелей'])}, одна таблица`;$('comparison-dates').textContent=tripLabel(context);
 for(const a of document.querySelectorAll('[data-map-link]')){a.href=context.pages.map;a.textContent='← К карте · '+context.city.name;}
 $('comparison-caption').textContent=`Сравнение отелей и выбранных категорий номеров · ${context.city.name}`;method(context);
 const defaults={score:'desc',price:'asc',travel:'asc',area:'desc',reviews:'desc',name:'asc'},labels={score:'экспертная оценка',price:'цена за сутки',travel:'среднее время пути',area:'минимальная площадь',reviews:'рейтинг Trip.com',name:'название'};
 const params=new URLSearchParams(location.search);let field=Object.hasOwn(defaults,params.get('sort'))?params.get('sort'):'score',direction=['asc','desc'].includes(params.get('direction'))?params.get('direction'):defaults[field];
 function row(p){
  const h=p.hotel,assessment=hotelScore(h,context),tr=el('tr');tr.dataset.hotel=p.id;const hotel=el('td');
  if(p.photos.length){const imageLink=link(undefined,pointUrl(p,context));imageLink.setAttribute('aria-label',`Карточка ${h.shortName}`);const image=el('img',undefined,'hotel-image');Object.assign(image,{src:p.photos[0].src,alt:`${h.shortName} · ${h.room}`,width:p.photos[0].width,height:p.photos[0].height,loading:'lazy',decoding:'async'});imageLink.append(image);hotel.append(imageLink);}
  else hotel.append(el('p','Фотографии пока не добавлены','hotel-meta'));
  hotel.append(el('span',p.id,'hotel-id'),link(h.shortName,pointUrl(p,context),'hotel-name'),el('p',h.room,'hotel-room'),el('p',`${h.area} · ${h.bed}`,'hotel-meta'),el('p',`${h.window} · минимум ${h.assessmentFacts.minArea} м²`,'hotel-meta'));
  if(p.photos.length)hotel.append(link('Фото категории · Trip.com ↗',p.url,'source-link',true));
  const price=el('td');price.append(el('div',rub(h.total/count),'numeric'),el('p',`${rub(h.total)} / ${stayLabel(context)}`,'hotel-meta'),el('p',h.breakfastCount?`Завтраки включены: ${h.breakfastCount}`:'Без завтрака','hotel-meta'),el('p',h.discount,'hotel-meta'));
  const travel=el('td');travel.append(el('div',`≈ ${meanTravel(h,context)} мин`,'numeric'),el('p','Метро + пешком · в одну сторону','hotel-meta'),el('p',`Среднее по ${h.routes.length} городским точкам`,'hotel-meta'));
  const score=el('td');score.append(renderHotelAssessment(h,context,{compact:true}),el('p',`Trip.com: ${number(h.reviewRating,context.city.locale)} / 10`,'hotel-meta'),el('p',`${h.reviewCount.toLocaleString(context.city.locale)} отзывов`,'hotel-meta'));if(h.reviewCount<context.city.assessment.hotel.lowReviewCount)score.append(el('p','Мало отзывов: больше неопределённости','hotel-meta'));
  const comment=el('td');comment.append(el('p',h.verdict,'verdict'));const opinion=el('details',undefined,'room-opinion');opinion.append(el('summary','Мой вывод о номере'),el('p',assessment.opinion));comment.append(opinion);
  const pros=el('td'),cons=el('td');pros.append(list(h.pros,'comparison-list'));cons.append(list(h.cons,'comparison-list'));tr.append(hotel,price,travel,score,comment,pros,cons);return tr;
 }
 const rows=new Map(hotelPoints.map(p=>[p.id,row(p)]));
 function value(p){const h=p.hotel;return {score:()=>hotelScore(h,context).score,price:()=>h.total/count,travel:()=>meanTravel(h,context),area:()=>h.assessmentFacts.minArea,reviews:()=>h.reviewRating,name:()=>h.shortName}[field]();}
 function render(){
  const sorted=[...hotelPoints].sort((a,b)=>{const va=value(a),vb=value(b),comparison=field==='name'?collator.compare(va,vb):va-vb;return comparison*(direction==='asc'?1:-1)||collator.compare(a.id,b.id);});
  $('hotel-rows').replaceChildren(...sorted.map(p=>rows.get(p.id)));$('sort-field').value=field;$('sort-direction').textContent=direction==='asc'?'По возрастанию ↑':'По убыванию ↓';$('sort-status').textContent=`${sorted.length} ${plural(sorted.length,['отель','отеля','отелей'])} · ${labels[field]}, ${direction==='asc'?'по возрастанию':'по убыванию'}`;
  document.querySelectorAll('th[data-field]').forEach(th=>{const active=th.dataset.field===field;th.setAttribute('aria-sort',active?direction==='asc'?'ascending':'descending':'none');th.querySelector('span').textContent=active?direction==='asc'?' ↑':' ↓':'';});
  const url=new URL(location.href);url.searchParams.set('sort',field);url.searchParams.set('direction',direction);history.replaceState(null,'',url);
 }
 $('sort-field').addEventListener('change',()=>{field=$('sort-field').value;direction=defaults[field];render();});$('sort-direction').addEventListener('click',()=>{direction=direction==='asc'?'desc':'asc';render();});
 document.querySelectorAll('button[data-sort]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.sort;if(field===next)direction=direction==='asc'?'desc':'asc';else{field=next;direction=defaults[field];}render();}));render();
 $('comparison-loading').hidden=true;$('comparison-content').hidden=false;
}
$('comparison-retry').onclick=()=>location.reload();start().catch(error=>{console.error('Comparison could not be loaded',error);$('comparison-loading').textContent='Не удалось загрузить отели. Попробуйте ещё раз.';$('comparison-retry').hidden=false;});
