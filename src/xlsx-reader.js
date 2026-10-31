/* Local XLSX first-sheet parser with bundled JSZip. No formula evaluation, macros, or network. */
(function(root){
'use strict';
function xml(s){if(/<!DOCTYPE|<!ENTITY/i.test(s))throw Error('외부 엔터티가 포함된 XML은 지원하지 않습니다.');const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('XLSX XML 파일 형식이 올바르지 않습니다.');return d;}
const els=(node,tag)=>Array.from(node.getElementsByTagName('*')).filter(x=>x.localName===tag);
const txt=(n,tag)=>els(n,tag).map(x=>x.textContent).join('');
function colIndex(a){let n=0;for(const c of a)n=n*26+c.charCodeAt(0)-64;return n-1;}
async function parseXlsx(file){
 if(!root.JSZip)throw Error('오프라인 XLSX 처리 라이브러리를 찾을 수 없습니다.');
 if(!file||file.size>5*1024*1024)throw Error('XLSX는 파일당 5MB 이하만 지원합니다.');
 const z=await root.JSZip.loadAsync(await file.arrayBuffer(),{checkCRC32:true});
 if(Object.keys(z.files).length>2000)throw Error('XLSX 파일 항목 수가 너무 많습니다.');
 const stringFile=z.file('xl/sharedStrings.xml'),shared=[];
 if(stringFile){const doc=xml(await stringFile.async('string'));for(const si of els(doc,'si').slice(0,30000))shared.push(txt(si,'t'));}
 const bookFile=z.file('xl/workbook.xml'),relsFile=z.file('xl/_rels/workbook.xml.rels');if(!bookFile||!relsFile)throw Error('XLSX 통합문서 정보를 찾을 수 없습니다.');
 const workbook=xml(await bookFile.async('string')),rels=xml(await relsFile.async('string'));
 const sheet=els(workbook,'sheet')[0];if(!sheet)throw Error('XLSX에 시트가 없습니다.');
 const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');const relationship=els(rels,'Relationship').find(x=>x.getAttribute('Id')===rid);if(!relationship)throw Error('첫 시트 경로를 찾을 수 없습니다.');
 let target=relationship.getAttribute('Target')||'';if(target.startsWith('/'))target=target.replace(/^\//,'');else target='xl/'+target.replace(/^\.\//,'');const path=target.split('/').reduce((arr,v)=>{if(v==='..')arr.pop();else if(v!=='.')arr.push(v);return arr;},[]).join('/');
 if(!path.startsWith('xl/worksheets/')||!z.file(path))throw Error('첫 번째 시트 데이터가 없습니다.');
 const data=xml(await z.file(path).async('string'));const rows=[];
 for(const row of els(data,'row')){
   const cells=[];
   for(const cell of els(row,'c')){
    const ref=cell.getAttribute('r')||'';const c=colIndex((ref.match(/^[A-Z]+/)||[''])[0]);if(c<0||c>=100)continue;
    let val='';const type=cell.getAttribute('t');
    if(type==='inlineStr')val=txt(cell,'t');else {const v=els(cell,'v')[0]?.textContent||'';val=type==='s'?(shared[Number(v)]||''):v;}
    cells[c]=String(val).slice(0,250);
   }
   if(cells.some(x=>String(x||'').trim()))rows.push(Array.from({length:Math.min(cells.length,100)},(_,i)=>cells[i]||''));
   if(rows.length>1500)throw Error('시트는 최대 1500행까지만 지원합니다.');
 }
 return rows;
}
root.JBSchoolXlsx={parseXlsx};
})(typeof globalThis!=='undefined'?globalThis:this);
