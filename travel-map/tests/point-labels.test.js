import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCity} from '../scripts/validate.mjs';
import {withCategoryNumbers,pointBadge} from '../point-labels.js';
import {categoryEmojis} from '../category-icons.js';
import {filterPoints} from '../taxonomy.js';
const data=await readCity(new URL('../../beijing/data/city.json',import.meta.url));
const points=withCategoryNumbers(data.points),context={...data,points,categoryMap:new Map(data.categories.map(c=>[c.id,c]))};
test('each category has contiguous numeric labels, with no letter codes',()=>{
 for(const category of data.categories){const members=points.filter(p=>p.categoryId===category.id);assert.deepEqual(members.map(p=>p.categoryNumber),members.map((_,i)=>i+1));assert.ok(categoryEmojis[category.icon]);for(const p of members)assert.match(pointBadge(p,context),/ \d+$/u);}
 assert.equal(points.find(p=>p.id==='H10').categoryNumber,10);assert.equal(points.find(p=>p.id==='AR1').categoryNumber,1);
 assert.deepEqual(points.map(p=>p.id),data.points.map(p=>p.id));assert.ok(data.points.every(p=>!Object.hasOwn(p,'categoryNumber')));
});
test('filtering, selection and sorting preserve the complete-category number',()=>{
 const selected=filterPoints(points,{query:'CCTV'},context)[0];assert.equal(selected.categoryNumber,4);assert.equal(pointBadge(selected,context),'🏙️ 4');
 const hotels=points.filter(p=>p.hotel).sort((a,b)=>b.hotel.total-a.hotel.total);assert.equal(hotels.find(p=>p.id==='H10').categoryNumber,10);
});
