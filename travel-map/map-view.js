import {hybridStyle,mapResourceLoader} from './hybrid-map.js';
import {addLocationControl} from './location-control.js';
import {emojiMarker} from './emoji-marker.js';
import {pointBadge} from './point-labels.js';
import {savedMap} from './offline-map.js';
import {walkScore} from './assessment.js';
import {number} from './format.js';
let libraryPromise;
function loadLibrary(){
  if(globalThis.maplibregl)return Promise.resolve(globalThis.maplibregl);
  if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/maplibre-5.6.1/maplibre-gl.js',import.meta.url).href;script.onload=()=>resolve(globalThis.maplibregl);script.onerror=()=>{libraryPromise=null;script.remove();reject(new Error('Map library unavailable'));};document.head.append(script);});
  return libraryPromise;
}
export class MapView {
  constructor(context,{container,status,retry,onSelect,onMove}){
    Object.assign(this,{context,container,status,retry,onSelect,onMove});this.filteredPoints=context.points;this.nodes=new Map();this.selected=null;this.map=null;this.overlay=null;this.timer=null;this.generation=0;
    this.markerMedia=matchMedia('(max-width:650px), (pointer:coarse)');this.markerMedia.addEventListener('change',()=>{for(const node of this.nodes.values())node.remove();this.nodes.clear();this.render();});
    this.resizeObserver=new ResizeObserver(()=>{if(this.map){this.map.resize({resize:true});this.render();}});this.resizeObserver.observe(container);retry.onclick=()=>this.map?this.reloadStyle():this.start();
    window.addEventListener('online',()=>{if(this.map&&this.tileError)this.reloadStyle();});
  }
  async start(){
    const previousView=this.map?{center:this.map.getCenter().toArray(),zoom:this.map.getZoom()}:null;
    this.ready=false;this.tileError=false;const generation=++this.generation;clearTimeout(this.timer);this.map?.remove();this.map=null;this.overlay=null;this.nodes.clear();this.container.replaceChildren();this.setStatus('Загружаю карту…');const locationStatus=document.getElementById('location-status');if(locationStatus){locationStatus.hidden=true;locationStatus.textContent='';}
    this.timer=setTimeout(()=>{if(generation===this.generation)this.setStatus('Карта пока не загрузилась. Проверьте подключение.',true);},20000);
    try{
      const [library,offline]=await Promise.all([loadLibrary(),savedMap(this.context)]);if(generation!==this.generation)return;this.offline=offline;
      const config=this.context.city.map;this.onlineMapAvailable=false;
      if(offline?.tiles&&offline?.glyphs){library.addProtocol('travelmap',mapResourceLoader({...offline,onNetwork:available=>{if(generation!==this.generation)return;this.onlineMapAvailable=available;if(this.ready&&!this.tileError)this.setStatus(this.normalStatus());}}));offline.style=hybridStyle(offline,this.context.city.id);}
      this.map=new library.Map({container:this.container,style:offline?.style||config.style,center:previousView?.center||config.defaultView.center,zoom:previousView?.zoom??config.defaultView.zoom,locale:{'GeolocateControl.FindMyLocation':'Моё местоположение','GeolocateControl.LocationNotAvailable':'Местоположение недоступно'},...(offline?{minZoom:0,maxZoom:offline.maxZoom,localIdeographFontFamily:false}:{})});
      this.locationControl=addLocationControl(this.map,library,{status:locationStatus,offline});
      this.map.addControl(new library.ScaleControl({unit:'metric'}),'bottom-right');this.map.addControl(new library.NavigationControl({showZoom:false}),'top-right');
      this.overlay=document.createElement('div');this.overlay.id='live-markers';this.overlay.setAttribute('role','group');this.overlay.setAttribute('aria-label','Места на карте');this.container.append(this.overlay);
      this.map.on('move',()=>this.render());
      this.map.on('movestart',()=>{this.onMove();this.tileError=false;if(this.ready)this.setStatus('Подгружаю карту…');});
      this.map.on('load',()=>{clearTimeout(this.timer);this.ready=true;this.setStatus(this.normalStatus());this.render();});
      this.map.on('idle',()=>{if(this.ready)this.setStatus(this.tileError?this.mapErrorStatus():this.normalStatus(),!!this.tileError);});
      this.map.on('error',()=>{this.tileError=true;this.setStatus(this.mapErrorStatus(),true);});
      if(this.selected&&!previousView)this.focus(this.selected);this.render();
    }catch(error){clearTimeout(this.timer);this.ready=false;this.setStatus('Карта недоступна. Список мест и карточки доступны.',true);console.warn('Map initialization failed',error);}
  }
  normalStatus(){if(!this.offline)return 'Онлайн-карта · OpenFreeMap';const center=this.map.getCenter(),[w,s,e,n]=this.offline.bounds;return center.lng<w||center.lng>e||center.lat<s||center.lat>n?(this.onlineMapAvailable?'Онлайн-карта · вне сохранённого города':'Вне сохранённого города · подгружаю онлайн-карту'):'Сохранённая карта · OpenFreeMap';}
  reloadStyle(){this.tileError=false;this.setStatus('Подгружаю карту…');this.map.setStyle(this.offline?.style||this.context.city.map.style,{diff:false});}
  mapErrorStatus(){return this.offline&&!this.onlineMapAvailable?'Здесь карта не сохранена или нет связи с провайдером. Для подгрузки нужен интернет.':'Часть карты не загрузилась. Проверьте подключение.';}
  setStatus(message,retry=false){this.status.textContent=message;this.retry.hidden=!retry;}
  focus(point){this.selected=point;if(this.map){this.map.resize();this.map.easeTo({center:point.coord,zoom:Math.max(this.map.getZoom(),this.context.city.map.selectedZoom),duration:this.duration()});this.render();}}
  setPoints(points){this.filteredPoints=points;this.render();}
  clearSelection(){this.selected=null;this.render();}
  duration(){return matchMedia('(prefers-reduced-motion: reduce)').matches?0:250;}
  center(){if(!this.map)return;const view=this.context.city.map.defaultView;this.map.easeTo({...view,duration:this.duration()});}
  fitAll(){if(!this.map)return;const bounds=new globalThis.maplibregl.LngLatBounds();for(const p of this.filteredPoints)bounds.extend(p.coord);if(bounds.isEmpty())return;this.map.fitBounds(bounds,{padding:{top:80,bottom:65,left:45,right:45},maxZoom:this.context.city.map.maxFitZoom,duration:this.duration()});}
  zoom(delta){if(this.map)this.map.zoomTo(this.map.getZoom()+delta,{duration:this.duration()});}
  marker(point){
    const category=this.context.categoryMap.get(point.categoryId),group=document.createElement('button');
    group.type='button';group.className='point';group.setAttribute('data-point-id',point.id);
    group.setAttribute('style','position:absolute;left:0;top:0;width:48px;height:44px;margin:-18px 0 0 -18px;padding:0;border:0;border-radius:10px;background:transparent;overflow:visible;pointer-events:auto;box-shadow:none;transition:none');
    group.append(emojiMarker(category.icon,point.categoryNumber,this.markerMedia.matches));
    if(point.walk){const badge=document.createElement('span');badge.className='place-marker-rating';badge.setAttribute('aria-hidden','true');badge.setAttribute('style','position:absolute;left:-4px;top:43px;width:44px;height:18px;border-radius:9px;border:1.2px solid var(--walk);background:var(--panel);color:var(--walk);font:650 10px/16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;white-space:nowrap;pointer-events:none');badge.textContent='★ '+number(walkScore(point,this.context),this.context.city.locale);group.append(badge);}
    const rating=point.walk?' · оценка прогулки '+number(walkScore(point,this.context),this.context.city.locale)+' из 5':'';group.setAttribute('aria-label',pointBadge(point,this.context)+' · '+category.label+' · '+point.name+rating);group.title=point.name+rating;
    const activate=event=>{event.preventDefault();event.stopPropagation();const q=this.map.project(point.coord),nearby=this.visible.filter(p=>Math.hypot(p.screenX-q.x,p.screenY-q.y)<36);this.onSelect(point,nearby);};
    group.addEventListener('click',activate);return group;
  }
  render(){
    if(!this.map||!this.overlay)return;
    const width=this.container.clientWidth,height=this.container.clientHeight;
    this.visible=this.filteredPoints.map(p=>{const q=this.map.project(p.coord);return {...p,screenX:q.x,screenY:q.y};}).filter(p=>p.screenX>-45&&p.screenX<width+45&&p.screenY>-45&&p.screenY<height+45);
    const visibleIds=new Set(this.visible.map(p=>p.id));for(const [id,node]of this.nodes)if(!visibleIds.has(id)){node.remove();this.nodes.delete(id);}
    for(const point of this.visible){let node=this.nodes.get(point.id);if(!node){node=this.marker(this.context.pointMap.get(point.id));this.nodes.set(point.id,node);this.overlay.append(node);}node.style.transform=`translate3d(${point.screenX}px,${point.screenY}px,0)`;const active=point.id===this.selected?.id;node.setAttribute('aria-pressed',String(active));node.style.outline=active?'2px solid var(--ink)':'';}
    const active=this.nodes.get(this.selected?.id);if(active&&this.overlay.lastElementChild!==active)this.overlay.append(active);
  }
}
