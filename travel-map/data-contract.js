import {nights} from './format.js';
const text = x => typeof x === 'string' && x.trim().length > 0;
const finite = x => typeof x === 'number' && Number.isFinite(x);
const validDate = x => { try { return /^\d{4}-\d{2}-\d{2}$/.test(x) && new Date(x+'T00:00:00Z').toISOString().startsWith(x); } catch { return false; } };
export function validateData({city, trip, categories, points} = {}) {
  const errors = [], check = (ok, path, message) => { if (!ok) errors.push(`${path}: ${message}`); };
  if (!city || !trip || !Array.isArray(categories) || !Array.isArray(points)) return ['Expected city, trip, categories[] and points[]'];
  check(city.schemaVersion === 1, 'city.schemaVersion', 'unsupported version');
  for (const key of ['id','name','locale','timezone','assetBase','points','categories','trip']) check(text(city[key]), `city.${key}`, 'required string');
  try { new Intl.DateTimeFormat(city.locale, {timeZone: city.timezone}); } catch { errors.push('city: invalid locale/timezone'); }
  check(text(city.pages?.map) && text(city.pages?.compare), 'city.pages', 'map and compare URLs required');
  check(text(city.map?.style), 'city.map.style', 'required');
  const coords = (value, path) => check(Array.isArray(value) && value.length === 2 && finite(value[0]) && finite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 85.051129, path, 'expected WGS84 [longitude, latitude], Web Mercator range');
  coords(city.map?.defaultView?.center, 'city.map.defaultView.center');
  for (const [key, value] of Object.entries({defaultZoom: city.map?.defaultView?.zoom, selectedZoom: city.map?.selectedZoom, maxFitZoom: city.map?.maxFitZoom})) check(finite(value) && value >= 0 && value <= 22, 'city.map.'+key, 'zoom must be 0–22');
  check(['amap','osm'].includes(city.navigation?.provider), 'city.navigation.provider', 'supported: amap or osm');
  check(validDate(trip.checkIn) && validDate(trip.checkOut) && nights(trip) > 0, 'trip.dates', 'valid check-in before check-out required');
  check(Number.isInteger(trip.adults) && trip.adults > 0 && Number.isInteger(trip.rooms) && trip.rooms > 0, 'trip.guests', 'positive adults and rooms');
  check(/^[A-Z]{3}$/.test(trip.currency), 'trip.currency', 'ISO currency required');
  check(validDate(trip.pricesCheckedAt), 'trip.pricesCheckedAt', 'valid date required');
  const categoryMap = new Map();
  for (const [i, category] of categories.entries()) {
    const path = `categories[${i}]`;
    if (!category || typeof category !== "object") { errors.push(path+": object required"); continue; }
    for (const key of ['id','label','listLabel','legend']) check(text(category[key]), `${path}.${key}`, 'required');
    check(!categoryMap.has(category.id), `${path}.id`, 'duplicate category'); categoryMap.set(category.id, category);
    for (const key of ['color','darkColor']) check(/^#[\da-f]{6}$/i.test(category[key]), `${path}.${key}`, 'six-digit hex color required');
    check(['circle','square','diamond'].includes(category.shape), `${path}.shape`, 'unknown marker shape');
    check(['place','hotel','walk'].includes(category.card), `${path}.card`, 'unknown card renderer');
  }
  const pointMap = new Map();
  for (const [i, point] of points.entries()) {
    const path = `points[${i}]`;
    if (!point || typeof point !== "object") { errors.push(path+": object required"); continue; }
    check(text(point.id) && !pointMap.has(point.id), path+'.id', 'missing or duplicate ID'); pointMap.set(point.id, point);
    check(categoryMap.has(point.categoryId), path+'.categoryId', 'unknown category');
    check(text(point.name) && text(point.description), path, 'name and description required'); coords(point.coord, path+'.coord');
    check(Array.isArray(point.photos), path+'.photos', 'array required (may be empty)');
    for (const [n, photo] of (Array.isArray(point.photos) ? point.photos : []).entries()) {
      const pp = `${path}.photos[${n}]`;
      if (!photo || typeof photo !== "object") { errors.push(pp+": object required"); continue; }
      check(text(photo.src), pp+'.src', 'image path required');
      check(finite(photo.width) && photo.width > 0 && finite(photo.height) && photo.height > 0, pp, 'positive image dimensions required');
      if (categoryMap.get(point.categoryId)?.card === 'hotel') check(text(photo.credit) && text(photo.source), pp, 'hotel source and credit required');
      else for (const key of ['author','license','licenseUrl','sourcePage']) check(text(photo[key]), pp+'.'+key, 'photo attribution required');
    }
  }
  const destinationIds = (city.hotelDestinations || []).map(d => d.pointId);
  check(new Set(destinationIds).size === destinationIds.length, 'city.hotelDestinations', 'duplicate destinations');
  for (const d of city.hotelDestinations || []) check(pointMap.has(d.pointId) && text(d.label), 'city.hotelDestinations', 'unknown destination or missing label');
  const hotelRules = city.assessment?.hotel, walkRules = city.assessment?.walk;
  const weights = (values, path) => check(values.length > 0 && values.every(x => finite(x) && x >= 0) && Math.abs(values.reduce((a,b)=>a+b,0)-1) < 1e-8, path, 'weights must be non-negative and sum to 1');
  if (categories.some(c=>c?.card === 'hotel')) {
    check(hotelRules && ['location','comfort','value','reviews'].every(k=>finite(hotelRules.weights?.[k])), 'assessment.hotel', 'four hotel weights required');
    weights(Object.values(hotelRules?.weights || {}), 'assessment.hotel.weights');
    check(hotelRules?.price?.currency === trip.currency, 'assessment.hotel.price.currency', 'must match trip currency');
    for (const value of [hotelRules?.travel?.roundTo,hotelRules?.travel?.minutesPerPoint,hotelRules?.price?.perPoint]) check(finite(value) && value > 0, 'assessment.hotel', 'positive steps required');
    for (const value of [hotelRules?.travel?.bestMinutes, hotelRules?.price?.bestNightly, hotelRules?.panoramicBonus, hotelRules?.appliancesBonus, hotelRules?.lowReviewCount]) check(finite(value) && value >= 0, 'assessment.hotel', 'non-negative numeric thresholds required');
    check(destinationIds.length > 0, 'city.hotelDestinations', 'hotel comparison destinations required');
    const anchors = hotelRules?.areaAnchors;
    check(Array.isArray(anchors) && anchors.length > 1 && anchors.every((v,i)=>Array.isArray(v)&&v.length===2&&v.every(finite)&&v[0]>=0&&v[1]>=0&&v[1]<=10&&(!i||v[0]>anchors[i-1][0])), 'assessment.hotel.areaAnchors', 'ascending area anchors required');
  }
  if (categories.some(c=>c?.card === 'walk')) {
    check(Array.isArray(walkRules?.criteria), 'assessment.walk.criteria', 'required');
    for (const criterion of walkRules?.criteria || []) for (const key of ['id','label','description']) check(text(criterion[key]), 'assessment.walk.criteria.'+key, 'required string');
    weights((walkRules?.criteria || []).map(c=>c.weight), 'assessment.walk.weights');
    check(new Set((walkRules?.criteria || []).map(c=>c.id)).size === walkRules?.criteria?.length, 'assessment.walk.criteria', 'duplicate criterion');
  }
  for (const point of points) {
    if (!point || typeof point !== "object") continue;
    const path = `point ${point.id}`, card = categoryMap.get(point.categoryId)?.card;
    if (card === 'walk') {
      check(!!point.walk, path+'.walk', 'walk data required');
      check(validDate(point.walk?.checked), path+'.walk.checked', 'date required');
      for (const c of walkRules?.criteria || []) { const value = point.walk?.scores?.[c.id]; check(finite(value) && value >= 1 && value <= 5, path+'.walk.scores.'+c.id, 'score must be 1–5'); check(text(point.walk?.reasons?.[c.id]), path+'.walk.reasons.'+c.id, 'explanation required'); }
    }
    if (card === 'hotel') {
      const h = point.hotel;
      if (!h) { errors.push(path+': hotel data required'); continue; }
      check(finite(h.total) && h.total > 0 && finite(h.assessmentFacts?.minArea) && h.assessmentFacts.minArea > 0, path+'.hotel', 'positive price and area required');
      check(finite(h.reviewRating) && h.reviewRating >= 0 && h.reviewRating <= 10 && Number.isInteger(h.reviewCount) && h.reviewCount >= 0, path+'.hotel.reviews', 'invalid rating/count');
      for (const key of ['room','area','bed','window','verdict','rateDetails']) check(text(h[key]), path+'.hotel.'+key, 'required');
      for (const key of ['pros','cons']) check(Array.isArray(h[key]) && h[key].every(text), path+'.hotel.'+key, 'list required');
      const routes = Array.isArray(h.routes) ? h.routes : [];
      check(Array.isArray(h.routes), path+".hotel.routes", "array required");
      check(routes.length === destinationIds.length && new Set(routes.map(r=>r.destinationId)).size === routes.length && routes.every(r=>destinationIds.includes(r.destinationId)), path+'.hotel.routes', 'one route per comparison destination required');
      for (const r of [...routes,...(Array.isArray(h.excursions) ? h.excursions : [])]) { check(pointMap.has(r.destinationId), path+'.hotel.routes', 'unknown destination'); check(finite(r.min) && finite(r.max) && r.min >= 0 && r.max >= r.min, path+'.hotel.routes', 'invalid minute range'); }
      check(Number.isInteger(h.breakfastCount) && h.breakfastCount >= 0, path+'.hotel.breakfastCount', 'non-negative count required');
    }
  }
  return errors;
}
export function assertData(context) { const errors = validateData(context); if (errors.length) throw new Error(errors.join('\n')); return context; }
