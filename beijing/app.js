
(async()=>{
'use strict';const $=id=>document.getElementById(id),points=JSON.parse($('data').textContent),bounds=JSON.parse($('boundaries').textContent);const roads=JSON.parse($('roads').textContent);
$('loading').hidden=true;let selected=null,photoIndex=0,zoom,previousFocus=null,showAll=true;let liveMap=null,liveReady=false,preferOnline=true,liveOverlay=null,loadTimer=null,loadingScript=null,onlineErrors=false;const colors=['var(--attraction)','var(--walk)','var(--hotel)'],cats=['Достопримечательность','Прогулки и кафе','Отель'];
for(let cat=0;cat<3;cat++){const group=document.createElement('optgroup');group.label=['Достопримечательности','Прогулки и кафе','Отели'][cat];for(const p of points.filter(p=>p.cat===cat)){const o=document.createElement('option');o.value=p.id;o.textContent=p.id+' · '+p.name;group.append(o)}$('places').append(group)}
const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),isMobile=isIOS||/Android/.test(navigator.userAgent);
function configureLinks(p){
 const web=new URL($('amap').href);web.searchParams.set('callnative','0');$('amap-web').href=web.href;$('amap-web').hidden=!isMobile;
 if(isIOS){$('amap').href='iosamap://viewMap?'+new URLSearchParams({sourceApplication:'BeijingTravelMap',poiname:p.zh,lat:p.coord[1],lon:p.coord[0],dev:'1'});$('amap').target='_self'}
 else $('amap').target=isMobile?'_self':'_blank';
}
function showPhoto(){const p=selected,ph=p.photos[photoIndex];$('photo').src=ph.data;$('photo').alt=p.name+' — фотография '+(photoIndex+1);$('photo-index').textContent=(photoIndex+1)+' / '+p.photos.length;$('prev').disabled=$('next').disabled=p.photos.length<2;$('credit').replaceChildren(document.createTextNode(ph.credit+' · '));const a=document.createElement('a');a.href=ph.filepage||ph.source;a.target='_blank';a.rel='noopener';a.textContent='Источник фотографии';$('credit').append(a)}
function choose(p){previousFocus=document.activeElement;selected=p;photoIndex=0;$('drawer').hidden=false;document.body.classList.add('has-panel');$('places').value=p.id;$('category').textContent=cats[p.cat];$('point-id').textContent='Точка '+p.id;$('place-title').textContent=p.name;$('place-zh').textContent=p.zh;$('description').textContent=p.description;$('amap').href='https://uri.amap.com/marker?'+new URLSearchParams({position:p.coord.join(','),name:p.zh,coordinate:'wgs84',src:'beijing-travel-map',callnative:'1'});configureLinks(p);$('trip').hidden=!p.url;if(p.url){const u=new URL(p.url);if(isMobile)u.searchParams.set('wkp','1');$('trip').href=u.href;$('trip').target=isMobile?'_self':'_blank'}else $('trip').removeAttribute('href');$('note').textContent=p.cat===2?'7–14 ноября 2026 · 2 взрослых. Цены проверены 1 ноября и не обновляются автоматически.':p.id==='16'?'Метка обозначает район Мутяньюй. Для поездки уточните нужный вход.':p.cat===1||p.id==='5'?'Метка — ориентир для прогулки, а не граница района.':'';renderHotel(p,points,choose);showPhoto();$('drawer').scrollTop=0;draw();if(liveReady&&preferOnline){liveMap.easeTo({center:p.coord,zoom:Math.max(liveMap.getZoom(),12),duration:250})}$('close').focus({preventScroll:true})}
function close(event){event?.preventDefault?.();event?.stopPropagation?.();if($('drawer').hidden)return;$('drawer').hidden=true;document.body.classList.remove('has-panel');selected=null;$('places').value='';draw();if(event?.type==='keydown'||event?.detail===0){if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});else (liveReady&&preferOnline?liveMap.getCanvas():$('map')).focus({preventScroll:true})}else{document.activeElement?.blur?.()}}
$('close').onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape')close(e)});$('places').onchange=()=>{const p=points.find(p=>p.id===$('places').value);if(p)choose(p);else close()};$('prev').onclick=()=>{photoIndex=(photoIndex-1+selected.photos.length)%selected.photos.length;showPhoto()};$('next').onclick=()=>{photoIndex=(photoIndex+1)%selected.photos.length;showPhoto()};$('reset').onclick=()=>{showAll=true;close();if(liveReady&&preferOnline)fitOnline(true);else draw()};$('center').onclick=()=>{showAll=false;close();if(liveReady&&preferOnline)fitOnline(false);else draw()};
function multi(coordinates){return{type:'MultiPoint',coordinates}}
function drawSavedMap(){const w=$('map-area').clientWidth,h=$('map-area').clientHeight,svg=d3.select($('map')).attr('viewBox',`0 0 ${w} ${h}`);svg.selectAll('*').remove();const urban=points.filter(p=>p.id!=='16'),fitPoints=showAll?urban:urban.filter(p=>!['H3','H4','H5'].includes(p.id)||p.id===selected?.id),proj=d3.geoMercator().fitExtent([[35,60],[w-35,Math.max(180,h-70)]],multi(fitPoints.map(p=>p.coord))),path=d3.geoPath(proj);const layer=svg.append('g');layer.append('path').datum(roads).attr('d',path).attr('class','roads');const markers=svg.append('g');
const renderMarkers=t=>{markers.selectAll('*').remove();const visible=urban.map(p=>{const q=t.apply(proj(p.coord));return{...p,tx:q[0],ty:q[1],x:q[0],y:q[1]}}).filter(p=>p.tx>10&&p.tx<w-10&&p.ty>10&&p.ty<h-10);const sim=d3.forceSimulation(visible).force('x',d3.forceX(p=>p.tx).strength(.35)).force('y',d3.forceY(p=>p.ty).strength(.35)).force('collide',d3.forceCollide(19)).stop();for(let i=0;i<80;i++)sim.tick();for(const p of visible){p.x=Math.max(22,Math.min(w-22,p.x));p.y=Math.max(22,Math.min(h-22,p.y));markers.append('line').attr('class','leader').attr('x1',p.tx).attr('y1',p.ty).attr('x2',p.x).attr('y2',p.y);markers.append('circle').attr('cx',p.tx).attr('cy',p.ty).attr('r',2).attr('fill','var(--ink)');const g=markers.append('g').attr('class','point').attr('role','button').attr('tabindex',0).attr('aria-label',p.id+' · '+p.name).attr('aria-pressed',selected?.id===p.id?'true':'false').attr('transform',`translate(${p.x},${p.y})`).on('click',e=>{e.stopPropagation();choose(points.find(x=>x.id===p.id))}).on('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(points.find(x=>x.id===p.id))}});g.append('title').text(p.name);g.append('circle').attr('r',22).attr('fill','transparent');if(selected?.id===p.id)g.append('circle').attr('r',21).attr('class','active-ring');if(p.cat===0)g.append('circle').attr('r',14).attr('fill',colors[0]).attr('class','marker');else g.append('rect').attr('x',-13).attr('y',-13).attr('width',26).attr('height',26).attr('rx',p.cat===1?4:1).attr('transform',p.cat===2?'rotate(45)':'').attr('fill',colors[p.cat]).attr('class','marker');g.append('text').attr('class','marker-label').text(p.id)}};
zoom=d3.zoom().scaleExtent([1,16]).on('zoom',e=>{layer.attr('transform',e.transform);layer.select('.roads').attr('stroke-width',.7/e.transform.k);renderMarkers(e.transform)});svg.call(zoom).on('dblclick.zoom',null);renderMarkers(d3.zoomIdentity);drawOverview();}
function drawOverview(){const el=$('overview'),w=el.clientWidth,h=el.clientHeight,s=d3.select(el).attr('viewBox',`0 0 ${w} ${h}`);s.selectAll('*').remove();const pr=d3.geoMercator().fitExtent([[24,24],[w-24,h-25]],multi([[116.2,39.85],[116.69,40.48]])),path=d3.geoPath(pr);s.selectAll('path').data(bounds.features).join('path').attr('d',path).attr('fill','var(--bg)').attr('stroke','var(--border)').attr('stroke-width',.4);for(const id of ['1','16']){const p=points.find(p=>p.id===id),[x,y]=pr(p.coord);const g=s.append('g').attr('role','button').attr('tabindex',0).attr('class','point').attr('aria-label',id==='16'?'16 · Великая стена — Мутяньюй':'Центр Пекина').on('click',()=>id==='16'?choose(p):$('reset').click()).on('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();id==='16'?choose(p):$('reset').click()}});g.append('circle').attr('cx',x).attr('cy',y).attr('r',20).attr('fill','transparent');g.append('circle').attr('cx',x).attr('cy',y).attr('r',5).attr('fill','var(--attraction)');g.append('text').attr('x',x).attr('y',y+(id==='16'?-12:18)).attr('text-anchor','middle').attr('class','map-label').text(id==='16'?'16 · Мутяньюй':'Пекин')}}

function draw(){
 if(liveReady&&preferOnline){liveMap.resize();renderOnlineMarkers();drawOverview()}
 else drawSavedMap();
}
function renderOnlineMarkers(){
 if(!liveMap||!liveOverlay||!liveReady||!preferOnline)return;
 const w=$('map-area').clientWidth,h=$('map-area').clientHeight;
 const markers=d3.select(liveOverlay).attr('viewBox',`0 0 ${w} ${h}`);
 markers.selectAll('*').remove();const visible=points.map(p=>{const q=liveMap.project(p.coord);return{...p,tx:q.x,ty:q.y,x:q.x,y:q.y}}).filter(p=>p.tx>10&&p.tx<w-10&&p.ty>10&&p.ty<h-10);const sim=d3.forceSimulation(visible).force('x',d3.forceX(p=>p.tx).strength(.35)).force('y',d3.forceY(p=>p.ty).strength(.35)).force('collide',d3.forceCollide(19)).stop();for(let i=0;i<80;i++)sim.tick();for(const p of visible){p.x=Math.max(22,Math.min(w-22,p.x));p.y=Math.max(22,Math.min(h-22,p.y));markers.append('line').attr('class','leader').attr('x1',p.tx).attr('y1',p.ty).attr('x2',p.x).attr('y2',p.y);markers.append('circle').attr('cx',p.tx).attr('cy',p.ty).attr('r',2).attr('fill','var(--ink)');const g=markers.append('g').attr('class','point').attr('role','button').attr('tabindex',0).attr('aria-label',p.id+' · '+p.name).attr('aria-pressed',selected?.id===p.id?'true':'false').attr('transform',`translate(${p.x},${p.y})`).on('click',e=>{e.stopPropagation();choose(points.find(x=>x.id===p.id))}).on('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(points.find(x=>x.id===p.id))}});g.append('title').text(p.name);g.append('circle').attr('r',22).attr('fill','transparent');if(selected?.id===p.id)g.append('circle').attr('r',21).attr('class','active-ring');if(p.cat===0)g.append('circle').attr('r',14).attr('fill',colors[0]).attr('class','marker');else g.append('rect').attr('x',-13).attr('y',-13).attr('width',26).attr('height',26).attr('rx',p.cat===1?4:1).attr('transform',p.cat===2?'rotate(45)':'').attr('fill',colors[p.cat]).attr('class','marker');g.append('text').attr('class','marker-label').text(p.id)}
}
function fitOnline(all){
 const visible=all?points:points.filter(p=>p.id!=='16'&&!['H3','H4','H5'].includes(p.id));
 const box=new maplibregl.LngLatBounds();for(const p of visible)box.extend(p.coord);
 liveMap.fitBounds(box,{padding:{top:85,bottom:85,left:45,right:45},maxZoom:12,duration:250});
}
function useSaved(message){
 $('online-map').style.visibility='hidden';$('map').removeAttribute('hidden');
 $('map-mode-text').textContent=message||'Сохранённая основа · только центр';
 $('toggle-map').textContent='Онлайн-карта';
 $('map-attribution-note').textContent='Сохранённая основа центра · ';
 drawSavedMap();
}
function useOnline(){
 $('online-map').style.visibility='visible';$('map').setAttribute('hidden','');
 $('map-mode-text').textContent='Онлайн-карта · OpenFreeMap';
 $('toggle-map').textContent='Сохранённая карта';
 $('map-attribution-note').textContent='';
 draw();
}
function createOnline(){
 if(liveMap)return;
 const container=$('online-map');container.hidden=false;container.style.visibility='hidden';
 try{
  liveMap=new maplibregl.Map({container,style:'https://tiles.openfreemap.org/styles/liberty',center:[116.397,39.916],zoom:11});
  liveMap.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-right');
  liveMap.addControl(new maplibregl.NavigationControl({showZoom:false}),'top-right');
  liveOverlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  liveOverlay.id='live-markers';liveOverlay.setAttribute('aria-label','Места на карте');
  container.append(liveOverlay);
  const initial=points.filter(p=>p.id!=='16');const box=new maplibregl.LngLatBounds();
  for(const p of initial)box.extend(p.coord);
  liveMap.fitBounds(box,{padding:{top:85,bottom:85,left:45,right:45},duration:0});
  liveMap.on('move',renderOnlineMarkers);
  liveMap.on('movestart',()=>{onlineErrors=false;if(liveReady&&preferOnline)$('map-mode-text').textContent='Подгружаю карту…'});
  liveMap.on('idle',()=>{
   if(!liveReady&&liveMap.queryRenderedFeatures().length){
    liveReady=true;clearTimeout(loadTimer);
    if(preferOnline)useOnline();
   }
   if(liveReady&&preferOnline)$('map-mode-text').textContent=onlineErrors?'Часть онлайн-карты не загрузилась':'Онлайн-карта · OpenFreeMap';
  });
  liveMap.on('error',()=>{onlineErrors=true;
   if(liveReady&&preferOnline)$('map-mode-text').textContent='Часть онлайн-карты не загрузилась';
  });
 }catch(error){
  if(liveMap){liveMap.remove();liveMap=null}
  clearTimeout(loadTimer);useSaved('Онлайн-карта недоступна · сохранённая основа');
 }
}
function startOnline(){
 $('map-mode-text').textContent='Загружаю онлайн-карту…';
 clearTimeout(loadTimer);
 loadTimer=setTimeout(()=>{
  if(!liveReady)useSaved('Онлайн-карта пока не загрузилась · сохранённая основа');
 },15000);
 if(window.maplibregl){createOnline();return}
 if(loadingScript)return;
 loadingScript=document.createElement('script');
 loadingScript.src='./vendor/maplibre-5.6.1/maplibre-gl.js';
 loadingScript.onload=()=>{loadingScript=null;createOnline()};
 loadingScript.onerror=()=>{loadingScript=null;clearTimeout(loadTimer);useSaved('Онлайн-карта недоступна · сохранённая основа')};
 document.head.append(loadingScript);
}
$('toggle-map').onclick=()=>{
 if($('toggle-map').textContent==='Сохранённая карта'){
  preferOnline=false;clearTimeout(loadTimer);useSaved();
 }else{
  preferOnline=true;
  if(liveReady)useOnline();
  else{
   $('toggle-map').textContent='Сохранённая карта';
   if(liveMap)liveMap.setStyle('https://tiles.openfreemap.org/styles/liberty');
   startOnline();
  }
 }
};

$('plus').onclick=()=>liveReady&&preferOnline?liveMap.zoomIn():d3.select($('map')).call(zoom.scaleBy,1.5);$('minus').onclick=()=>liveReady&&preferOnline?liveMap.zoomOut():d3.select($('map')).call(zoom.scaleBy,1/1.5);new ResizeObserver(draw).observe($('map-area'));draw();startOnline();
})();
