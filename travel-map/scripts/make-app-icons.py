"""Render our code-defined folded-map icon to PNG, without external dependencies."""
from pathlib import Path
import math,struct,zlib
root=Path(__file__).resolve().parents[2]/'beijing/app-icons'
root.mkdir(exist_ok=True)
polygons=[([(128,280),(206,252),(206,365),(128,392)],(173,225,197)), ([(206,252),(285,278),(285,390),(206,365)],(115,177,151)), ([(285,278),(384,247),(384,357),(285,390)],(173,225,197))]
def inside(x,y,points):
 c=False;j=len(points)-1
 for i,(xi,yi) in enumerate(points):
  xj,yj=points[j]
  if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:c=not c
  j=i
 return c

def color(x,y):
 result=(35,40,43)
 for points,fill in polygons:
  if inside(x,y,points):result=fill
 # A single pin, with its whole silhouette inside the maskable safe circle.
 if (x-256)**2+(y-180)**2<=62**2 or inside(x,y,[(201,209),(311,209),(256,300)]):result=(231,238,233)
 if (x-256)**2+(y-180)**2<=23**2:result=(49,90,139)
 return result

def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
def png(size,path):
 raw=bytearray()
 for y in range(size):
  raw.append(0)
  for x in range(size):
   samples=[color((x+dx)*512/size,(y+dy)*512/size) for dx,dy in [(0.25,0.25),(.75,.25),(.25,.75),(.75,.75)]]
   raw.extend(round(sum(c[k] for c in samples)/4) for k in range(3))
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))
for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(512,'maskable-512.png'),(180,'apple-touch-icon.png')]:png(size,root/name)
(root/'icon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#23282b"/><path d="M128 280 206 252V365L128 392Z" fill="#ade1c5"/><path d="m206 252 79 26v112l-79-25Z" fill="#73b197"/><path d="m285 278 99-31v110l-99 33Z" fill="#ade1c5"/><path d="M201 209h110l-55 91Z" fill="#e7eee9"/><circle cx="256" cy="180" r="62" fill="#e7eee9"/><circle cx="256" cy="180" r="23" fill="#315a8b"/></svg>''')
print('Rendered four app icons and vector source')
