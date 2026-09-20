import schema from './schema.json';
export type Row=Record<string,string>;
export type PDS={version:1;values:Row;records:Record<string,Row[]>;photo?:string;signature?:string;signatureDate?:string};
export type Field={key:string;label:string;section:number;cell:string|null;page:number;group:string;type:string;options?:string[]};
export type Table={label:string;section:number;page:number;capacity:number;columns:{key:string;label:string;type:string;options?:string[]}[]};
export const fields=schema.fields as Field[];
export const scalarFields=fields.filter(f=>!f.key.includes('.'));
export const tables=schema.tables as Record<string,Table>;
export const questions=schema.questions;
export const sections=['Personal information','Family background','Educational background','Civil service eligibility','Work experience','Voluntary work','Learning & development','Other information','Declarations & references'];
export const sectionPages=[0,0,0,1,1,2,2,2,3];
export const educationLevels=['Elementary','Secondary','Vocational / Trade Course','College','Graduate Studies'];
export function emptyPDS():PDS{return {version:1,values:{},records:Object.fromEntries(Object.keys(tables).map(k=>[k, k==='education'?educationLevels.map(level=>({level})):[]]))}}
export function validatedDraft(input:unknown):PDS{
 if(!input||typeof input!=='object'||(input as PDS).version!==1)throw new Error('This is not a Zeticuz draft.');
 const raw=input as PDS,result=emptyPDS();
 for(const f of scalarFields){const v=raw.values?.[f.key];if(typeof v==='string')result.values[f.key]=v.slice(0,4000)}
 for(const [key,t] of Object.entries(tables)){const a=raw.records?.[key];if(Array.isArray(a))result.records[key]=a.slice(0,300).filter(r=>r&&typeof r==='object').map(r=>Object.fromEntries(t.columns.map(c=>[c.key,typeof r[c.key]==='string'?r[c.key].slice(0,4000):''])))}
 for(const key of ['photo','signature'] as const)if(typeof raw[key]==='string'&&/^data:image\/(png|jpeg);base64,/.test(raw[key]!)&&raw[key]!.length<3000000)result[key]=raw[key];
 if(typeof raw.signatureDate==='string')result.signatureDate=raw.signatureDate.slice(0,100);
 return result;
}
const FIELD_ALIASES: Record<string, string> = {
  fatherFirst: 'fatherFirstName',
  fatherFirstName: 'fatherFirst',
  fatherMiddle: 'fatherMiddleName',
  fatherMiddleName: 'fatherMiddle',
  motherFirst: 'motherFirstName',
  motherFirstName: 'motherFirst',
  motherMiddle: 'motherMiddleName',
  motherMiddleName: 'motherMiddle',
  spouseFirst: 'spouseFirstName',
  spouseFirstName: 'spouseFirst',
  spouseMiddle: 'spouseMiddleName',
  spouseMiddleName: 'spouseMiddle',
  agencyId: 'agencyEmployeeNo',
  agencyEmployeeNo: 'agencyId',
  psn: 'philSys',
  philSys: 'psn',
};

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['title', 'refName', 'eligibilityName', 'childName'],
  title: ['name'],
  date: ['examDate', 'dateOfExam'],
  examDate: ['date'],
  license: ['licenseNumber', 'licenseNo'],
  licenseNumber: ['license'],
  validUntil: ['licenseValidity', 'validity'],
  licenseValidity: ['validUntil'],
  grade: ['salaryGrade', 'salaryGradeStep', 'step'],
  salaryGrade: ['grade'],
  government: ['govService', 'gov'],
  govService: ['government'],
  value: ['skill', 'recognition', 'association'],
  skill: ['value'],
  recognition: ['value'],
  association: ['value'],
  contact: ['refTel', 'telephone', 'mobile'],
  refTel: ['contact'],
  address: ['refAddress'],
  refAddress: ['address'],
  company: ['office', 'department', 'agency'],
  childName: ['name'],
  childBirth: ['birthDate', 'dateOfBirth'],
};

