import {cities} from './cities.js';
import {el,link} from './dom.js';

export function setupCitySwitcher(){
  const heading=document.getElementById('city-name');
  if(!heading||document.getElementById('city-switcher'))return;
  const details=el('details',undefined,'city-switcher');details.id='city-switcher';
  const summary=el('summary'),chevron=el('span','⌄','city-chevron');
  chevron.setAttribute('aria-hidden','true');
  summary.setAttribute('aria-label','Выбрать карту города');
  summary.setAttribute('aria-controls','city-list');
  heading.before(details);summary.append(heading,chevron);
  const nav=el('nav',undefined,'city-list');nav.id='city-list';nav.setAttribute('aria-label','Доступные карты');
  nav.append(el('p','Карты городов','city-list-label'));
  for(const city of cities){
    const item=link(city.name,city.url);
    if(new URL('.',location.href).href===city.url)item.setAttribute('aria-current','page');
    nav.append(item);
  }
  nav.append(el('p','Для доступа без интернета сохраните каждый город отдельно.','city-list-note'));
  details.append(summary,nav);
  function position(){if(!details.open)return;const r=summary.getBoundingClientRect();nav.style.left=Math.max(12,Math.min(r.left,innerWidth-232))+'px';nav.style.top=(r.bottom+8)+'px';}
  details.addEventListener('toggle',position);
  document.addEventListener('pointerdown',event=>{if(details.open&&!details.contains(event.target))details.open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){event.preventDefault();event.stopImmediatePropagation();details.open=false;summary.focus();}},true);
  window.addEventListener('resize',position);
  details.closest('header').addEventListener('scroll',position);
}
