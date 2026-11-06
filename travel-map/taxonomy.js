export const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replaceAll('ё', 'е');
export function inGroup(point, group, context) {
  const category = context.categoryMap.get(point.categoryId);
  return !group || category.groupId === group || context.city.taxonomy.groups.find(g => g.id === group)?.tagIds.some(tag => point.tags.includes(tag));
}
export function matchesPoint(point, filters, context) {
  if (!inGroup(point, filters.group, context)) return false;
  if (filters.category && point.categoryId !== filters.category) return false;
  if (filters.subtype && point.subtype !== filters.subtype) return false;
  if (filters.tags?.length && !filters.tags.some(tag => point.tags.includes(tag))) return false;
  const query = normalize(filters.query).trim().split(/\s+/).filter(Boolean);
  const terms = normalize([point.id, point.categoryNumber, point.name, point.localName, ...(point.aliases || []), context.categoryMap.get(point.categoryId).label, context.city.taxonomy.subtypes[point.subtype], ...point.tags.map(tag => context.city.taxonomy.tags[tag])].join(' '));
  return query.every(term => terms.includes(term));
}
export function filterPoints(points, filters, context) { return points.filter(point => matchesPoint(point, filters, context)); }
export function availableTags(points, context) {
  const counts = new Map();
  for (const point of points) for (const tag of new Set(point.tags)) counts.set(tag, (counts.get(tag) || 0) + 1);
  return [...counts].map(([id, count]) => ({id, label: context.city.taxonomy.tags[id], count}))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, context.city.locale) || a.id.localeCompare(b.id));
}
