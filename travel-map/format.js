export function nights(trip) {
  return (Date.parse(trip.checkOut + 'T00:00:00Z') - Date.parse(trip.checkIn + 'T00:00:00Z')) / 86400000;
}
export function number(value, locale = 'ru-RU', decimals = 1) {
  return new Intl.NumberFormat(locale, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(value);
}
export function money(value, context) {
  return new Intl.NumberFormat(context.city.locale, {style: 'currency', currency: context.trip.currency, maximumFractionDigits: 0}).format(value);
}
export function date(value, locale = 'ru-RU') {
  return new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(value + 'T00:00:00Z'));
}
export function dateRange(trip, locale = 'ru-RU') {
  return new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).formatRange(new Date(trip.checkIn+'T00:00:00Z'), new Date(trip.checkOut+'T00:00:00Z'));
}
export function tripLabel(context) { return `${dateRange(context.trip, context.city.locale)} · ${context.trip.adults} ${plural(context.trip.adults,['взрослый','взрослых','взрослых'])}`; }
export function plural(count, forms) {
  const mod100 = count % 100, mod10 = count % 10;
  return forms[mod100 >= 11 && mod100 <= 14 ? 2 : mod10 === 1 ? 0 : mod10 >= 2 && mod10 <= 4 ? 1 : 2];
}
export function pointUrl(point, context) { const url = new URL(context.pages.map); url.searchParams.set('place', point.id); return url.href; }
export function localName(point) { return point.localName || point.name; }
export function stayLabel(context) { const count=nights(context.trip);return `${count} ${plural(count,['ночь','ночи','ночей'])}`; }
