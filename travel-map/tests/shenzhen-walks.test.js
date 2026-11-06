import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCity} from '../scripts/validate.mjs';
import {walkScore} from '../assessment.js';
import {filterPoints} from '../taxonomy.js';
import {validateData} from '../data-contract.js';
const data=await readCity(new URL('../../shenzhen/data/city.json',import.meta.url));
const context={...data,categoryMap:new Map(data.categories.map(c=>[c.id,c]))};
const selected=data.points.filter(p=>p.tags.includes('local-hangout'));
test('the neighbourhood filter selects the nine additions and three existing places',()=>{
  assert.equal(selected.length,12);
  assert.deepEqual(new Set(filterPoints(data.points,{group:'hangouts'},context).map(p=>p.id)),new Set(['7','11','13',...Array.from({length:9},(_,i)=>String(i+21))]));
  assert.equal(new Set(data.points.map(p=>p.localName)).size,data.points.length);
  assert.equal(filterPoints(data.points,{query:'Модные районы'},context).length,12);
});
test('every selected neighbourhood has an explained weighted assessment and a consistent duration',()=>{
  assert.deepEqual(data.city.assessment.walk.criteria.map(c=>c.weight),[.25,.25,.25,.25]);
  for(const p of selected){
    assert.equal(p.walk.duration,p.visit.duration.value,p.id);
    assert.ok(p.walk.sources.length>=2,p.id);
    for(const c of data.city.assessment.walk.criteria){assert.ok(p.walk.scores[c.id]>=1&&p.walk.scores[c.id]<=5,p.id);assert.ok(p.walk.reasons[c.id].length>30,p.id);}
    assert.equal(walkScore(p,context),Number((Object.values(p.walk.scores).reduce((a,b)=>a+b,0)/4).toFixed(1)),p.id);
  }
  assert.ok(walkScore(data.points.find(p=>p.id==='29'),context)>walkScore(data.points.find(p=>p.id==='28'),context));
});
test('missing score explanations fail the shared contract',()=>{
  const copy=structuredClone({city:data.city,trip:data.trip,categories:data.categories,points:data.points});delete copy.points.find(p=>p.walk).walk.reasons.atmosphere;
  assert.ok(validateData(copy).some(e=>e.includes('walk.reasons.atmosphere')));
});
test('distinct harbour complexes and converted map coordinates do not collapse into the same place',()=>{
  const get=id=>data.points.find(p=>p.id===id);
  assert.notDeepEqual(get('5').coord,get('25').coord);
  assert.match(get('25').visit.considerations.join(' '),/Bay Glory/);
  assert.ok(Math.abs(get('22').coord[0]-113.91376)<.0001);
  assert.ok(Math.abs(get('22').coord[1]-22.49509)<.0001);
  assert.ok(get('22').visit.arrival.coordinateSource.includes('trip.com'));
});
