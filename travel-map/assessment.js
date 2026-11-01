const clamp = value => Math.max(0,Math.min(10,value));
export function meanTravel(hotel, context) {
  const step = context.city.assessment.hotel.travel.roundTo;
  return Math.round(hotel.routes.reduce((sum,r)=>sum+(r.min+r.max)/2,0)/hotel.routes.length/step)*step;
}
function areaScore(area, anchors) {
  for(let i=1;i<anchors.length;i++) { const [high,score]=anchors[i], [low,previous]=anchors[i-1]; if(area<=high)return previous+(score-previous)*(area-low)/(high-low); }
  return anchors.at(-1)[1];
}
export function hotelScore(h, context) {
  const rules=context.city.assessment.hotel, f=h.assessmentFacts, minutes=meanTravel(h,context);
  const nights=(Date.parse(context.trip.checkOut)-Date.parse(context.trip.checkIn))/86400000;
  const values={location:clamp(10-(minutes-rules.travel.bestMinutes)/rules.travel.minutesPerPoint),comfort:clamp(areaScore(f.minArea,rules.areaAnchors)+(f.panoramic?rules.panoramicBonus:0)+(f.appliances?rules.appliancesBonus:0)),value:clamp(10-(h.total/nights-rules.price.bestNightly)/rules.price.perPoint),reviews:h.reviewRating};
  const score=Object.entries(rules.weights).reduce((sum,[key,weight])=>sum+values[key]*weight,0);
  return {score:Number(score.toFixed(1)),values,opinion:f.opinion};
}
export function walkScore(point, context) {
  return Number(context.city.assessment.walk.criteria.reduce((sum,c)=>sum+point.walk.scores[c.id]*c.weight,0).toFixed(1));
}
