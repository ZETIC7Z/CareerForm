from pathlib import Path
import json, re, shutil
import pymupdf as fitz
root=Path(__file__).resolve().parents[1]
schema=json.loads((root/'src/lib/schema.json').read_text())
blank=fitz.open(root/'tmp/print-template.pdf');marked=fitz.open(root/'tmp/marked.pdf')
result={};missing=[]
def lines(page):
    vs=[];hs=[]
    for d in page.get_drawings():
        for it in d['items']:
            pairs=[]
            if it[0]=='l': pairs=[(it[1],it[2])]
            elif it[0]=='re':
                r=it[1];pairs=[(r.tl,r.tr),(r.tr,r.br),(r.br,r.bl),(r.bl,r.tl)]
            for a,b in pairs:
                if abs(a.x-b.x)<.2:vs.append((a.x,min(a.y,b.y),max(a.y,b.y)))
                if abs(a.y-b.y)<.2:hs.append((a.y,min(a.x,b.x),max(a.x,b.x)))
    return vs,hs
for i,f in enumerate(schema['fields']):
    if not f['cell']:continue
    p=marked[f['page']];hit=p.search_for(f'Z{i:04}Z')
    if not hit:missing.append(f['key']);continue
    r=hit[0];cx=r.x0+1;cy=(r.y0+r.y1)/2
    vs,hs=lines(blank[f['page']])
    left=max([x for x,a,b in vs if a-.5<=cy<=b+.5 and x<cx],default=r.x0-1)
    right=min([x for x,a,b in vs if a-.5<=cy<=b+.5 and x>r.x1],default=r.x1+40)
    top=max([y for y,a,b in hs if a-.5<=cx<=b+.5 and y<cy],default=r.y0-3)
    bottom=min([y for y,a,b in hs if a-.5<=cx<=b+.5 and y>cy],default=r.y1+3)
    result[f['key']]=dict(page=f['page'],x=round(left+2,2),y=round(top+1.5,2),w=round(right-left-4,2),h=round(bottom-top-3,2))
    if f['key'] in ['extension','spouseExtension','fatherExtension']:
        result[f['key']]['y']+=6;result[f['key']]['h']-=6
# Checkbox controls are drawings; locate their labels on the untouched source page.
checks={}
for page in [0,3]:
    print('PAGE',page,'WORDS',[(w[:4],w[4]) for w in blank[page].get_text('words') if w[4].lower() in ['male','female','single','married','widowed','separated','other/s:','filipino','dual','yes','no','birth','naturalization']])
(root/'src/lib/pdf-map.json').write_text(json.dumps(result,indent=2))
(root/'tmp/missing-map.json').write_text(json.dumps(missing))
shutil.copy(root/'tmp/print-template.pdf',root/'public/csc-2026.pdf')
for i,p in enumerate(blank):p.get_pixmap(matrix=fitz.Matrix(1,1)).save(root/f'tmp/official-{i+1}.png')
print('Mapped',len(result),'Missing',missing)
