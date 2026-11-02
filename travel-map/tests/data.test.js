import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readCity,validateFiles} from '../scripts/validate.mjs';
import {validateData} from '../data-contract.js';
import {hotelScore,walkScore} from '../assessment.js';
import {nights,money} from '../format.js';
const original=await readCity(new URL('../../beijing/data/city.json',import.meta.url));
const copy=()=>structuredClone({city:original.city,trip:original.trip,categories:original.categories,points:original.points});
test('all city data and deployed image files are valid',async()=>assert.deepEqual(await validateFiles(original),[]));
test('existing scores, points and galleries survive migration',()=>{
 assert.equal(original.points.length,40);assert.equal(original.points.reduce((n,p)=>n+p.photos.length,0),197);
 const hotels={H1:7.7,H2:7.9,H3:6.3,H4:6.9,H5:7.5,H6:7.2,H7:6.1,H8:7.1,H9:8,H10:8.2,H11:6.7};
 for(const [id,score]of Object.entries(hotels))assert.equal(hotelScore(original.points.find(p=>p.id===id).hotel,original).score,score,id);
 const walks={A:4.1,B:4.6,C:4.5,D:4.3,E:4.3,F:4.4,G:4.1,H:4.3,I:3.9,J:3.6,K:3.5,L:3.4,M:3.4};
 for(const [id,score]of Object.entries(walks))assert.equal(walkScore(original.points.find(p=>p.id===id),original),score,id);
});
const cases=[
 ['duplicate point',c=>c.points.push(structuredClone(c.points[0]))],
 ['unknown category',c=>c.points[0].categoryId='missing'],
 ['invalid coordinates',c=>c.points[0].coord=[39,116]],
 ['missing photo attribution',c=>delete c.points.find(p=>p.cardType==='place'&&p.photos.length).photos[0].license],
 ['wrong photo collection',c=>c.points[0].photos={}],
 ['null point',c=>c.points.push(null)],
 ['null category',c=>c.categories.push(null)],
 ['invalid dates',c=>c.trip.checkOut=c.trip.checkIn],
 ['impossible date',c=>c.trip.checkIn='2026-02-30'],
 ['weights',c=>c.city.assessment.hotel.weights.location=1],
 ['walk score',c=>c.points.find(p=>p.walk).walk.scores.fashion=6],
 ['missing route',c=>c.points.find(p=>p.hotel).hotel.routes.pop()],
 ['route range',c=>c.points.find(p=>p.hotel).hotel.routes[0].min=999],
 ['rating',c=>c.points.find(p=>p.hotel).hotel.reviewRating=11],
 ['mismatched price currency',c=>c.trip.currency='USD']
];
for(const [name,mutate]of cases)test('rejects '+name,()=>{const c=copy();mutate(c);assert.ok(validateData(c).length);});
test('new generic category and point require data changes only',()=>{
 const c=copy();c.categories.push({id:'market',label:'Рынок',listLabel:'Рынки',groupId:'shop',icon:'shopping'});
 c.points.push({id:'F1',categoryId:'market',name:'Рынок',description:'Описание',coord:[116.4,39.9],photos:[],cardType:'place',subtype:'historic-street',tags:['shopping'],aliases:['Market'],parentId:null});assert.deepEqual(validateData(c),[]);
});
test('trip length, currency and score rules come from configuration',()=>{
 const c=copy();c.trip.checkOut='2026-11-10';c.trip.currency='USD';c.city.assessment.hotel.price.currency='USD';
 assert.equal(nights(c.trip),3);assert.match(money(10,c),/\$/);assert.deepEqual(validateData(c),[]);
 const h=c.points.find(p=>p.hotel).hotel,old=hotelScore(h,c).score;c.city.assessment.hotel.weights={location:0,comfort:0,value:0,reviews:1};assert.equal(hotelScore(h,c).score,h.reviewRating);assert.notEqual(old,h.reviewRating);
});
test('entry page contains only the online map and shared module',async()=>{
 const html=await readFile(new URL('../../beijing/index.html',import.meta.url),'utf8');assert.match(html,/travel-map\/map-page.js/);
 for(const removed of ['Перетаскивайте','overview-map','saved-map','d3.v','saved-roads'])assert.ok(!html.includes(removed),removed);
});
