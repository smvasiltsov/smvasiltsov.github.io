import {categoryEmoji} from './category-icons.js';
import {pointBadge} from './point-labels.js';
import {savedMap} from './offline-map.js';
import {walkScore} from './assessment.js';
import {number} from './format.js';
const SVG='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const node=document.createElementNS(SVG,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;};
let libraryPromise;
function loadLibrary(){
  if(globalThis.maplibregl)return Promise.resolve(globalThis.maplibregl);
  if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/maplibre-5.6.1/maplibre-gl.js',import.meta.url).href;script.onload=()=>resolve(globalThis.maplibregl);script.onerror=()=>{libraryPromise=null;script.remove();reject(new Error('Map library unavailable'));};document.head.append(script);});
  return libraryPromise;
}
export class MapView {
  constructor(context,{container,status,retry,onSelect,onMove}){
    Object.assign(this,{context,container,status,retry,onSelect,onMove});this.filteredPoints=context.points;this.nodes=new Map();this.selected=null;this.map=null;this.overlay=null;this.timer=null;this.generation=0;
    this.resizeObserver=new ResizeObserver(()=>{if(this.map){this.map.resize();this.render();}});this.resizeObserver.observe(container);retry.onclick=()=>this.start();
  }
  async start(){
    this.ready=false;this.tileError=false;const generation=++this.generation;clearTimeout(this.timer);this.map?.remove();this.map=null;this.overlay=null;this.nodes.clear();this.container.replaceChildren();this.setStatus('Загружаю карту…');
    this.timer=setTimeout(()=>{if(generation===this.generation)this.setStatus('Карта пока не загрузилась. Проверьте подключение.',true);},20000);
    try{
      const [library,offline]=await Promise.all([loadLibrary(),savedMap(this.context)]);if(generation!==this.generation)return;this.offline=offline;
      const config=this.context.city.map;
      this.map=new library.Map({container:this.container,style:offline?.style||config.style,center:config.defaultView.center,zoom:config.defaultView.zoom,...(offline?{minZoom:offline.minZoom,maxZoom:offline.maxZoom,maxBounds:[offline.bounds[0]-1,offline.bounds[1]-.4,offline.bounds[2]+1,offline.bounds[3]+.4],localIdeographFontFamily:false}:{})});
      this.map.addControl(new library.ScaleControl({unit:'metric'}),'bottom-right');this.map.addControl(new library.NavigationControl({showZoom:false}),'top-right');
      this.overlay=svg('svg',{id:'live-markers','aria-label':'Места на карте'});this.container.append(this.overlay);
      this.map.on('move',()=>this.render());
      this.map.on('movestart',()=>{this.onMove();this.tileError=false;if(this.ready)this.setStatus('Подгружаю карту…');});
      this.map.on('load',()=>{clearTimeout(this.timer);this.ready=true;this.setStatus(this.normalStatus());this.render();});
      this.map.on('idle',()=>{if(this.ready)this.setStatus(this.tileError?'Часть карты не загрузилась':(this.normalStatus()),!!this.tileError);});
      this.map.on('error',()=>{this.tileError=true;this.setStatus('Часть карты не загрузилась. Проверьте подключение.',true);});
      if(this.selected)this.focus(this.selected);this.render();
    }catch(error){clearTimeout(this.timer);this.ready=false;this.setStatus('Карта недоступна. Список мест и карточки доступны.',true);console.warn('Map initialization failed',error);}
  }
  normalStatus(){if(!this.offline)return 'Онлайн-карта · OpenFreeMap';const center=this.map.getCenter(),[w,s,e,n]=this.offline.bounds;return center.lng<w||center.lng>e||center.lat<s||center.lat>n?'За пределами сохранённой области':'Сохранённая карта · OpenFreeMap';}
  setStatus(message,retry=false){this.status.textContent=message;this.retry.hidden=!retry;}
  focus(point){this.selected=point;if(this.map){this.map.resize();this.map.easeTo({center:point.coord,zoom:Math.max(this.map.getZoom(),this.context.city.map.selectedZoom),duration:this.duration()});this.render();}}
  setPoints(points){this.filteredPoints=points;this.render();}
  clearSelection(){this.selected=null;this.render();}
  duration(){return matchMedia('(prefers-reduced-motion: reduce)').matches?0:250;}
  center(){if(!this.map)return;const view=this.context.city.map.defaultView;this.map.easeTo({...view,duration:this.duration()});}
  fitAll(){if(!this.map)return;const bounds=new globalThis.maplibregl.LngLatBounds();for(const p of this.filteredPoints)bounds.extend(p.coord);if(bounds.isEmpty())return;this.map.fitBounds(bounds,{padding:{top:80,bottom:65,left:45,right:45},maxZoom:this.context.city.map.maxFitZoom,duration:this.duration()});}
  zoom(delta){if(this.map)this.map.zoomTo(this.map.getZoom()+delta,{duration:this.duration()});}
  marker(point){
    const category=this.context.categoryMap.get(point.categoryId),group=svg('g',{class:'point',role:'button',tabindex:0,'data-point-id':point.id});
    group.style.setProperty('--marker-color',category.color);group.style.setProperty('--marker-dark-color',category.darkColor);
    group.append(svg('title'),svg('rect',{x:-25,y:-25,width:56,height:52,rx:12,fill:'transparent'}),svg('rect',{x:-25,y:-25,width:56,height:48,rx:16,class:'active-ring'}));
    const emoji=svg('text',{x:0,y:0,class:'marker-emoji','aria-hidden':'true'});emoji.textContent=categoryEmoji(category.icon);group.append(emoji);
    const label=svg('text',{x:18,y:14,class:'marker-label'});label.textContent=point.categoryNumber;group.append(label);
    if(point.walk){const badge=svg('g',{class:'walk-map-rating'});badge.append(svg('rect',{x:-22,y:26,width:44,height:18,rx:9}));const score=svg('text',{y:38});score.textContent='★ '+number(walkScore(point,this.context),this.context.city.locale);badge.append(score);group.append(badge);}
    const rating=point.walk?' · оценка прогулки '+number(walkScore(point,this.context),this.context.city.locale)+' из 5':'';group.setAttribute('aria-label',pointBadge(point,this.context)+' · '+category.label+' · '+point.name+rating);group.querySelector('title').textContent=point.name+rating;
    const activate=event=>{event.preventDefault();event.stopPropagation();const q=this.map.project(point.coord),nearby=this.visible.filter(p=>Math.hypot(p.screenX-q.x,p.screenY-q.y)<36);this.onSelect(point,nearby);};
    group.addEventListener('click',activate);group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')activate(event);});return group;
  }
  render(){
    if(!this.map||!this.overlay)return;
    const width=this.container.clientWidth,height=this.container.clientHeight;this.overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
    this.visible=this.filteredPoints.map(p=>{const q=this.map.project(p.coord);return {...p,screenX:q.x,screenY:q.y};}).filter(p=>p.screenX>-45&&p.screenX<width+45&&p.screenY>-45&&p.screenY<height+45);
    const visibleIds=new Set(this.visible.map(p=>p.id));for(const [id,node]of this.nodes)if(!visibleIds.has(id)){node.remove();this.nodes.delete(id);}
    for(const point of this.visible){let node=this.nodes.get(point.id);if(!node){node=this.marker(this.context.pointMap.get(point.id));this.nodes.set(point.id,node);this.overlay.append(node);}node.setAttribute('transform',`translate(${point.screenX},${point.screenY})`);const active=point.id===this.selected?.id;node.setAttribute('aria-pressed',String(active));node.querySelector('.active-ring').setAttribute('display',active?'inline':'none');}
    const active=this.nodes.get(this.selected?.id);if(active&&this.overlay.lastElementChild!==active)this.overlay.append(active);
  }
}
