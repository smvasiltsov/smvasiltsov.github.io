import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCity} from '../scripts/validate.mjs';
import {validateData} from '../data-contract.js';
import {availableTags,filterPoints,matchesPoint} from '../taxonomy.js';
const data=await readCity(new URL('../../beijing/data/city.json',import.meta.url));
const ctx={...data,categoryMap:new Map(data.categories.map(c=>[c.id,c])),pointMap:new Map(data.points.map(p=>[p.id,p]))};
const empty={group:'',category:'',subtype:'',tags:[],query:''},ids=filters=>filterPoints(ctx.points,{...empty,...filters},ctx).map(p=>p.id);
test('all current places have one category, while planned categories may be empty',()=>{
 assert.equal(ids({category:'animals'}).length,2);assert.equal(ctx.categories.length,12);assert.equal(ctx.points.length,79);
 assert.equal(ids({category:'history'}).length,9);assert.equal(ids({category:'nature'}).length,8);assert.equal(ids({category:'urban'}).length,13);assert.equal(ids({category:'art'}).length,6);assert.equal(ids({category:'hotel'}).length,11);assert.equal(ids({category:'museum'}).length,7);
 assert.equal(ids({category:'architecture'}).length,9);assert.equal(ids({category:'shopping'}).length,9);assert.equal(ids({category:'culture'}).length,4);assert.equal(ids({category:'spa'}).length,1);
});
test('walk filter spans categories and preserves all existing walk assessments',()=>{
 const walks=ids({group:'walk'});for(const id of ['3','4','15','E','F','K','H'])assert.ok(walks.includes(id),id);
 assert.equal(ctx.points.filter(p=>p.walk).length,31);assert.equal(ctx.pointMap.get('K').categoryId,'art');assert.ok(ctx.pointMap.get('K').walk);
});
test('group, category, subtype, feature and multilingual search combine',()=>{
 assert.deepEqual(ids({group:'walk',category:'nature',tags:['water'],query:'Liangma'}),['E']);
 assert.deepEqual(ids({query:'亮马河'}),['E']);assert.deepEqual(ids({query:'Forbidden City'}),['1']);assert.deepEqual(ids({query:'Запретный'}),['1']);
 assert.deepEqual(ids({category:'history',subtype:'temple'}),['3','7','8']);
 assert.deepEqual(ids({category:'hotel',query:'H10'}),['H10']);assert.deepEqual(ids({query:'нет-такого-места'}),[]);
});
test('multiple quick tags match any selected tag without repeating places',()=>{
 const points=[
  {...ctx.points[0],id:'coffee',tags:['coffee']},
  {...ctx.points[0],id:'water',tags:['water']},
  {...ctx.points[0],id:'both',tags:['coffee','water']},
  {...ctx.points[0],id:'neither',tags:[]},
 ];
 const selected=tags=>filterPoints(points,{tags},ctx).map(p=>p.id);
 assert.deepEqual(selected(['coffee']),['coffee','both']);
 assert.deepEqual(selected(['coffee','water']),['coffee','water','both']);
 assert.deepEqual(selected(['water']),['water','both']);
 assert.deepEqual(selected([]),['coffee','water','both','neither']);
 const filtered=filterPoints(points,{tags:['coffee','water'],query:'both'},ctx);
 assert.deepEqual(filtered.map(p=>p.id),['both']);
 assert.deepEqual(filterPoints(points,{tags:['coffee','water'],category:'hotel'},ctx),[]);
});
test('quick tags count places once, omit unused tags and sort by popularity then label',()=>{
 const tags=availableTags([{tags:['art','coffee']},{tags:['art','water']},{tags:['coffee','coffee']},{tags:[]}],ctx);
 assert.deepEqual(tags.map(({id,count})=>({id,count})),[{id:'art',count:2},{id:'coffee',count:2},{id:'water',count:1}]);
 assert.deepEqual(availableTags([],ctx),[]);
});
test('both cities expose every used card tag with a stable city-wide count',async()=>{
 for(const city of ['beijing','shenzhen']){
  const context=await readCity(new URL(`../../${city}/data/city.json`,import.meta.url));
  const tags=availableTags(context.points,context),used=new Set(context.points.flatMap(p=>p.tags));
  assert.deepEqual(new Set(tags.map(t=>t.id)),used);
  for(let i=0;i<tags.length;i++){
   const tag=tags[i];assert.equal(tag.count,context.points.filter(p=>p.tags.includes(tag.id)).length);
   assert.equal(tag.label,context.city.taxonomy.tags[tag.id]);
   if(i)assert.ok(tags[i-1].count>=tag.count);
  }
 }
});
test('category changes do not remove a walk assessment or hotel renderer',()=>{
 const c=structuredClone({city:data.city,trip:data.trip,categories:data.categories,points:data.points});
 c.points.find(p=>p.id==='E').categoryId='art';c.points.find(p=>p.id==='H1').categoryId='history';assert.deepEqual(validateData(c),[]);
});
test('invalid taxonomy references and parent cycles are rejected',()=>{
 for(const mutate of [c=>c.points[0].subtype='bad',c=>c.points[0].tags=['bad'],c=>c.points[0].parentId='missing',c=>c.points[0].cardType='bad',c=>c.points.find(p=>p.hotel).cardType='place',c=>c.categories[0].groupId='bad',c=>{c.points[0].parentId='2';c.points[1].parentId='1';}]){
  const c=structuredClone({city:data.city,trip:data.trip,categories:data.categories,points:data.points});mutate(c);assert.ok(validateData(c).length);
 }
});

test('requested Beijing sights are searchable and the aquarium belongs to the zoo',()=>{
 for(const [query,id]of [['Пекинский зоопарк','PK6'],['Beijing Aquarium','MU4'],['红砖美术馆','MU5'],['SKP','SH10'],['City Library','CU1'],['Wangfujing','SH2']]){
  assert.ok(ids({query}).includes(id),query);
 }
 assert.equal(ctx.pointMap.get('MU4').parentId,'PK6');
 assert.deepEqual(ids({category:'animals'}),['PK6','MU4']);
 assert.match(ctx.pointMap.get('PK6').visit.cost.value,/Океанариум.*не входит/);
 assert.match(ctx.pointMap.get('MU4').visit.cost.value,/Включено.*зоопарк/);
 assert.equal(ctx.points.filter(p=>p.aliases?.includes('Beijing City Library')).length,1);
 assert.equal(ctx.points.filter(p=>p.localName==='王府井大街').length,1);
});
