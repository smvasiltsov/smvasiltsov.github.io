export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function link(text, href, className, external = false) {
  const node = el('a', text, className); node.href = href;
  if (external) { node.target = '_blank'; node.rel = 'noopener'; }
  return node;
}
export function list(items, className) {
  const node = el('ul', undefined, className);
  for (const item of items) node.append(el('li', item));
  return node;
}
export const $ = id => document.getElementById(id);
