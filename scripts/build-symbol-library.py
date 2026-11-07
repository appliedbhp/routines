"""Build the pinned, offline-searchable symbol catalog from reviewed source metadata."""
import json, hashlib
from pathlib import Path
source=json.loads(Path('scripts/symbol-sources.json').read_text())
rows=[];seen=set()
def add(provider,key,label,path,words,age='all'):
 ident=700000000+int(hashlib.sha256((provider+':'+key).encode()).hexdigest()[:12],16)%299000000
 if ident in seen:raise ValueError('Symbol ID collision')
 seen.add(ident)
 repo='mulberrysymbols/mulberry-symbols' if provider=='mulberry' else 'appliedbhp/visual-supports'
 from urllib.parse import quote
 url='https://raw.githubusercontent.com/'+repo+'/'+source[provider]['sha']+'/'+quote(path,safe='/')
 rows.append([ident,provider,label,url,' '.join(words),age])
for path in source['mulberry']['paths']:
 label=Path(path).stem.replace('_',' ').replace(' , to','')
 add('mulberry',path,label,path,[label])
for entry in source['abhp']['entries']:
 for path in entry['assets']:
  if path.lower().endswith(('.png','.svg','.webp')):
   add('abhp',path,entry['title'],path,[entry['title'],entry['category'],*entry.get('keywords',[])],entry.get('age_strand','all'))
header='''/* Pinned Mulberry (Steve Lee) and reviewed ABHP artwork. See /symbol-credits/. */
(function(root){
const rows=CATALOG;
const byId=new Map(rows.map(row=>[row[0],row]));
const normalize=text=>String(text).toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const aliases={snack:'snack biscuit biscuits fruit',handicrafts:'craft art',homework:'homework school work',math:'math maths mathematics',recess:'play playground',breakfast:'breakfast eat',bedtime:'bed sleep',potty:'toilet',cleanup:'clean tidy',backpack:'bag',reading:'read reading book',writing:'write writing',brush:'brush brushing',washing:'wash washing'};
function imageUrl(id,size=300){const row=byId.get(Number(id));if(row)return row[3];return Number.isSafeInteger(Number(id))&&Number(id)>0&&Number(id)<700000000?`https://static.arasaac.org/pictograms/${id}/${id}_${size}.png`:'';}
async function search(keyword,provider){
 const query=normalize(keyword);if(!query)return [];
 const words=query.split(' ').filter(w=>!['a','the','my','to','up'].includes(w));
 const age=({young:'0-5',child:'6-11',teen:'12-18'})[root.RoutineAudience?.read().age];
 return rows.filter(r=>!provider||r[1]===provider).map(r=>{
  const label=normalize(r[2]),text=normalize(r[4]);let score=label===query?100:label.startsWith(query+' ')?80:label.includes(query)?40:0;
  for(const word of words){const variants=(aliases[word]||word).split(' ');if(variants.some(w=>text.split(' ').some(t=>t===w||t===w+'s'||t===w+'ing')))score+=10;}
  if(score&&r[5]===age)score+=5;
  return {r,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r[2].localeCompare(b.r[2])).slice(0,80).map(({r})=>({_id:r[0],source:r[1],keywords:[{keyword:r[2]}],age:r[5]}));
}
const api={search,imageUrl,source:id=>byId.get(Number(id))?.[1]||'arasaac',has:id=>byId.has(Number(id)),count:rows.length};
root.SymbolLibrary=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
'''
Path('js/symbol-library.js').write_text(header.replace('CATALOG',json.dumps(rows,separators=(',',':'))))
print(len(rows),'symbols indexed')
