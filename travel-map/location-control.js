export function locationErrorMessage(error,context={}) {
 if(context.policyBlocked)return 'В этом окне браузера геолокация заблокирована политикой доступа. Откройте сайт напрямую в Safari или Chrome.';
 if(context.secure===false)return 'Для геолокации откройте сайт по защищённому адресу https://smvasiltsov.github.io/beijing/.';
 switch(error?.code){
  case 1:return context.permission==='granted'?'Разрешение сайта есть, но браузер не получил координаты. Проверьте системные Службы геолокации и доступ Safari или другого браузера к ним.':'Браузер сообщил отказ в доступе к координатам. Если для сайта уже выбрано «Разрешить», проверьте системные Службы геолокации и доступ Safari или другого браузера к ним.';
  case 2:return 'Координаты пока недоступны. Проверьте геолокацию устройства и попробуйте на открытом месте.';
  case 3:return 'Определение местоположения заняло слишком много времени. Нажмите кнопку ещё раз.';
  default:return 'Местоположение недоступно. Проверьте системные настройки геолокации и повторите попытку.';
 }
}
export function locationContext(environment=globalThis) {
 const policy=environment.document?.permissionsPolicy||environment.document?.featurePolicy;let policyBlocked=false;
 try{policyBlocked=policy?.allowsFeature('geolocation')===false;}catch{}
 return {secure:environment.isSecureContext!==false,policyBlocked};
}
export class LocationSession {
 constructor({environment=globalThis,onPosition=()=>{},onMessage=()=>{},onState=()=>{}}={}){Object.assign(this,{environment,onPosition,onMessage,onState});this.running=false;this.following=false;this.watchId=null;this.sequence=0;this.position=null;this.stale=false;}
 toggle(){
  if(this.running&&this.following){this.stop();this.onMessage('Определение местоположения выключено.');return;}
  if(this.running&&this.position){this.following=true;this.onState();this.onPosition(this.position,true);this.onMessage('Следование за местоположением включено.');return;}
  const context=locationContext(this.environment),geo=this.environment.navigator?.geolocation;
  if(!geo||!context.secure||context.policyBlocked){this.onMessage(!geo?'Этот браузер не предоставляет геолокацию. Откройте сайт в Safari или Chrome.':locationErrorMessage({},context));return;}
  this.running=true;this.following=true;const sequence=++this.sequence;this.onState();this.onMessage('Определяю местоположение…');
  // Request directly from the click handler, before any asynchronous permission checks.
  try{geo.getCurrentPosition(position=>{
   if(sequence!==this.sequence)return;this.accept(position);
   if(!this.running||sequence!==this.sequence)return;
   try{const id=geo.watchPosition(value=>{if(sequence===this.sequence)this.accept(value);},error=>this.error(error,sequence),{enableHighAccuracy:true,timeout:20000,maximumAge:5000});
   if(sequence===this.sequence&&this.running)this.watchId=id;else geo.clearWatch(id);}catch(error){this.error({code:error.name==='SecurityError'?1:2},sequence);}
  },error=>this.error(error,sequence),{enableHighAccuracy:true,timeout:20000,maximumAge:0});}catch(error){this.error({code:error.name==='SecurityError'?1:2},sequence);}
 }
 accept(position){const c=position?.coords;if(!c||!Number.isFinite(c.longitude)||!Number.isFinite(c.latitude)||Math.abs(c.longitude)>180||Math.abs(c.latitude)>85.051129){this.error({code:2},this.sequence);return;}this.stale=false;this.position=position;this.onPosition(position,this.following);this.onState();const accuracy=Number.isFinite(c.accuracy)?' · точность ±'+Math.max(1,Math.ceil(c.accuracy))+' м':'';this.onMessage('Ваше местоположение'+accuracy);}
 async error(error,sequence){
  if(sequence!==this.sequence)return;
  const context=locationContext(this.environment);
  if(error?.code===1){try{context.permission=(await this.environment.navigator.permissions?.query({name:'geolocation'}))?.state;}catch{}}
  if(sequence!==this.sequence)return;
  if(error?.code===1||!this.position)this.stop(error?.code===1);else{this.stale=true;this.onState();}
  this.onMessage(locationErrorMessage(error,context)+(this.position?' На карте показана последняя полученная позиция.':''));
 }
 release(){if(this.running&&this.following){this.following=false;this.onState();this.onMessage('Автоцентрирование выключено. Нажмите кнопку местоположения, чтобы вернуться к себе.');}}
 stop(clear=true){this.sequence++;if(this.watchId!==null)this.environment.navigator?.geolocation?.clearWatch(this.watchId);this.watchId=null;this.running=false;this.following=false;if(clear)this.position=null;this.onState();}
}
export function accuracyDiameter(accuracy,latitude,zoom){return Number.isFinite(accuracy)&&accuracy>=0?2*accuracy/(40075016.686*Math.cos(latitude*Math.PI/180)/(512*2**zoom)):0;}
export function addLocationControl(map,library,{status,environment=globalThis}={}) {
 const report=message=>{if(status){status.textContent=message;status.hidden=!message;}};
 let button,marker,circle,last;
 const control={
  onAdd(){
   const container=document.createElement('div');container.className='maplibregl-ctrl maplibregl-ctrl-group';
   button=document.createElement('button');button.type='button';button.className='maplibregl-ctrl-geolocate';button.title='Моё местоположение';button.setAttribute('aria-label','Моё местоположение');button.setAttribute('aria-pressed','false');
   const icon=document.createElement('span');icon.className='maplibregl-ctrl-icon';icon.setAttribute('aria-hidden','true');button.append(icon);container.append(button);this.container=container;
   button.onclick=()=>session.toggle();map.on('movestart',onMove);map.on('move',updateCircle);return container;
  },
  onRemove(){session.stop();marker?.remove();map.off('movestart',onMove);map.off('move',updateCircle);this.container?.remove();}
 };
 const updateCircle=()=>{if(circle&&last)circle.style.width=circle.style.height=accuracyDiameter(last.coords.accuracy,last.coords.latitude,map.getZoom())+'px';};
 const onMove=event=>{if(!event.geolocateSource&&!event.resize&&event.originalEvent?.type!=='resize')session.release();};
 const session=new LocationSession({environment,onMessage:report,onState:()=>{if(button){button.setAttribute('aria-pressed',String(session.running&&session.following));button.classList.toggle('maplibregl-ctrl-geolocate-active',session.running&&session.following);if(marker)marker.getElement().style.opacity=session.stale?'0.5':'1';if(!session.running&&!session.position){marker?.remove();marker=null;last=null;}}},onPosition:(position,follow)=>{
  last=position;const c=position.coords,coord=[c.longitude,c.latitude];
  if(!marker){const point=document.createElement('div');point.className='gps-position';point.setAttribute('role','img');point.setAttribute('aria-label','Ваше местоположение');circle=document.createElement('span');circle.className='gps-accuracy';const dot=document.createElement('span');dot.className='gps-dot';point.append(circle,dot);marker=new library.Marker({element:point,anchor:'center'}).setLngLat(coord).addTo(map);}else marker.setLngLat(coord);
  updateCircle();if(follow)map.easeTo({center:coord,zoom:Math.max(map.getZoom(),14),duration:300},{geolocateSource:true});
 }});
 control.session=session;map.addControl(control,'top-left');return control;
}
