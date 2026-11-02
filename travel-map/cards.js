import {el} from './dom.js';
import {categoryIcon} from './category-icons.js';
import {$} from './dom.js';
import {renderHotel} from './hotel-card.js';
import {renderWalk} from './walk-card.js';
import {renderPlacePhoto} from './photo-gallery.js';
import {navigationLinks} from './navigation.js';
import {tripLabel,date} from './format.js';
const ios=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export class Cards {
  constructor(context,{onChoose,onClose}) {
    this.context=context;this.onChoose=onChoose;this.onClose=onClose;this.selected=null;this.photoIndex=0;
    $('close').onclick=event=>this.close(event);
    $('prev').onclick=()=>this.movePhoto(-1);$('next').onclick=()=>this.movePhoto(1);
  }
  choose(point){
    const context=this.context,category=context.categoryMap.get(point.categoryId);
    if (!$('drawer').contains(document.activeElement)) this.previousFocus=document.activeElement;this.selected=point;this.photoIndex=0;
    $('drawer').hidden=false;document.body.classList.add('has-panel');$('places').value=point.id;
    $('category').textContent=category.label;$('point-id').textContent='Точка '+point.id;$('place-title').textContent=point.name;
    $('place-local-name').textContent=point.localName||'';$('place-local-name').hidden=!point.localName;$('description').textContent=point.description;
    for(const id of ['hotel-summary','hotel-details','walk-summary']){$(id).replaceChildren();$(id).hidden=true;}
    if (point.cardType === 'hotel') { $('hotel-summary').hidden=$('hotel-details').hidden=false;renderHotel(point,context,this.onChoose,$('hotel-summary'),$('hotel-details')); }
    if (point.walk) { $('walk-summary').hidden=false;renderWalk(point,context,$('walk-summary')); }
    const metadata=$('place-metadata');metadata.replaceChildren();
    const type=el('span',context.city.taxonomy.subtypes[point.subtype],'place-type');type.prepend(categoryIcon(category.icon));metadata.append(type);
    for(const tag of point.tags)metadata.append(el('span',context.city.taxonomy.tags[tag],'place-tag'));
    const relatives=$('place-relations');relatives.replaceChildren();
    const related=[];
    if(point.parentId)related.push(['Часть комплекса',context.pointMap.get(point.parentId)]);
    for(const child of context.points.filter(p=>p.parentId===point.id))related.push(['В этом районе',child]);
    for(const [label,target]of related){const button=el('button',label+': '+target.name);button.type='button';button.onclick=()=>this.onChoose(target);relatives.append(button);}
    relatives.hidden=!related.length;
    const isIOS=ios(),mobile=isIOS||/Android/.test(navigator.userAgent),nav=navigationLinks(point,context,{mobile,ios:isIOS});
    $('navigation').textContent=`Открыть в ${nav.label} ↗`;$('navigation').href=mobile&&nav.native?nav.native:nav.web;$('navigation').target=mobile?'_self':'_blank';
    $('navigation-web').textContent=`${nav.label} в браузере ↗`;$('navigation-web').href=nav.web;$('navigation-web').hidden=!(mobile&&nav.native);
    $('source').hidden=!point.url;
    if(point.url){const url=new URL(point.url);if(mobile&&point.cardType==='hotel')url.searchParams.set('wkp','1');$('source').href=url.href;$('source').textContent=point.cardType==='hotel'?'Отель на Trip.com ↗':'Подробнее ↗';$('source').target=mobile?'_self':'_blank';}
    else $('source').removeAttribute('href');
    $('note').textContent=point.cardType==='hotel'?`${tripLabel(context)}. Цены проверены ${date(context.trip.pricesCheckedAt,context.city.locale)} и не обновляются автоматически.`:point.locationNote||'';
    this.showPhoto();$('drawer').scrollTop=0;$('close').focus({preventScroll:true});
  }
  showPhoto(){if(!this.selected)return;renderPlacePhoto(this.selected,this.photoIndex,index=>{this.photoIndex=index;this.showPhoto();});}
  movePhoto(delta){const count=this.selected?.photos.length;if(!count)return;this.photoIndex=(this.photoIndex+delta+count)%count;this.showPhoto();}
  close(event){
    event?.preventDefault();if($('drawer').hidden)return;
    $('drawer').hidden=true;document.body.classList.remove('has-panel');this.selected=null;$('places').value='';
    const restore=event?.type==='keydown'||event?.detail===0;
    if(restore){if(this.previousFocus?.isConnected)this.previousFocus.focus({preventScroll:true});else $('places').focus({preventScroll:true});}
    else document.activeElement?.blur?.();
    this.onClose();
  }
}
