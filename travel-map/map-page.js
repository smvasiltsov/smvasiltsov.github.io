import {pointBadge} from './point-labels.js';
import {Filters} from './filters-ui.js';
import {setupInstall} from './install-ui.js';
import {loadCity,hotels} from './data.js';
import {$,el} from './dom.js';
import {number,plural} from './format.js';
import {walkScore} from './assessment.js';
import {Cards} from './cards.js';
import {MapView} from './map-view.js';
import {setupOffline} from './offline-ui.js';
import {PointPicker} from './point-picker.js';
import {setupCitySwitcher} from './city-switcher.js';
async function start(){
  const context=await loadCity();document.title=`${context.city.name} · личная карта путешествия`;$('city-name').textContent=context.city.name;
  const hotelCount=hotels(context).length;$('city-counts').textContent=`${context.points.length} ${plural(context.points.length,['место','места','мест'])}${hotelCount?' · '+hotelCount+' '+plural(hotelCount,['отель','отеля','отелей']):''}`;
  $('comparison-link').href=context.pages.compare;$('comparison-link').hidden=!hotelCount;$('online-map').setAttribute('aria-label',context.city.map.label||'Карта '+context.city.name);
  const label=p=>pointBadge(p,context)+' · '+p.name+(p.walk?' · ★ '+number(walkScore(p,context),context.city.locale):'');
  for(const group of context.city.taxonomy.groups){
    if(!context.points.some(p=>context.categoryMap.get(p.categoryId).groupId===group.id))continue;
    const legend=el('span'),symbol=el('i',undefined,'symbol '+group.shape);symbol.style.setProperty('--marker-color',group.color);symbol.style.setProperty('--marker-dark-color',group.darkColor);legend.append(symbol,document.createTextNode(group.label));$('legend').append(legend);
  }
  $('walk-rating-key').hidden=!context.points.some(p=>p.walk);
  let map,cards,picker,filters;
  function choose(point){if(filters&&!filters.includes(point))filters.reset();picker.hide();cards.choose(point);map.focus(point);const url=new URL(location.href);url.searchParams.set('place',point.id);url.searchParams.delete('hotel');history.replaceState(null,'',url);}
  cards=new Cards(context,{onChoose:choose,onClose:()=>{map.clearSelection();const url=new URL(location.href);url.searchParams.delete('place');url.searchParams.delete('hotel');history.replaceState(null,'',url);}});
  picker=new PointPicker($('map-area'),choose,label);
  map=new MapView(context,{container:$('online-map'),status:$('map-status'),retry:$('map-retry'),onSelect:(p,nearby)=>picker.open(p,nearby),onMove:()=>picker.hide()});
  filters=new Filters(context,{label,onChange:points=>{picker.hide();if(cards.selected&&!points.some(p=>p.id===cards.selected.id))cards.close();map.setPoints(points);}});
  $('places').onchange=()=>{const point=context.pointMap.get($('places').value);if(point)choose(point);else cards.close();};
  $('center').onclick=()=>{picker.hide();cards.close();map.center();};$('reset').onclick=()=>{filters.reset();picker.hide();cards.close();map.fitAll();};$('plus').onclick=()=>map.zoom(1);$('minus').onclick=()=>map.zoom(-1);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){picker.hide();cards.close(event);}});
  map.start();
  document.addEventListener('travel-offline-changed',()=>map.start());
  setupOffline(context).catch(error=>console.warn('Offline setup failed',error));
  const params=new URLSearchParams(location.search),requested=context.pointMap.get(params.get('place')||params.get('hotel'));if(requested)choose(requested);
}
const headerMenu=$('header-menu'),header=headerMenu.closest('header');
setupCitySwitcher();
headerMenu.onclick=()=>{const open=header.dataset.menuOpen!=='true';header.dataset.menuOpen=String(open);headerMenu.setAttribute('aria-expanded',String(open));headerMenu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');};
setupInstall();
$('data-retry').onclick=()=>location.reload();
start().catch(error=>{console.error('City data could not be loaded',error);$('map-status').textContent='Не удалось загрузить список мест. Попробуйте ещё раз.';$('data-retry').hidden=false;});
