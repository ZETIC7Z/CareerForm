import Papa from 'papaparse';
import {PDS,emptyPDS,scalarFields,fields,validatedDraft,educationLevels,questions} from './model';
import mapping from './pdf-map.json';
export type ImportResult={data:PDS;warnings:string[];unmapped:{label:string;value:string}[];source:string};
const norm=(s:string)=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases:Record<string,string>={SURNAME:'surname',LASTNAME:'surname',FIRSTNAME:'firstName',MIDDLENAME:'middleName',NAMEEXTENSION:'extension',DATEOFBIRTH:'birthDate',BIRTHDATE:'birthDate',PLACEOFBIRTH:'birthPlace',SEX:'sex',SEXATBIRTH:'sex',CIVILSTATUS:'civilStatus',CITIZENSHIP:'citizenship',HEIGHT:'height',HEIGHTM:'height',WEIGHT:'weight',WEIGHTKG:'weight',BLOODTYPE:'bloodType',UMIDIDNO:'umid',GSISIDNO:'umid',PAGIBIGIDNO:'pagibig',PHILHEALTHNO:'philhealth',TINNO:'tin',PHILSYSNUMBERPSN:'psn',PSN:'psn',AGENCYEMPLOYEENO:'agencyId',MOBILENO:'mobile',MOBILENUMBER:'mobile',EMAILADDRESS:'email',EMAIL:'email',TELEPHONENO:'telephone',DATEOFSIGNOFFFILING:'accomplished'};
scalarFields.forEach(f=>{aliases[norm(f.label)]??=f.key;aliases[norm(f.key)]??=f.key});
export function normalizeDate(value:string,order:'mdy'|'dmy'):string{if(!value||/^(N\/A|PRESENT)$/i.test(value))return value;const iso=value.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return iso[0];const m=value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(!m)return value;const day=Number(m[order==='mdy'?2:1]),month=Number(m[order==='mdy'?1:2]),year=Number(m[3]);const date=new Date(Date.UTC(year,month-1,day));if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error(`Invalid date: ${value}`);return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
function cleanValue(key:string,value:string){if(key==='sex')return /FEMALE/i.test(value)?'Female':/MALE/i.test(value)?'Male':value;if(key==='civilStatus')return ['Single','Married','Widowed','Separated','Other'].find(v=>value.toLowerCase().includes(v.toLowerCase()))||value;if(key==='citizenship')return /dual/i.test(value)?'Dual Citizenship':/filipino/i.test(value)?'Filipino':value;return value.replace(/\s*\[X\]/gi,'').trim()}
export function parseRows(rows:string[][],source='Spreadsheet'):ImportResult{
 const result:ImportResult={data:emptyPDS(),warnings:[],unmapped:[],source};const {data,warnings,unmapped}=result;
 const flat=rows.flat();const dates=flat.filter(v=>/^\d{1,2}[/]\d{1,2}[/]\d{4}$/.test(v));const mdy=dates.some(v=>Number(v.split('/')[1])>12),dmy=dates.some(v=>Number(v.split('/')[0])>12);
 if(mdy&&dmy)throw new Error('This file mixes month-first and day-first dates. Normalize dates to YYYY-MM-DD before importing.');
 const order=mdy?'mdy':'dmy';if(dates.length){warnings.push(mdy?'Month-first source dates detected and converted to day-first CSC display.':dmy?'Day-first source dates detected.':'Ambiguous numeric dates interpreted as day/month/year. Verify all imported dates.');}
 const date=(v:string)=>{try{return normalizeDate(v,order)}catch(e){warnings.push(String(e));return v}};
 let section='',other='',tableHeader:string[]=[];
 const put=(k:string,v:string)=>{data.values[k]=cleanValue(k,v);if(scalarFields.find(f=>f.key===k)?.type==='date')data.values[k]=date(v)};
 const headerMap=(row:string[])=>row.map(v=>aliases[norm(v)]||'');
 const first=rows.find(r=>r.filter(Boolean).length>0)||[];
 if(first.length>3&&headerMap(first).filter(Boolean).length>2){const next=rows[rows.indexOf(first)+1]||[];first.forEach((h,i)=>{const key=aliases[norm(h)];if(key&&next[i])put(key,next[i]);else if(next[i])unmapped.push({label:h,value:next[i]})});if(rows.length>2)warnings.push('Imported the first person only. Split multi-person files before importing.');return result}
 for(const raw of rows){const r=raw.map(v=>v?.trim()||'');if(!r.some(Boolean))continue;const label=r[0],value=r[1]||'',n=norm(label);
  if(/^([IVX]+\.|41\.)/.test(label)&&r.slice(1).every(v=>!v)){section=label;tableHeader=[];other='';continue}
  if(/^INCLUSIVE DATES FROM|^LEVEL$|^FULL NAME$/i.test(label)){tableHeader=r;continue}
  if(/EDUCATIONAL/.test(section)&&r.length>=4){const level=educationLevels.find(v=>norm(v).startsWith(n))||label;const row={level,school:r[1],degree:r[2],graduated:r[3]||''};const i=data.records.education.findIndex(x=>x.level===level);if(i>=0)data.records.education[i]=row;else data.records.education.push(row);continue}
  if(/WORK EXPERIENCE/.test(section)&&r.length>=6){data.records.work.push({from:date(r[0]),to:date(r[1]),position:r[2],company:r[3],salary:r[4],grade:r.length>=8?r[5]:'',status:r.length>=8?r[6]:r[5],government:(r.length>=8?r[7]:r[6]||'').toUpperCase()==='YES'?'Y':(r.length>=8?r[7]:r[6]||'').toUpperCase()==='NO'?'N':r[6]||''});continue}
  if(/VOLUNTARY/.test(section)&&r.length>=5){data.records.voluntary.push({organization:r[0],from:date(r[1]),to:date(r[2]),hours:r[3],position:r[4]});continue}
  if(/LEARNING/.test(section)&&r.length>=6){data.records.training.push({title:r[0],from:date(r[1]),to:date(r[2]),hours:r[3],type:r[4],sponsor:r[5]});continue}
  if(/41\.|CHARACTER REFERENCES/.test(section)&&r.length>=3){data.records.references.push({name:r[0],address:r[1],contact:r[2]});continue}
  if(n==='SPECIALSKILLS'||n==='DISTINCTIONS'||n==='MEMBERSHIPS'){other=n==='SPECIALSKILLS'?'skills':n==='DISTINCTIONS'?'distinctions':'memberships';data.records[other].push({value:value.replace(/^\d+\.\s*/,'')});continue}
  if(!label&&other&&value){data.records[other].push({value:value.replace(/^\d+\.\s*/,'')});continue}
  if(n==='HEIGHTWEIGHT'){const numbers=value.match(/\d+(?:\.\d+)?/g);if(numbers?.length===2){put('height',numbers[0]);put('weight',numbers[1])}else unmapped.push({label,value});continue}
  if(n==='MOTHERMAIDENNAME'){const parts=value.split(',').map(x=>x.trim());if(parts.length===2){put('motherSurname',parts[0]);const names=parts[1].split(' ');put('motherMiddle',names.pop()||'');put('motherFirst',names.join(' '));warnings.push('Mother’s compound name was split into surname, first and middle names. Verify the split.')}else unmapped.push({label,value});continue}
  if(n==='SPOUSEFATHERCHILDREN'&&value==='N/A'){for(const prefix of ['spouse','father'])for(const part of ['Surname','First','Middle','Extension'])put(prefix+part,'N/A');data.records.children=[{name:'N/A',birthDate:''}];continue}
  if(n==='RESIDENTIALPERMANENTADDRESS'){
   const parts=value.split(',').map(s=>s.trim());const zip=value.match(/\((\d{4})\)/)?.[1]||'';
   if(parts.length>=5){for(const p of ['residential','permanent']){put(p+'House',parts[0]);put(p+'Street',parts[1]);put(p+'Barangay',parts[2].replace(/^BARANGAY\s+/i,''));put(p+'City',parts[3]);put(p+'Province',parts.slice(4).join(', ').replace(/\s*\(\d{4}\)/,''));put(p+'Zip',zip)}warnings.push('Combined address split and applied to both addresses. Verify each component.')}else unmapped.push({label,value});continue
  }
  if(n==='DISCLOSURES3440'&&/ALL.*NO/i.test(value)){for(const q of questions)put(q.key,'No');warnings.push('Questions 34–40 were marked No in the source. Confirm each answer yourself; no eligibility or compliance judgment was made.');continue}
  const key=aliases[n];if(key&&value){put(key,value);if(key==='citizenship'&&/BY BIRTH/i.test(value))put('citizenshipBasis','By birth');continue}
  if(label&&value)unmapped.push({label,value:r.slice(1).join(' | ')});
 }
 void tableHeader;
 return result;
}
export function parseCSV(text:string,source='CSV'):ImportResult{const parsed=Papa.parse<string[]>(text.replace(/^\uFEFF/,''),{skipEmptyLines:'greedy'});if(parsed.errors.length)throw new Error(`CSV could not be read: ${parsed.errors[0].message}`);return parseRows(parsed.data,source)}
export async function importFile(file:File):Promise<ImportResult>{
 if(file.size>20*1024*1024)throw new Error('Choose a file smaller than 20 MB.');const ext=file.name.split('.').pop()?.toLowerCase();
 if(ext==='json')return {data:validatedDraft(JSON.parse(await file.text())),warnings:[],unmapped:[],source:file.name};
 if(ext==='csv'||ext==='tsv'){return parseCSV(await file.text(),file.name)}
 if(ext==='xlsx'){
  const {default:readXlsxFile}=await import('read-excel-file/browser');const workbook=await readXlsxFile(file);const names=workbook.map(s=>s.sheet);
  if(names.includes('C1')&&names.includes('C2')){
   const result:ImportResult={data:emptyPDS(),warnings:['Official workbook cell mapping detected. Verify all dates, checkboxes and imported values; Excel form-control selections may require manual entry.'],unmapped:[],source:file.name};
   const sheets=['C1','C2','C3','C4'].map(sheet=>workbook.find(s=>s.sheet===sheet)?.data||[]);
   const cell=(p:number,address:string)=>{const m=address.match(/^([A-Z]+)(\d+)$/)!;let col=0;for(const l of m[1])col=col*26+l.charCodeAt(0)-64;const v=sheets[p][Number(m[2])-1]?.[col-1];return v instanceof Date?v.toISOString().slice(0,10):v==null?'':String(v)};
   const templateLabels=new Set(['NAME EXTENSION (JR., SR)','NAME EXTENSION (JR., SR)']);
   for(const f of fields){if(!f.cell)continue;const value=cell(f.page,f.cell);if(!value.trim()||templateLabels.has(value.trim()))continue;const [t,i,k]=f.key.split('.');if(k){while(result.data.records[t].length<=Number(i))result.data.records[t].push({});result.data.records[t][Number(i)][k]=value}else result.data.values[f.key]=f.type==='date'?normalizeDate(value,'dmy'):value}
   for(const [key,rows] of Object.entries(result.data.records))result.data.records[key]=rows.filter(r=>Object.entries(r).some(([k,v])=>k!=='level'&&v.trim()));
   return result;
  }
  const rows=workbook[0].data;return parseRows(rows.map(r=>r.map(c=>c instanceof Date?c.toISOString().slice(0,10):c==null?'':String(c))),file.name);
 }
 if(ext==='pdf'){
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
  try{const doc=await task.promise;if(doc.numPages>50)throw new Error('Import a PDF with 50 pages or fewer.');const attachments=await doc.getAttachments() as Record<string,{filename?:string;content?:Uint8Array}>|null;const own=attachments&&Object.values(attachments).find(a=>a.filename==='zeticuz-pds.json');if(own)return {data:validatedDraft(JSON.parse(new TextDecoder().decode(own.content))),warnings:['Restored editable data embedded in this Zeticuz PDF.'],unmapped:[],source:file.name};
   const result:ImportResult={data:emptyPDS(),warnings:['PDF extraction is best-effort. Review every mapped field; checkboxes and scanned handwriting require manual entry.'],unmapped:[],source:file.name};let all='';
   for(let pi=0;pi<doc.numPages;pi++){const page=await doc.getPage(pi+1);const viewport=page.getViewport({scale:1});const content=await page.getTextContent();const items=content.items.filter(i=>'str'in i).map(i=>{const t=i as {str:string;transform:number[];width:number};return {text:t.str,x:t.transform[4],y:viewport.height-t.transform[5],width:t.width}});all+=items.map(i=>i.text).join('\n')+'\n';
    if(pi<4&&/Revised 2026/i.test(items.map(i=>i.text).join(' '))){for(const [key,b] of Object.entries(mapping)){if(b.page!==pi)continue;const sx=viewport.width/576,sy=viewport.height/1008;const value=items.filter(t=>t.x>=b.x*sx-1&&t.x<(b.x+b.w)*sx&&t.y>=b.y*sy&&t.y<=(b.y+b.h+2)*sy).map(t=>t.text).join(' ').trim();if(!value||/NAME EXTENSION|Government Issued|ID\/License|Date\/Place/.test(value))continue;const [t,i,k]=key.split('.');if(k){while(result.data.records[t].length<=+i)result.data.records[t].push({});result.data.records[t][+i][k]=value}else result.data.values[key]=scalarFields.find(f=>f.key===key)?.type==='date'?normalizeDate(value,'dmy'):value}}
   }
   if(all.trim().length<50)throw new Error('This PDF appears to be scanned. OCR is not available in this browser importer. Import the original XLSX/CSV or enter the missing details manually.');
   if(!Object.keys(result.data.values).length){const rows=all.split('\n').map(line=>line.split(/\s*:\s*|\t/));const fallback=parseRows(rows,file.name);result.data=fallback.data;result.unmapped=fallback.unmapped;result.warnings.push(...fallback.warnings);if(!Object.keys(result.data.values).length)result.warnings.push('No reliable labeled fields were found. Copy the extracted text below or import the original spreadsheet.');result.unmapped.push({label:'Extracted PDF text',value:all.slice(0,20000)})}
   return result;
  }finally{await task.destroy()}
 }
 throw new Error('Supported files: CSV, TSV, XLSX, PDF, or a Zeticuz JSON backup. Save legacy XLS files as XLSX first.');
}
export function importCount(r:ImportResult){return Object.values(r.data.values).filter(Boolean).length+Object.values(r.data.records).flat().reduce((n,row)=>n+Object.entries(row).filter(([k,v])=>k!=='level'&&v).length,0)}

