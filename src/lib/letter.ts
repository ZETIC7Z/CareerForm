import {PDS} from './model';
export type Letter={kind:'application'|'transmittal';date:string;recipientTitle:string;recipientName:string;organization:string;organizationAddress:string;position:string;subject:string;body:string;senderName:string;senderAddress:string;senderContact:string};
export const letterPlaceholders=['POSITION','ORGANIZATION','NAME','ADDRESS','MOBILE','EMAIL','EDUCATION','ELIGIBILITY','TODAY'] as const;
export function pdsName(pds:PDS){return [pds.values.firstName,pds.values.middleName,pds.values.surname,pds.values.extension].filter(Boolean).join(' ')}
export function pdsAddress(pds:PDS){const v=pds.values;return [[v.residentialHouse,v.residentialStreet].filter(Boolean).join(' '),[v.residentialVillage,v.residentialBarangay].filter(Boolean).join(', '),[v.residentialCity,v.residentialProvince].filter(Boolean).join(', ')].filter(Boolean).join('\n')}
export function longDate(value:string){if(/^\d{4}-\d{2}-\d{2}$/.test(value)){const [y,m,d]=value.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)).toLocaleDateString('en-PH',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'})}return value}
export function applyPlaceholders(text:string,letter:Letter,pds:PDS){
 const map:Record<string,string>={POSITION:letter.position,ORGANIZATION:letter.organization,NAME:letter.senderName||pdsName(pds),ADDRESS:letter.senderAddress?pdsAddress(pds)&&letter.senderAddress.replace(/\n/g,', '):pdsAddress(pds).replace(/\n/g,', '),MOBILE:pds.values.mobile||'',EMAIL:pds.values.email||'',EDUCATION:pds.records.education?.find(r=>r.degree)?.degree||'',ELIGIBILITY:pds.records.eligibility?.[0]?.name||'',TODAY:longDate(letter.date)};
 return text.replace(/\{\{([A-Z]+)\}\}/g,(m,k)=>map[k]??m);
}
const APPLICATION_BODY=`I am writing to express my genuine interest in the position of {{POSITION}} at {{ORGANIZATION}}. My qualifications, summarized in the enclosed Personal Data Sheet, reflect careful preparation for exactly this kind of responsibility.

I have completed {{EDUCATION}} and my experience has taught me to deliver under pressure, coordinate with diverse teams, and serve the public with integrity. I would welcome the opportunity to discuss how I can contribute to {{ORGANIZATION}}.

Thank you for considering my application. I look forward to your response.`;
const TRANSMITTAL_BODY=`In compliance with the requirements of {{ORGANIZATION}}, I respectfully submit my duly accomplished Personal Data Sheet (CS Form No. 212, Revised 2026) together with the supporting documents needed for evaluation.

I certify that the information provided is true and correct to the best of my knowledge, and I authorize {{ORGANIZATION}} to verify any part of it.

Thank you for your consideration.`;
export function letterFor(kind:'application'|'transmittal',pds:PDS):Letter{
 const lastWork=pds.records.work?.find(r=>r.position)?.position||'';
 return {kind,date:new Date().toISOString().slice(0,10),recipientTitle:'',recipientName:'',organization:'',organizationAddress:'',position:lastWork,
  subject:kind==='application'?'Application for the position of {{POSITION}}':'Transmittal of Personal Data Sheet (CS Form No. 212, Revised 2026)',
  body:kind==='application'?APPLICATION_BODY:TRANSMITTAL_BODY,
  senderName:pdsName(pds),senderAddress:pdsAddress(pds),senderContact:[pds.values.mobile,pds.values.email].filter(Boolean).join(' · ')};
}
export function salutation(letter:Letter){return [letter.recipientTitle,letter.recipientName].map(s=>s.trim()).filter(Boolean).join(' ')||'Sir/Madam'}
export const LETTER_KEY='zeticuz-letter';
export function loadLetter():Letter|null{try{const raw=localStorage.getItem(LETTER_KEY);if(!raw)return null;const l=JSON.parse(raw) as Letter;return l&&typeof l.body==='string'?l:null}catch{return null}}
export function saveLetter(letter:Letter){try{localStorage.setItem(LETTER_KEY,JSON.stringify(letter))}catch{}}
export function letterPlainText(letter:Letter,pds:PDS){
 const to=[letter.recipientName,letter.recipientTitle,letter.organization,...letter.organizationAddress.split('\n')].map(s=>s.trim()).filter(Boolean).join('\n');
 return [longDate(letter.date),to,`Subject: ${applyPlaceholders(letter.subject,letter,pds)}`,`Dear ${salutation(letter)},`,applyPlaceholders(letter.body,letter,pds),'Respectfully yours,',letter.senderName||pdsName(pds),letter.senderAddress,letter.senderContact].filter(s=>s&&s.trim()).join('\n\n');
}
