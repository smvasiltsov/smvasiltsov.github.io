import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readCity,validateFiles} from '../scripts/validate.mjs';
import {cities} from '../cities.js';
import {cityStorage,validateManifest} from '../offline-store.js';

const base=new URL('../../',import.meta.url);
test('city registry resolves independent, deployable pages and data',async()=>{
  assert.deepEqual(cities.map(c=>c.id),['beijing','shenzhen']);
  for(const item of cities){
    const context=await readCity(new URL(`${item.id}/data/city.json`,base));
    assert.equal(context.city.id,item.id);assert.equal(context.city.name,item.name);
    assert.equal(new URL(context.city.pages.map,context.url).href,item.url);
    assert.deepEqual(await validateFiles(context),[]);
    const html=await readFile(new URL('index.html',item.url),'utf8');
    assert.ok(html.includes('content="./data/city.json"'));
    const app=JSON.parse(await readFile(new URL('app.webmanifest',item.url),'utf8'));
    assert.equal(app.id,`/${item.id}/`);assert.equal(app.scope,'./');
  }
});
test('Shenzhen preserves the original 20 places and includes the neighbourhood selection',async()=>{
  const {points,trip}=await readCity(new URL('shenzhen/data/city.json',base));
  assert.deepEqual(points.slice(0,20).map(p=>p.id),Array.from({length:20},(_,i)=>String(i+1)));
  assert.equal(points.length,29);
  assert.ok(points.slice(0,20).every(p=>p.photos.length));
  assert.ok(points.every(p=>p.cardType==='place'&&p.localName));
  assert.equal(trip.checkIn,undefined);
  for(const p of points){
    assert.equal(p.visit.provenance.basis,'source-review');
    for(const key of ['duration','bestTime','hours','cost','booking','access']){
      const fact=p.visit[key];assert.ok(fact.value||fact.note,p.id+': '+key);
      if(fact.status==='documented')assert.ok(fact.sources.length);
    }
  }
  const science=points.find(p=>p.id==='10');assert.ok(science.coord[1]>22.7,'new Guangming museum');
  const town=points.find(p=>p.id==='14');assert.ok(town.coord[1]>22.655,'Gankeng town, not metro station');
});
test('Shenzhen download contains self-hosted map data and every card and photograph',async()=>{
  const scope='https://example.com/shenzhen/';
  const manifest=JSON.parse(await readFile(new URL('shenzhen/offline/manifest.json',base),'utf8'));
  validateManifest(manifest,scope);
  const {points}=await readCity(new URL('shenzhen/data/city.json',base));
  const paths=new Set(manifest.files.map(f=>f.url));
  for(const point of points){
    const [lon,lat]=point.coord,[w,s,e,n]=manifest.map.bounds;assert.ok(lon>=w&&lon<=e&&lat>=s&&lat<=n,point.id);
    for(const photo of point.photos)for(const key of ['src','thumbnail'])assert.ok(paths.has('/shenzhen/'+photo[key]),photo[key]);
  }
  for(const file of manifest.files){
    const path=file.url==='/shenzhen/'?'shenzhen/index.html':decodeURIComponent(file.url.slice(1));
    const bytes=await readFile(new URL(path,base));assert.equal(bytes.length,file.bytes,path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,path);
  }
  for(const module of ['cities.js','city-switcher.js'])assert.ok(paths.has('/travel-map/'+module));
  const style=JSON.parse(await readFile(new URL('shenzhen/'+manifest.map.style,base),'utf8'));
  for(const source of Object.values(style.sources)){assert.ok(!source.url);assert.ok(source.tiles.every(url=>!url.includes('https:')));}
  assert.ok(!style.glyphs.includes('https:'));assert.ok(!style.sprite.includes('https:'));
});
test('saving and deleting a city cannot remove the other city package',async()=>{
  const data=new Map(),cacheStorage={
    keys:async()=>[...data.keys()],delete:async name=>data.delete(name),
    open:async name=>{if(!data.has(name))data.set(name,new Map());const cache=data.get(name);return {put:async(url,response)=>cache.set(url,response),match:async url=>cache.get(url)?.clone()};},
  };
  const beijing=cityStorage('https://example.com/beijing/',cacheStorage),shenzhen=cityStorage('https://example.com/shenzhen/',cacheStorage);
  await beijing.write({active:{version:'beijing'}});await shenzhen.write({active:{version:'shenzhen'}});
  await shenzhen.clear();assert.deepEqual(await shenzhen.read(),{});assert.equal((await beijing.read()).active.version,'beijing');
});
