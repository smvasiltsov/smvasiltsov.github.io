import {readFile,access} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {validateData} from '../data-contract.js';
export async function readCity(path) {
 const url=path instanceof URL?path:pathToFileURL(resolve(path));
 const read=async path=>JSON.parse(await readFile(path,'utf8'));
 const city=await read(url);
 const [trip,categories,points]=await Promise.all([city.trip,city.categories,city.points].map(p=>read(new URL(p,url))));
 return {city,trip,categories,points,url};
}
export async function validateFiles(context){
 const errors=validateData(context);if(errors.length)return errors;
 const {city,points,url}=context,base=new URL(city.assetBase,url);
 const files=[...Object.values(city.pages).map(p=>new URL(p,url))];
 for(const p of points)for(const photo of p.photos)for(const key of ['src','thumbnail'])if(photo[key])files.push(new URL(photo[key],base));
 for(const file of new Set(files.map(x=>x.href))) {
  if(!file.startsWith('file:')){errors.push(`Expected a local, deployable asset: ${file}`);continue;}
  try {let path=fileURLToPath(file);if(path.endsWith('/'))path+='index.html';await access(path);}catch{errors.push(`Missing local file: ${file}`);}
 }
 return errors;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const paths=process.argv.slice(2);if(!paths.length){console.error('Usage: node scripts/validate.mjs <city.json> [...]');process.exitCode=1;}
 for(const path of paths)try{const context=await readCity(path),errors=await validateFiles(context);if(errors.length){console.error(path+'\n'+errors.join('\n'));process.exitCode=1;}else console.log(`${context.city.name}: ${context.points.length} points, ${context.points.reduce((n,p)=>n+p.photos.length,0)} photos, schema and local files valid`);}catch(error){console.error(`${path}: ${error.message}`);process.exitCode=1;}
}
