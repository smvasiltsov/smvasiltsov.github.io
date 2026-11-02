import {categoryEmoji} from './category-icons.js';
// HTML layout avoids the different SVG emoji baselines used by Safari and Chromium.
export function emojiMarker(icon,number,mobile=false) {
 const box=document.createElement('div');
 box.setAttribute('style','position:relative;width:48px;height:42px;background:none;pointer-events:none;color-scheme:light');
 const emoji=document.createElement('span');emoji.className='place-marker-emoji';emoji.setAttribute('aria-hidden','true');
 emoji.setAttribute('style',`position:absolute;left:0;top:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;font-size:${mobile?30:24}px;line-height:1;background:none;pointer-events:none`);emoji.textContent=categoryEmoji(icon);
 const label=document.createElement('span');label.className='place-marker-number';label.setAttribute('style','position:absolute;left:31px;top:26px;font:700 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#18211e;background:none;white-space:nowrap;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff;pointer-events:none');label.textContent=number;
 box.append(emoji,label);return box;
}
