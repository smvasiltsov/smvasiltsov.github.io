const paths = {
 history:'M2 6 8 2l6 4M3 7h10M4 7v6m4-6v6m4-6v6M2 14h12',
 architecture:'M2 14V6h5v8m0 0V2h6v12M4 8v1m5-5v1m2 2v1m-2 2v1',
 museum:'M2 5 8 2l6 3M2 6h12M4 7v6m4-6v6m4-6v6M2 14h12',
 culture:'M8 4C5 2 3 3 2 3v10c2-1 4-1 6 1 2-2 4-2 6-1V3c-2-1-4-1-6 1Zm0 0v10',
 art:'m3 12 7-9 3 2-8 8-3 1 1-2Zm6-7 3 2',
 walk:'M5 2v3m5 2v3M3 6c0-2 4-2 4 1v4c0 2-4 2-4 0Zm5 5c0-2 4-2 4 1v1c0 2-4 2-4 0Z',
 nature:'M3 13C1 6 6 3 13 2c1 7-2 12-8 10m-2 2L11 5',
 shopping:'M3 5h10l1 9H2Zm3 0V3a2 2 0 0 1 4 0v2',
 food:'M3 2v5m3-5v5M3 5h3M4.5 7v7M12 2c-4 0-4 7 0 7Zm0 7v5',
 spa:'M3 11c2 3 8 3 10 0M4 8c-3-2 3-3 0-6m4 6c-3-2 3-3 0-6m4 6c-3-2 3-3 0-6',
 hotel:'M2 13V4m0 6h12v3m0-3V6H7v4M3 6h3v3H3Z'
};
export function categoryIcon(name) {
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
 svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('width','16');svg.setAttribute('height','16');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','category-icon');
 for(const [key,value]of Object.entries({d:paths[name]||paths.history,fill:'none',stroke:'currentColor','stroke-width':'1.4','stroke-linecap':'round','stroke-linejoin':'round'}))path.setAttribute(key,value);
 svg.append(path);return svg;
}
