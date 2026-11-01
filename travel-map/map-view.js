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
    Object.assign(this,{context,container,status,retry,onSelect,onMove});this.nodes=new Map();this.selected=null;this.map=null;this.overlay=null;this.timer=null;this.generation=0;
    this.resizeObserver=new ResizeObserver(()=>{if(this.map){this.map.resize();this.render();}});this.resizeObserver.observe(container);retry.onclick=()=>this.start();
  }
  async start(){
    this.ready=false;this.tileError=false;const generation=++this.generation;clearTimeout(this.timer);this.map?.remove();this.map=null;this.overlay=null;this.nodes.clear();this.container.replaceChildren();this.setStatus('Загружаю онлайн-карту…');
    this.timer=setTimeout(()=>{if(generation===this.generation)this.setStatus('Карта пока не загрузилась. Проверьте подключение.',true);},20000);
    try{
      const library=await loadLibrary();if(generation!==this.generation)return;
      const config=this.context.city.map;
      this.map=new library.Map({container:this.container,style:config.style,center:config.defaultView.center,zoom:config.defaultView.zoom});
      this.map.addControl(new library.ScaleControl({unit:'metric'}),'bottom-right');this.map.addControl(new library.NavigationControl({showZoom:false}),'top-right');
      this.overlay=svg('svg',{id:'live-markers','aria-label':'Места на карте'});this.container.append(this.overlay);
      this.map.on('move',()=>this.render());
      this.map.on('movestart',()=>{this.onMove();this.tileError=false;if(this.ready)this.setStatus('Подгружаю карту…');});
      this.map.on('load',()=>{clearTimeout(this.timer);this.ready=true;this.setStatus('Онлайн-карта · OpenFreeMap');this.render();});
      this.map.on('idle',()=>{if(this.ready)this.setStatus(this.tileError?'Часть карты не загрузилась':'Онлайн-карта · OpenFreeMap',!!this.tileError);});
      this.map.on('error',()=>{this.tileError=true;this.setStatus('Часть карты не загрузилась. Проверьте подключение.',true);});
      if(this.selected)this.focus(this.selected);this.render();
    }catch(error){clearTimeout(this.timer);this.ready=false;this.setStatus('Карта недоступна. Список мест и карточки доступны.',true);console.warn('Map initialization failed',error);}
  }
  setStatus(message,retry=false){this.status.textContent=message;this.retry.hidden=!retry;}
  focus(point){this.selected=point;if(this.map){this.map.resize();this.map.easeTo({center:point.coord,zoom:Math.max(this.map.getZoom(),this.context.city.map.selectedZoom),duration:this.duration()});this.render();}}
  clearSelection(){this.selected=null;this.render();}
  duration(){return matchMedia('(prefers-reduced-motion: reduce)').matches?0:250;}
  center(){if(!this.map)return;const view=this.context.city.map.defaultView;this.map.easeTo({...view,duration:this.duration()});}
  fitAll(){if(!this.map)return;const bounds=new globalThis.maplibregl.LngLatBounds();for(const p of this.context.points)bounds.extend(p.coord);this.map.fitBounds(bounds,{padding:{top:80,bottom:65,left:45,right:45},maxZoom:this.context.city.map.maxFitZoom,duration:this.duration()});}
  zoom(delta){if(this.map)this.map.zoomTo(this.map.getZoom()+delta,{duration:this.duration()});}
  marker(point){
    const category=this.context.categoryMap.get(point.categoryId),group=svg('g',{class:'point',role:'button',tabindex:0,'data-point-id':point.id});
    group.style.setProperty('--marker-color',category.color);group.style.setProperty('--marker-dark-color',category.darkColor);
    group.append(svg('title'),svg('circle',{r:22,fill:'transparent'}),svg('circle',{r:21,class:'active-ring'}));
    const shape=category.shape==='circle'?svg('circle',{r:14,class:'marker'}):svg('rect',{x:-13,y:-13,width:26,height:26,rx:category.shape==='square'?4:1,class:'marker',...(category.shape==='diamond'?{transform:'rotate(45)'}:{})});group.append(shape);
    const label=svg('text',{class:'marker-label'});label.textContent=point.id;group.append(label);
    if(point.walk){const badge=svg('g',{class:'walk-map-rating'});badge.append(svg('rect',{x:-22,y:17,width:44,height:18,rx:9}));const score=svg('text',{y:29});score.textContent='★ '+number(walkScore(point,this.context),this.context.city.locale);badge.append(score);group.append(badge);}
    const rating=point.walk?' · оценка прогулки '+number(walkScore(point,this.context),this.context.city.locale)+' из 5':'';group.setAttribute('aria-label',point.id+' · '+point.name+rating);group.querySelector('title').textContent=point.name+rating;
    const activate=event=>{event.preventDefault();event.stopPropagation();const q=this.map.project(point.coord),nearby=this.visible.filter(p=>Math.hypot(p.screenX-q.x,p.screenY-q.y)<36);this.onSelect(point,nearby);};
    group.addEventListener('click',activate);group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')activate(event);});return group;
  }
  render(){
    if(!this.map||!this.overlay)return;
    const width=this.container.clientWidth,height=this.container.clientHeight;this.overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
    this.visible=this.context.points.map(p=>{const q=this.map.project(p.coord);return {...p,screenX:q.x,screenY:q.y};}).filter(p=>p.screenX>-45&&p.screenX<width+45&&p.screenY>-45&&p.screenY<height+45);
    const visibleIds=new Set(this.visible.map(p=>p.id));for(const [id,node]of this.nodes)if(!visibleIds.has(id)){node.remove();this.nodes.delete(id);}
    for(const point of this.visible){let node=this.nodes.get(point.id);if(!node){node=this.marker(this.context.pointMap.get(point.id));this.nodes.set(point.id,node);this.overlay.append(node);}node.setAttribute('transform',`translate(${point.screenX},${point.screenY})`);const active=point.id===this.selected?.id;node.setAttribute('aria-pressed',String(active));node.querySelector('.active-ring').setAttribute('display',active?'inline':'none');}
    const active=this.nodes.get(this.selected?.id);if(active&&this.overlay.lastElementChild!==active)this.overlay.append(active);
  }
}
