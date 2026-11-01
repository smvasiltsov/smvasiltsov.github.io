import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {resolve,relative,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readCity,validateFiles} from './validate.mjs';
export async function buildOffline(configPath) {
 const config=resolve(configPath),cityRoot=dirname(dirname(config)),siteRoot=dirname(cityRoot),context=await readCity(config);
 const errors=await validateFiles(context);if(errors.length)throw new Error(errors.join('\n'));
 const rootUrl='/'+relative(siteRoot,cityRoot).replaceAll('\\','/')+'/',folder=context.city.offline?.mapFolder;
 if(!folder)throw new Error('city.offline.mapFolder is required');
 const snapshot=JSON.parse(await readFile(join(cityRoot,folder,'snapshot.json'),'utf8'));
 const entries=new Map(),hash=data=>createHash('sha256').update(data).digest('hex');
 async function add(path,url){const data=await readFile(path);url ||= '/'+relative(siteRoot,path).replaceAll('\\','/').split('/').map(encodeURIComponent).join('/');entries.set(url,{url,bytes:data.length,sha256:hash(data)});}
 await add(join(cityRoot,'index.html'),rootUrl);await add(join(cityRoot,'index.html'));await add(join(cityRoot,'compare.html'));await add(join(cityRoot,'sw.js'));
 for(const file of [config,...['trip','points','categories'].map(key=>fileURLToPath(new URL(context.city[key],pathToFileURL(config))))])await add(file);
 const shared=join(siteRoot,'travel-map');
 for(const file of await readdir(shared))if(file.endsWith('.js'))await add(join(shared,file));
 async function directory(path){for(const entry of await readdir(path,{withFileTypes:true})){const p=join(path,entry.name);if(entry.isDirectory())await directory(p);else await add(p);}}
 await add(join(cityRoot,'app.webmanifest'));await directory(join(cityRoot,'app-icons'));
 await directory(join(shared,'styles'));await directory(join(shared,'vendor'));await directory(join(cityRoot,folder));
 const assetBase=new URL(context.city.assetBase,pathToFileURL(config));
 for(const point of context.points)for(const photo of point.photos)for(const key of ['src','thumbnail'])if(photo[key])await add(fileURLToPath(new URL(photo[key],assetBase)));
 const files=[...entries.values()].sort((a,b)=>a.url.localeCompare(b.url));
 const manifest={schemaVersion:1,city:context.city.id,version:hash(JSON.stringify(files)).slice(0,24),createdAt:new Date().toISOString(),bytes:files.reduce((sum,f)=>sum+f.bytes,0),map:{style:'./'+folder+'/style.json',bounds:snapshot.bounds,minZoom:snapshot.minZoom,maxZoom:snapshot.displayMaxZoom,tileMaxZoom:snapshot.tileMaxZoom},files};
 await writeFile(join(cityRoot,'offline/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(`${context.city.name}: ${files.length} offline files, ${(manifest.bytes/1e6).toFixed(1)} MB, version ${manifest.version}`);return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await buildOffline(process.argv[2]||'../beijing/data/city.json');
