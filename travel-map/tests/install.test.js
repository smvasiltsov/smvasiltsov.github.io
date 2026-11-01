import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {InstallPrompt,installedDisplay} from '../install-prompt.js';
const base=new URL('../../beijing/',import.meta.url);
test('both city pages advertise the same scoped, standalone app',async()=>{
 const manifest=JSON.parse(await readFile(new URL('app.webmanifest',base),'utf8'));
 assert.equal(manifest.id,'/beijing/');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');assert.ok(manifest.name);assert.ok(manifest.short_name);assert.equal(manifest.prefer_related_applications,false);
 for(const file of ['index.html','compare.html']){const html=await readFile(new URL(file,base),'utf8');assert.match(html,/rel="manifest" href="\.\/app.webmanifest"/);assert.match(html,/apple-touch-icon/);assert.match(html,/viewport-fit=cover/);}
 const icons=manifest.icons;assert.ok(icons.some(i=>i.sizes==='192x192'&&i.purpose==='any'));assert.ok(icons.some(i=>i.sizes==='512x512'&&i.purpose==='any'));assert.ok(icons.some(i=>i.purpose==='maskable'));
 for(const icon of [...icons,{src:'./app-icons/apple-touch-icon.png',sizes:'180x180'}]){const png=await readFile(new URL(icon.src,base));assert.equal(png.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
test('app identity and icons are included in the verified offline city',async()=>{
 const manifest=JSON.parse(await readFile(new URL('offline/manifest.json',base),'utf8')),paths=new Set(manifest.files.map(f=>f.url));
 for(const path of ['/beijing/app.webmanifest','/beijing/app-icons/icon-192.png','/beijing/app-icons/icon-512.png','/beijing/app-icons/maskable-512.png','/beijing/app-icons/apple-touch-icon.png','/travel-map/install-ui.js','/travel-map/install-prompt.js'])assert.ok(paths.has(path),path);
});
test('native prompt requires a browser offer, records acceptance, and is single-use',async()=>{
 let prompts=0,prevented=0;const manager=new InstallPrompt();assert.equal(await manager.request(),null);
 manager.capture({preventDefault:()=>prevented++,prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'accepted'})});
 assert.equal(await manager.request(),'accepted');assert.equal(await manager.request(),null);assert.equal(prompts,1);assert.equal(prevented,1);
});
test('dismissal and prompt failure clear the offer and allow a later browser offer',async()=>{
 const manager=new InstallPrompt();manager.capture({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});assert.equal(await manager.request(),'dismissed');assert.equal(manager.offer,null);
 manager.capture({preventDefault(){},prompt:async()=>{throw new Error('unavailable');}});await assert.rejects(manager.request(),/unavailable/);assert.equal(manager.offer,null);
});
test('installed display detection includes iOS and never assumes a browser tab is installed',()=>{
 assert.equal(installedDisplay({}),false);for(const key of ['standalone','fullscreen','minimalUi','iosStandalone'])assert.equal(installedDisplay({[key]:true}),true);
});
