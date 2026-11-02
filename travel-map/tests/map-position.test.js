import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MapView} from '../map-view.js';
class Element {
 constructor(tag){this.tagName=tag;this.style={};this.attributes={};this.children=[];}
 setAttribute(key,value){this.attributes[key]=value;}
 append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 addEventListener(){}
 get lastElementChild(){return this.children.at(-1);}
}
test('HTML markers carry emoji, number and rating together at projected map coordinates',()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const category={icon:'nature',label:'Парки'},points=[{id:'a',categoryId:'nature',name:'Первый',categoryNumber:1,coord:[100,120],walk:{scores:{fashion:4,atmosphere:4,scale:4,interest:4}}},{id:'b',categoryId:'nature',name:'Второй',categoryNumber:2,coord:[300,200]}];
  const view=Object.create(MapView.prototype);Object.assign(view,{context:{city:{locale:'ru-RU',assessment:{walk:{criteria:['fashion','atmosphere','scale','interest'].map(id=>({id,weight:.25}))}}},categoryMap:new Map([['nature',category]]),pointMap:new Map(points.map(p=>[p.id,p]))},markerMedia:{matches:false},container:{clientWidth:800,clientHeight:600},map:{project:coord=>({x:coord[0],y:coord[1]})},overlay:new Element('div'),nodes:new Map(),filteredPoints:points});
  view.render();const first=view.nodes.get('a'),second=view.nodes.get('b');
  assert.equal(first.tagName,'button');assert.equal(first.children[0].tagName,'div');assert.equal(first.children[0].children.length,2);assert.equal(first.children[1].className,'place-marker-rating');
  assert.equal(first.style.transform,'translate3d(100px,120px,0)');assert.equal(second.style.transform,'translate3d(300px,200px,0)');assert.equal(first.attributes.transform,undefined);
  view.map.project=coord=>({x:coord[0]+50,y:coord[1]-20});view.render();assert.equal(view.nodes.get('a'),first);assert.equal(first.style.transform,'translate3d(150px,100px,0)');assert.equal(second.style.transform,'translate3d(350px,180px,0)');
  view.filteredPoints=[points[1]];view.render();assert.equal(view.nodes.has('a'),false);assert.equal(view.overlay.children.length,1);
 }finally{globalThis.document=previous;}
});