export function getValue(data:PDS,key:string):string{
  const [table,index,field]=key.split('.');
  if(field){
    const row=data.records[table]?.[Number(index)];
    if(!row) return '';
    if(row[field]!==undefined&&row[field]!=='') return row[field];
    const aliases=COLUMN_ALIASES[field];
    if(aliases){
      for(const a of aliases){
        if(row[a]!==undefined&&row[a]!=='') return row[a];
      }
    }
    return '';
  }
  const val = data.values[key];
  if(val !== undefined && val !== '') return val;
  const alias = FIELD_ALIASES[key];
  if(alias && data.values[alias] !== undefined && data.values[alias] !== '') return data.values[alias];
  return '';
}
export const required=['surname','firstName','birthDate','birthPlace','sex','civilStatus','citizenship','residentialCity','residentialProvince','mobile','accomplished'];

export interface ReviewIssue {
  id: string;
  label: string;
  section: string;
  page: string;
  groupIndex: number;
  stepIndex: number;
}

export function getReviewIssues(data: PDS): ReviewIssue[] {
  const out: ReviewIssue[] = [];
  const personalFieldLabels: Record<string, string> = {
    surname: 'Surname',
    firstName: 'First Name',
    birthDate: 'Date of Birth',
    birthPlace: 'Place of Birth',
    sex: 'Sex at Birth',
    civilStatus: 'Civil Status',
    citizenship: 'Citizenship',
    residentialCity: 'Residential City / Municipality',
    residentialProvince: 'Residential Province',
    mobile: 'Mobile Number',
  };

  for (const [key, label] of Object.entries(personalFieldLabels)) {
    if (!data.values[key]?.trim()) {
      out.push({
        id: `missing-${key}`,
        label: `${label} is missing`,
        section: 'Personal Information',
        page: 'Page 1',
        groupIndex: 0,
        stepIndex: 0,
      });
    }
  }

  if (data.values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.values.email)) {
    out.push({
      id: 'invalid-email',
      label: 'Email address format is invalid',
      section: 'Personal Information',
      page: 'Page 1',
      groupIndex: 0,
      stepIndex: 0,
    });
  }

  for (const q of questions) {
    const qNum = q.key.slice(1).toUpperCase();
    if (!data.values[q.key]) {
      out.push({
        id: `missing-${q.key}`,
        label: `Question ${qNum} requires an answer`,
        section: 'Declarations · Questions 34–40',
        page: 'Page 4',
        groupIndex: 3,
        stepIndex: 0,
      });
    } else if (data.values[q.key] === 'Yes' && !data.values[q.key + 'Details']?.trim()) {
      out.push({
        id: `details-${q.key}`,
        label: `Question ${qNum} requires supporting details`,
        section: 'Declarations · Questions 34–40',
        page: 'Page 4',
        groupIndex: 3,
        stepIndex: 0,
      });
    }
  }

  if (!data.values['accomplished']?.trim()) {
    out.push({
      id: 'missing-accomplished',
      label: 'Date Accomplished is required',
      section: 'References & Signature',
      page: 'Page 4',
      groupIndex: 3,
      stepIndex: 1,
    });
  }

  if (!data.photo) {
    out.push({
      id: 'missing-photo',
      label: 'Recent passport photo is missing',
      section: 'Photo & Identification',
      page: 'Page 4',
      groupIndex: 3,
      stepIndex: 1,
    });
  }

  if (!data.signature) {
    out.push({
      id: 'missing-signature',
      label: 'Signature is missing (or sign after printing)',
      section: 'References & Signature',
      page: 'Page 4',
      groupIndex: 3,
      stepIndex: 1,
    });
  }

  return out;
}

