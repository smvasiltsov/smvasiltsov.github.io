import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCity} from '../scripts/validate.mjs';
import {validateVisit,practicalFields} from '../visit-contract.js';
import {visitFactText} from '../place-card.js';
const context=await readCity(new URL('../../beijing/data/city.json',import.meta.url));
const places=context.points.filter(p=>p.cardType==='place');
const ids=new Set(context.points.map(p=>p.id));
const errors=v=>validateVisit(v,'visit',ids,'1');
const copy=()=>structuredClone(places[0].visit);

test('all 64 places use the visit template without changing the hotel model',()=>{
  assert.equal(places.length,64);
  for(const p of places){
    assert.deepEqual(validateVisit(p.visit,p.id,ids,p.id),[]);
    for(const key of practicalFields)assert.ok(Object.hasOwn(p.visit,key),p.id+': '+key);
    if(p.walk)assert.equal(p.visit.duration.value,p.walk.duration,p.id);
    if(p.visitNote)assert.ok(p.visit.considerations.includes(p.visitNote),p.id);
    for(const source of p.sources||[])assert.ok(p.visit.provenance.sources.includes(source),p.id);
    assert.equal(p.visit.provenance.checkedAt,p.checkedAt||null,p.id);
  }
  assert.equal(context.points.filter(p=>p.cardType==='hotel').length,11);
  assert.ok(context.points.filter(p=>p.cardType==='hotel').every(p=>!p.visit));
});
test('missing, malformed and incomplete visit cards fail validation',()=>{
  for(const value of [undefined,null,[],{},'text'])assert.ok(errors(value).length);
  for(const mutate of [v=>delete v.cost,v=>v.activities.pop(),v=>v.activities.push(v.activities[0]),v=>v.summary='',v=>v.arrival=null,v=>v.provenance=null]){
    const v=copy();mutate(v);assert.ok(errors(v).length);
  }
});
test('unknown facts never display as free or unrestricted and cannot contain a hidden value',()=>{
  const v=copy();assert.equal(visitFactText(v.cost),'Не проверено');
  v.cost.value='Бесплатно';assert.ok(errors(v).length);
  const fact={status:'not_applicable',value:null,sources:[],checkedAt:null};
  assert.equal(visitFactText(fact),'Не применимо');
});
test('documented conditions require evidence and estimates cannot invent ticket rules',()=>{
  for(const key of ['hours','cost','booking','access']){
    const v=copy();v[key]={status:'estimate',value:'Пример',sources:[],checkedAt:null};assert.ok(errors(v).length);
    v[key].status='documented';assert.ok(errors(v).length);
    v[key].sources=['https://example.com/visit'];v[key].checkedAt='2026-02-30';assert.ok(errors(v).length);
    v[key].checkedAt='2026-11-02';assert.deepEqual(errors(v),[]);
  }
});
test('combined routes reference real other places and review dates are not invented',()=>{
  for(const combineWith of [['missing'],['1'],['2','2']]){const v=copy();v.combineWith=combineWith;assert.ok(errors(v).length);}
  const v=copy();v.provenance.basis='source-review';assert.ok(errors(v).length);
});
