"""Build a bounded, self-hosted OpenFreeMap snapshot. No more than four requests.
Provider policy: https://openfreemap.org/tos/ (checked 2026-11-02).
Run: python3 travel-map/scripts/prepare-offline-map.py beijing/data/city.json
"""
import concurrent.futures, datetime, hashlib, json, math, pathlib, sys, threading, time, urllib.request
from urllib.parse import quote
city_path=pathlib.Path(sys.argv[1]).resolve(); root=city_path.parent.parent
city=json.loads(city_path.read_text());config=city['offline']
out=root/config['mapFolder']; out.mkdir(parents=True,exist_ok=True)
bounds=config['bounds']; minimum=config['minZoom']; maximum=config['tileMaxZoom']
ua=f'TravelMap/1.0 (+https://smvasiltsov.github.io/{city["id"]}/)'
lock=threading.Lock(); total=sum(p.stat().st_size for p in out.rglob('*') if p.is_file()); limit=50_000_000

def download(url,path):
 global total
 path=out/path
 if path.exists():return path.read_bytes()
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':ua}),timeout=30) as response: data=response.read()
   with lock:
    if total+len(data)>limit:raise RuntimeError('Provider download budget exceeded; reduce region/detail')
    total+=len(data)
   path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);return data
  except Exception:
   if attempt==2:
    print("Failed:",url,flush=True);raise
   time.sleep(attempt+1)

def xy(lon,lat,z):return int((lon+180)/360*2**z),int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
style=json.loads(download('https://tiles.openfreemap.org/styles/liberty',pathlib.Path('upstream-style.json')))
tilejson=json.loads(download('https://tiles.openfreemap.org/planet',pathlib.Path('upstream-tilejson.json')))
jobs=[]
for z in range(minimum,maximum+1):
 left,top=xy(bounds[0],bounds[3],z);right,bottom=xy(bounds[2],bounds[1],z)
 for x in range(left,right+1):
  for y in range(top,bottom+1): jobs.append((tilejson['tiles'][0].replace('{z}',str(z)).replace('{x}',str(x)).replace('{y}',str(y)),pathlib.Path(f'tiles/{z}/{x}/{y}.pbf')))
assert len(jobs)<=3000
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for i,data in enumerate(pool.map(lambda job:download(*job),jobs)):
  if i%100==0:print(f'Tiles {i+1}/{len(jobs)}; {total/1e6:.1f} MB',flush=True)
# Read protobuf values to include every glyph range present in this snapshot.
def varint(data,pos):
 value=shift=0
 while True:
  b=data[pos];pos+=1;value|=(b&127)<<shift
  if b<128:return value,pos
  shift+=7

def fields(data):
 pos=0
 while pos<len(data):
  tag,pos=varint(data,pos);wire=tag&7
  if wire==0:value,pos=varint(data,pos)
  elif wire==2:size,pos=varint(data,pos);value=data[pos:pos+size];pos+=size
  elif wire==1:value=data[pos:pos+8];pos+=8
  elif wire==5:value=data[pos:pos+4];pos+=4
  else:raise ValueError('Unknown protobuf wire')
  yield tag>>3,wire,value
ranges={0,256,512,768,1024,8192,8448,64256,65024,65280}
name_keys={'name','name_en','name:latin','name:nonlatin','ref'}
for _,path in jobs:
 for tag,wire,layer in fields((out/path).read_bytes()):
  if tag!=3 or wire!=2:continue
  values=[]; keys=[]; features=[]
  for field,kind,value in fields(layer):
   if kind!=2:continue
   if field==2:features.append(value)
   if field==3:keys.append(value.decode('utf8'))
   if field==4:values.append(next((v.decode('utf8') for k,t,v in fields(value) if k==1 and t==2),''))
  for feature in features:
   for key,typ,packed in fields(feature):
    if key!=2 or typ!=2:continue
    indexes=[];pos=0
    while pos<len(packed):v,pos=varint(packed,pos);indexes.append(v)
    for k,v in zip(indexes[::2],indexes[1::2]):
     if keys[k] in name_keys:
      for char in values[v]:
       if ord(char)<=65535:ranges.add(ord(char)//256*256)
# One complete font keeps CJK labels self-contained and the package compact.
fonts=['Noto Sans Regular']
for layer in style['layers']:
 if 'text-font' in layer.get('layout',{}):layer['layout']['text-font']=fonts
glyph_jobs=[(style['glyphs'].replace('{fontstack}',quote(font)).replace('{range}',f'{start}-{start+255}'),pathlib.Path(f'fonts/{font}/{start}-{start+255}.pbf')) for font in fonts for start in sorted(ranges)]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(lambda job:download(*job),glyph_jobs))
for suffix in ['.json','.png','@2x.json','@2x.png']:download(style['sprite']+suffix,pathlib.Path('sprite/ofm'+suffix))
style['sources'].pop('ne2_shaded',None);style['layers']=[layer for layer in style['layers'] if layer.get('source')!='ne2_shaded']
style['sources']['openmaptiles']={'type':'vector','tiles':['./tiles/{z}/{x}/{y}.pbf'],'minzoom':minimum,'maxzoom':maximum,'bounds':bounds,'attribution':tilejson['attribution']}
style['glyphs']='./fonts/{fontstack}/{range}.pbf';style['sprite']='./sprite/ofm'
(out/'style.json').write_text(json.dumps(style,ensure_ascii=False,separators=(',',':')))
(out/'snapshot.json').write_text(json.dumps({'provider':'OpenFreeMap','source':tilejson['tiles'][0],'downloadedAt':datetime.date.today().isoformat(),'bounds':bounds,'minZoom':minimum,'tileMaxZoom':maximum,'displayMaxZoom':config['displayMaxZoom'],'tiles':len(jobs),'glyphRanges':len(ranges),'attribution':tilejson['attribution'],'policy':'https://openfreemap.org/tos/'},ensure_ascii=False,indent=2))
print(f'Complete: {len(jobs)} tiles, {len(glyph_jobs)} glyph files, {total/1e6:.1f} MB',flush=True)