export function issues(data:PDS):string[]{
  return getReviewIssues(data).map(i => i.label);
}
export function progress(data:PDS):number{
  if(!data||!data.values)return 0;
  let filled=0;
  let total=0;
  const page1Fields=['surname','firstName','middleName','extension','birthDate','birthPlace','sex','civilStatus','citizenship','height','weight','bloodType','gsis','pagibig','philhealth','sss','tin','agencyEmployeeNo','residentialCity','residentialProvince','permanentCity','permanentProvince','mobile','email'];
  for(const k of page1Fields){total+=1;if(data.values[k]?.trim())filled+=1}
  const familyFields=['spouseSurname','spouseFirstName','fatherSurname','fatherFirstName','motherSurname','motherFirstName'];
  for(const k of familyFields){total+=1;if(data.values[k]?.trim())filled+=1}
  total+=4;
  const edu=data.records?.education||[];
  filled+=Math.min(4,edu.filter(r=>r.school?.trim()||r.degree?.trim()).length);
  total+=6;
  const elig=(data.records?.eligibility||[]).filter(r=>Object.values(r).some(v=>v?.trim())).length;
  const work=(data.records?.work||[]).filter(r=>Object.values(r).some(v=>v?.trim())).length;
  filled+=Math.min(3,elig)+Math.min(3,work);
  total+=4;
  const vol=(data.records?.voluntary||[]).filter(r=>Object.values(r).some(v=>v?.trim())).length;
  const ld=(data.records?.training||[]).filter(r=>Object.values(r).some(v=>v?.trim())).length;
  filled+=Math.min(2,vol)+Math.min(2,ld);
  for(const q of questions){total+=1;if(data.values[q.key])filled+=1}
  total+=2;if(data.photo)filled+=2;
  total+=2;if(data.signature)filled+=2;
  total+=2;
  const refs=(data.records?.references||[]).filter(r=>Object.values(r).some(v=>v?.trim())).length;
  if(refs>0)filled+=2;
  return total>0?Math.min(100,Math.max(0,Math.round((filled/total)*100))):0;
}
export function displayDate(value:string){if(/^\d{4}-\d{2}-\d{2}$/.test(value)){const [y,m,d]=value.split('-');return `${d}/${m}/${y}`}return value}
/** Compact date for narrow work experience columns: MM/YYYY (fits in ~35px cells) */
export function displayDateCompact(value:string):string{
  if(!value) return '';
  const trimmed = value.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(trimmed)){
    const [y,m]=trimmed.split('-');
    return `${m}/${y}`;
  }
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)){
    const [,m,y]=trimmed.split('/');
    return `${m}/${y}`;
  }
  if(/^\d{4}$/.test(trimmed))return trimmed;
  return displayDate(trimmed);
}
export function formatFullDate(value:string):string{
  if(!value)return '';
  const trimmed=value.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(trimmed)){
    const [y,m,d]=trimmed.split('-');
    const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName=months[parseInt(m,10)-1]||m;
    const day=parseInt(d,10);
    return `${monthName} ${day}, ${y}`;
  }
  const shortMonths:Record<string,string>={Jan:'January',Feb:'February',Mar:'March',Apr:'April',May:'May',Jun:'June',Jul:'July',Aug:'August',Sep:'September',Oct:'October',Nov:'November',Dec:'December'};
  for(const [short,full] of Object.entries(shortMonths)){
    if(trimmed.startsWith(short+' ')||trimmed.startsWith(short+'.')){
      return trimmed.replace(new RegExp(`^${short}\\.?`),full);
    }
  }
  return trimmed;
}
export function sortWorkRecordsDescending(records: Row[]): Row[] {
  if (!records || records.length <= 1) return records || [];
  return [...records].sort((a, b) => {
    const toA = (a.to || '').trim().toLowerCase();
    const toB = (b.to || '').trim().toLowerCase();
    const isPresentA = toA.includes('present') || toA === '';
    const isPresentB = toB.includes('present') || toB === '';
    if (isPresentA && !isPresentB) return -1;
    if (!isPresentA && isPresentB) return 1;
    if (!isPresentA && !isPresentB && toA !== toB) return toB.localeCompare(toA);
    const fromA = (a.from || '').trim();
    const fromB = (b.from || '').trim();
    return fromB.localeCompare(fromA);
  });
}
export function download(bytes:Uint8Array|string,name:string,type:string){const blob=new Blob([typeof bytes==='string'?bytes:new Uint8Array(bytes)],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);try{a.click()}catch{window.open(url,'_blank')}finally{setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},30000)}}
