const text=value=>typeof value==='string'&&value.trim().length>0;
const web=value=>{try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}};
const date=value=>{try{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T00:00:00Z').toISOString().startsWith(value);}catch{return false;}};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const unique=values=>new Set(values).size===values.length;
export const practicalFields=['duration','bestTime','hours','cost','booking','access'];
export function validateVisit(visit,path,pointIds,ownId){
  const errors=[],check=(ok,key,message)=>{if(!ok)errors.push(`${path}.${key}: ${message}`);};
  if(!object(visit))return [path+': structured visit card required'];
  check(visit.version===1,'version','unsupported visit card version');
  check(text(visit.summary),'summary','short editorial summary required');
  check(Array.isArray(visit.activities)&&visit.activities.length>=3&&visit.activities.length<=5&&visit.activities.every(text)&&unique(visit.activities),'activities','3–5 distinct activities required');
  for(const key of practicalFields){
    const fact=visit[key];
    if(!object(fact)){errors.push(`${path}.${key}: structured fact required`);continue;}
    check(['documented','estimate','unknown','not_applicable'].includes(fact.status),key+'.status','unknown status');
    check(['unknown','not_applicable'].includes(fact.status)?fact.value===null:text(fact.value),key+'.value','text for known values, null for unknown/not applicable');
    check(Array.isArray(fact.sources)&&fact.sources.every(web)&&unique(fact.sources),key+'.sources','unique source URLs required');
    check(fact.checkedAt===null||date(fact.checkedAt),key+'.checkedAt','date or null required');
    if(fact.status==='documented'){
      check(fact.sources?.length>0,key+'.sources','documented fact needs evidence');
      check(date(fact.checkedAt),key+'.checkedAt','documented fact needs its original check date');
    }
    if(fact.status==='estimate')check(['duration','bestTime'].includes(key),key+'.status','prices, schedules and access cannot be guessed');
  }
  check(Array.isArray(visit.considerations)&&visit.considerations.every(text)&&unique(visit.considerations),'considerations','distinct practical notes required');
  if(!object(visit.arrival))errors.push(path+'.arrival: arrival object required');
  else{
    for(const key of ['address','metro','start','note'])check(visit.arrival[key]===null||text(visit.arrival[key]),'arrival.'+key,'text or null required');
    check(visit.arrival.coordinateSource===null||web(visit.arrival.coordinateSource),'arrival.coordinateSource','source URL or null required');
  }
  check(Array.isArray(visit.combineWith)&&unique(visit.combineWith)&&visit.combineWith.every(id=>pointIds.has(id)&&id!==ownId),'combineWith','distinct existing other point IDs required');
  if(!object(visit.provenance))errors.push(path+'.provenance: provenance required');
  else{
    check(Array.isArray(visit.provenance.sources)&&visit.provenance.sources.every(web)&&unique(visit.provenance.sources),'provenance.sources','unique source URLs required');
    check(visit.provenance.checkedAt===null||date(visit.provenance.checkedAt),'provenance.checkedAt','date or null required');
    check(['existing-project','source-review'].includes(visit.provenance.basis),'provenance.basis','content origin required');
    if(visit.provenance.basis==='source-review')check(visit.provenance.sources?.length>0&&date(visit.provenance.checkedAt),'provenance','source review needs sources and check date');
  }
  return errors;
}
