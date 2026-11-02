export function locationErrorMessage(error) {
 switch(error?.code){
  case 1:return 'Доступ к местоположению запрещён. Разрешите его в настройках сайта и телефона.';
  case 2:return 'Не удалось определить местоположение. Проверьте геолокацию телефона и попробуйте на открытом месте.';
  case 3:return 'Определение местоположения заняло слишком много времени. Нажмите кнопку ещё раз.';
  default:return 'Местоположение недоступно. Проверьте настройки геолокации и повторите попытку.';
 }
}
export function addLocationControl(map,library,{status,offline}={}) {
 const report=message=>{if(status){status.textContent=message;status.hidden=!message;}};
 const control=new library.GeolocateControl({positionOptions:{enableHighAccuracy:true,timeout:15000,maximumAge:5000},trackUserLocation:true,showAccuracyCircle:true,showUserLocation:true,fitBoundsOptions:{maxZoom:15}});
 control.on('geolocate',position=>{
  const accuracy=position.coords?.accuracy,precision=Number.isFinite(accuracy)?' · точность ±'+Math.max(1,Math.ceil(accuracy))+' м':'';
  const c=position.coords,bounds=offline?.bounds,outside=bounds&&c&&(c.longitude<bounds[0]||c.longitude>bounds[2]||c.latitude<bounds[1]||c.latitude>bounds[3]);
  report((outside?'Вы за пределами сохранённой области':'Ваше местоположение')+precision);
 });
 control.on('error',error=>report(locationErrorMessage(error)));
 control.on('outofmaxbounds',()=>report('Вы за пределами сохранённой карты. Для этой области карта не скачана.'));
 control.on('trackuserlocationstart',()=>report('Следование за местоположением включено.'));
 control.on('trackuserlocationend',()=>report('Автоцентрирование выключено. Нажмите кнопку местоположения, чтобы вернуться к себе.'));
 map.addControl(control,'top-left');return control;
}
