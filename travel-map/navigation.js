import {localName} from './format.js';
export function navigationLinks(point,context,{mobile=false,ios=false}={}) {
  const [lon,lat]=point.coord,n=context.city.navigation;
  if(n.provider==='osm')return {label:n.label||'OpenStreetMap',web:`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,native:null};
  const url=new URL('https://uri.amap.com/marker');url.search=new URLSearchParams({position:point.coord.join(','),name:localName(point),coordinate:'wgs84',src:n.sourceApplication,callnative:mobile?'1':'0'});
  const web=new URL(url);web.searchParams.set('callnative','0');
  const native=ios?'iosamap://viewMap?'+new URLSearchParams({sourceApplication:n.sourceApplication,poiname:localName(point),lat,lon,dev:'1'}):url.href;
  return {label:n.label||'AMap',web:web.href,native};
}
