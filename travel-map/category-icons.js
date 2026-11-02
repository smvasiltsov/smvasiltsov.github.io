export const categoryEmojis = Object.freeze({history:'🏯',architecture:'🏙️',museum:'🏛️',culture:'🎭',art:'🎨',walk:'🚶',nature:'🌳',shopping:'🛍️',food:'🍽️',spa:'♨️',hotel:'🛏️'});
export const categoryEmoji = name => categoryEmojis[name] || '📍';
export function categoryIcon(name) {
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),text=document.createElementNS(ns,'text');
 for(const [key,value]of Object.entries({viewBox:'0 0 20 20',width:20,height:20,'aria-hidden':'true',class:'category-icon'}))svg.setAttribute(key,value);
 text.setAttribute('x','10');text.setAttribute('y','15');text.setAttribute('text-anchor','middle');text.setAttribute('font-size','16');text.setAttribute('font-family','Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif');text.textContent=categoryEmoji(name);svg.append(text);return svg;
}
