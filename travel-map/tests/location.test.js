import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addLocationControl,locationErrorMessage} from '../location-control.js';
class Geolocate {
 constructor(options){this.options=options;this.events={};}
 on(name,callback){this.events[name]=callback;return this;}
 emit(name,event){this.events[name](event);}
}
function setup(offline){const status={hidden:true,textContent:''},map={addControl(control,position){this.control=control;this.position=position;}};const control=addLocationControl(map,{GeolocateControl:Geolocate},{status,offline});return {status,map,control};}
test('location control waits for a user action and uses native tracking and accuracy rendering',()=>{
 const {control,map,status}=setup();assert.equal(map.position,'top-left');assert.equal(status.hidden,true);
 assert.equal(control.options.trackUserLocation,true);assert.equal(control.options.showAccuracyCircle,true);assert.equal(control.options.showUserLocation,true);assert.equal(control.options.positionOptions.enableHighAccuracy,true);assert.equal(control.options.positionOptions.timeout,15000);
 control.emit('geolocate',{coords:{latitude:39.9,longitude:116.4,accuracy:24.2}});assert.match(status.textContent,/±25 м/);assert.equal(status.hidden,false);
 control.emit('trackuserlocationend');assert.match(status.textContent,/чтобы вернуться/);control.emit('trackuserlocationstart');assert.match(status.textContent,/включено/);
});
test('offline bounds are reported without treating another city as Beijing',()=>{
 const {control,status}=setup({bounds:[116.1,39.6,116.85,40.5]});control.emit('geolocate',{coords:{latitude:39.9,longitude:117,accuracy:50}});assert.match(status.textContent,/за пределами/);
 control.emit('outofmaxbounds');assert.match(status.textContent,/не скачана/);
 control.emit('geolocate',{coords:{latitude:39.9,longitude:116.4,accuracy:12}});assert.match(status.textContent,/Ваше местоположение/);
});
test('permission, missing signal and timeout errors are actionable',()=>{
 for(const [code,pattern]of [[1,/Разрешите/],[2,/открытом месте/],[3,/ещё раз/],[99,/настройки/]]){const {control,status}=setup();control.emit('error',{code});assert.match(status.textContent,pattern);assert.equal(status.textContent,locationErrorMessage({code}));}
});
