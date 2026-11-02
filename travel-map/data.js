import {withCategoryNumbers} from './point-labels.js';
import {assertData} from './data-contract.js';
export async function loadCity(configUrl = document.querySelector('meta[name="travel-city"]').content) {
  const cityUrl = new URL(configUrl, location.href);
  const read = async url => { const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`); return response.json(); };
  const city = await read(cityUrl);
  const [trip, categories, rawPoints] = await Promise.all([city.trip,city.categories,city.points].map(path=>read(new URL(path,cityUrl))));
  assertData({city,trip,categories,points:rawPoints});
  const points=withCategoryNumbers(rawPoints);
  const resolvedCategories = categories.map(c=>({...city.taxonomy.groups.find(g=>g.id===c.groupId),...c}));
  const assetBase = new URL(city.assetBase, cityUrl);
  for (const p of points) for (const photo of p.photos) { photo.src = new URL(photo.src,assetBase).href; if (photo.thumbnail) photo.thumbnail = new URL(photo.thumbnail,assetBase).href; }
  return {city,trip,categories:resolvedCategories,points,categoryMap:new Map(resolvedCategories.map(c=>[c.id,c])),pointMap:new Map(points.map(p=>[p.id,p])),pages:{map:new URL(city.pages.map,cityUrl).href,compare:new URL(city.pages.compare,cityUrl).href}};
}
export function hotels(context) { return context.points.filter(p=>p.cardType === 'hotel'); }
