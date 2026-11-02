import {categoryEmoji} from './category-icons.js';
// Number the complete collection once, before filters or sorting are applied.
export function withCategoryNumbers(points) {
 const counts=new Map();return points.map(point=>{const categoryNumber=(counts.get(point.categoryId)||0)+1;counts.set(point.categoryId,categoryNumber);return {...point,categoryNumber};});
}
export function pointBadge(point,context) {return categoryEmoji(context.categoryMap.get(point.categoryId).icon)+' '+point.categoryNumber;}
