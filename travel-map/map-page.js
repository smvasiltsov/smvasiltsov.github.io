import {loadCity,hotels} from './data.js';
import {$,el} from './dom.js';
import {number,plural} from './format.js';
import {walkScore} from './assessment.js';
import {Cards} from './cards.js';
import {MapView} from './map-view.js';
import {PointPicker} from './point-picker.js';
async function start(){
  const context=await loadCity();document.title=`${context.city.name} · личная карта путешествия`;$('city-name').textContent=context.city.name;
  const hotelCount=hotels(context).length;$('city-counts').textContent=`${context.points.length} ${plural(context.points.length,['место','места','мест'])}${hotelCount?' · '+hotelCount+' '+plural(hotelCount,['отель','отеля','отелей']):''}`;
  $('comparison-link').href=context.pages.compare;$('comparison-link').hidden=!hotelCount;$('online-map').setAttribute('aria-label',context.city.map.label||'Карта '+context.city.name);
  const label=p=>p.id+' · '+p.name+(p.walk?' · ★ '+number(walkScore(p,context),context.city.locale):'');
  for(const category of context.categories){
    const members=context.points.filter(p=>p.categoryId===category.id);if(!members.length)continue;
    const group=el('optgroup');group.label=category.listLabel;for(const p of members){const option=el('option',label(p));option.value=p.id;group.append(option);}$('places').append(group);
    const legend=el('span'),symbol=el('i',undefined,'symbol '+category.shape);symbol.style.setProperty('--marker-color',category.color);symbol.style.setProperty('--marker-dark-color',category.darkColor);legend.append(symbol,document.createTextNode(category.legend));$('legend').append(legend);
  }
  $('places').disabled=false;$('walk-rating-key').hidden=!context.points.some(p=>p.walk);
  let map,cards,picker;
  function choose(point){picker.hide();cards.choose(point);map.focus(point);const url=new URL(location.href);url.searchParams.set('place',point.id);url.searchParams.delete('hotel');history.replaceState(null,'',url);}
  cards=new Cards(context,{onChoose:choose,onClose:()=>{map.clearSelection();const url=new URL(location.href);url.searchParams.delete('place');url.searchParams.delete('hotel');history.replaceState(null,'',url);}});
  picker=new PointPicker($('map-area'),choose,label);
  map=new MapView(context,{container:$('online-map'),status:$('map-status'),retry:$('map-retry'),onSelect:(p,nearby)=>picker.open(p,nearby),onMove:()=>picker.hide()});
  $('places').onchange=()=>{const point=context.pointMap.get($('places').value);if(point)choose(point);else cards.close();};
  $('center').onclick=()=>{picker.hide();cards.close();map.center();};$('reset').onclick=()=>{picker.hide();cards.close();map.fitAll();};$('plus').onclick=()=>map.zoom(1);$('minus').onclick=()=>map.zoom(-1);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){picker.hide();cards.close(event);}});
  map.start();
  const params=new URLSearchParams(location.search),requested=context.pointMap.get(params.get('place')||params.get('hotel'));if(requested)choose(requested);
}
$('data-retry').onclick=()=>location.reload();
start().catch(error=>{console.error('City data could not be loaded',error);$('map-status').textContent='Не удалось загрузить список мест. Попробуйте ещё раз.';$('data-retry').hidden=false;});
