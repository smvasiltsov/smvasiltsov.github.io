// Read the explicit offline package first; fetch only missing map resources online.
export function mapResourceLoader({cache,baseUrl,tiles,glyphs,fetcher=fetch,onNetwork=()=>{}}) {
 return async (request,abortController)=>{
  const path=new URL(request.url).pathname.slice(1);let remote;
  const tile=/^tiles\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(path),font=/^fonts\/([^/]+)\/(\d+-\d+\.pbf)$/.exec(path);
  if(tile)remote=tiles.replace('{z}',tile[1]).replace('{x}',tile[2]).replace('{y}',tile[3]);
  else if(font)remote=glyphs.replace('{fontstack}',font[1]).replace('{range}',font[2].replace('.pbf',''));
  else throw new Error('Unknown map resource');
  const cached=await cache.match(new URL(path,baseUrl).href);
  if(cached?.ok)return {data:await cached.arrayBuffer()};
  try {const response=await fetcher(remote,{signal:abortController?.signal});if(!response.ok)throw new Error('Map resource HTTP '+response.status);const data=await response.arrayBuffer();onNetwork(true);return {data};}
  catch(error){if(error.name!=='AbortError')onNetwork(false);throw error;}
 };
}
export function hybridStyle(offline,cityId) {
 const style=structuredClone(offline.style),source=style.sources.openmaptiles;
 delete source.bounds;source.minzoom=0;source.tiles=[`travelmap://${cityId}/tiles/{z}/{x}/{y}.pbf`];
 style.glyphs=`travelmap://${cityId}/fonts/{fontstack}/{range}.pbf`;
 return style;
}
