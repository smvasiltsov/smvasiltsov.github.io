import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cityStorage,canonicalRequest,validateManifest,isRuntimeResource} from '../offline-store.js';
import {downloadCity} from '../offline-download.js';
class MemoryCaches {
 constructor(){this.data=new Map();}
 async keys(){return [...this.data.keys()];}
 async delete(name){return this.data.delete(name);}
 async open(name){if(!this.data.has(name))this.data.set(name,new Map());const map=this.data.get(name);return {match:async key=>map.get(String(key))?.clone(),put:async(key,response)=>{map.set(String(key),response.clone());},keys:async()=>[...map.keys()]};}
}
const scope='https://example.com/beijing/',sha=data=>createHash('sha256').update(data).digest('hex');
function fixture(){const files=['/beijing/','/beijing/compare.html','/beijing/style.json','/beijing/photo.webp'].map(url=>({url,bytes:3,sha256:sha('abc')}));return {schemaVersion:1,version:'1234567890abcdef12345678',files,bytes:12,map:{style:'./style.json',bounds:[116,39,117,41],minZoom:7,maxZoom:17}};}
const options=(cacheStorage,manifest=fixture())=>({manifest,scope,cacheStorage,storage:cityStorage(scope,cacheStorage),signal:new AbortController().signal,persist:async()=>true});
test('successful download verifies every file before publishing the active snapshot',async()=>{
 const cacheStorage=new MemoryCaches(),o=options(cacheStorage);let concurrent=0,max=0;
 const active=await downloadCity({...o,fetcher:async()=>{concurrent++;max=Math.max(max,concurrent);await new Promise(resolve=>setTimeout(resolve,2));concurrent--;return new Response('abc');}});
 assert.ok(max<=4);assert.equal(active.files,4);assert.equal(active.bytes,12);assert.equal((await o.storage.read()).active.version,o.manifest.version);assert.equal((await o.storage.read()).pending,undefined);
});
test('failed/corrupt download preserves previous active city; resume skips verified files',async()=>{
 const cacheStorage=new MemoryCaches(),o=options(cacheStorage);const previous={active:{cacheName:'old',version:'old'}};await o.storage.write(previous);
 await assert.rejects(downloadCity({...o,fetcher:async url=>new Response(url.endsWith('photo.webp')?'bad':'abc')}),/Пакет на сервере изменился/);
 assert.deepEqual((await o.storage.read()).active,previous.active);
 let requests=0;await downloadCity({...o,fetcher:async()=>{requests++;return new Response('abc');}});assert.equal(requests,1);
});
test('cancel never marks an incomplete package as saved',async()=>{
 const cacheStorage=new MemoryCaches(),o=options(cacheStorage),controller=new AbortController();
 await assert.rejects(downloadCity({...o,signal:controller.signal,fetcher:async()=>{controller.abort();return new Response('abc');}}),{name:'AbortError'});
 assert.equal((await o.storage.read()).active,undefined);assert.ok((await o.storage.read()).pending);
});
test('deleting one city preserves other cities and unrelated caches',async()=>{
 const caches=new MemoryCaches(),a=cityStorage(scope,caches),b=cityStorage('https://example.com/seoul/',caches);
 await a.write({});await b.write({});await caches.open(a.packageName('test'));await caches.open('unrelated');await a.clear();
 assert.deepEqual((await caches.keys()).sort(),[b.prefix+'meta','unrelated'].sort());
});
test('deep links use the cached page without discarding their browser URL',()=>{
 assert.equal(canonicalRequest(scope+'?place=H10',scope,true),scope);
 assert.equal(canonicalRequest(scope+'index.html?hotel=H1',scope,true),scope);
 assert.equal(canonicalRequest(scope+'compare.html?sort=price',scope,true),scope+'compare.html');
 assert.equal(canonicalRequest('https://elsewhere.test/?x=1',scope,true),'https://elsewhere.test/?x=1');
});
test('manifest rejects foreign files, duplicates and wrong sizes',()=>{
 for(const mutate of [m=>m.files[0].url='https://outside.test/file',m=>m.files.push(m.files[0]),m=>m.bytes++,m=>m.files[0].sha256='invalid']){const m=fixture();mutate(m);assert.throws(()=>validateManifest(m,scope));}
});
test('published manifest covers all photos, runtime files and every place in map bounds',async()=>{
 const base=new URL('../../',import.meta.url),manifest=JSON.parse(await readFile(new URL('beijing/offline/manifest.json',base),'utf8'));
 validateManifest(manifest,scope);
 const points=JSON.parse(await readFile(new URL('beijing/data/points.json',base),'utf8')),paths=new Set(manifest.files.map(f=>new URL(f.url,scope).pathname));
 for(const point of points){const [x,y]=point.coord,[w,s,e,n]=manifest.map.bounds;assert.ok(x>=w&&x<=e&&y>=s&&y<=n,point.id);for(const photo of point.photos)for(const key of ['src','thumbnail'])if(photo[key])assert.ok(paths.has(new URL(photo[key],scope).pathname),photo[key]);}
 for(const file of manifest.files){const path=file.url==='/beijing/'?'beijing/index.html':decodeURIComponent(file.url.slice(1)),bytes=await readFile(new URL(path,base));assert.equal(bytes.length,file.bytes,path);assert.equal(sha(bytes),file.sha256,path);}
 const style=JSON.parse(await readFile(new URL('beijing/'+manifest.map.style,base),'utf8'));
 for(const source of Object.values(style.sources)){assert.ok(!source.url);assert.ok(source.tiles.every(url=>!url.includes('https:')));}assert.ok(!style.glyphs.includes('https:'));assert.ok(!style.sprite.includes('https:'));
});

test('online app updates revalidate scripts and styles without affecting map/photo caching',()=>{
 assert.equal(isRuntimeResource('https://example.com/travel-map/map-view.js',scope),true);
 assert.equal(isRuntimeResource('https://example.com/travel-map/styles/map-page.css',scope),true);
 assert.equal(isRuntimeResource(scope,scope,true),true);
 for(const url of ['https://example.com/beijing/assets/photo.jpg','https://example.com/beijing/offline/tiles/1.pbf','https://tiles.openfreemap.org/style.js','https://example.com/other/script.js'])assert.equal(isRuntimeResource(url,scope),false,url);
});
