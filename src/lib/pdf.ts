import {PDFDocument,PDFFont,PDFPage,rgb,StandardFonts} from 'pdf-lib';
import mapping from './pdf-map.json';
import {PDS,getValue,fields,tables,displayDate,displayDateCompact,formatFullDate,sortWorkRecordsDescending,questions} from './model';
import {Letter,applyPlaceholders,longDate,salutation} from './letter';
export type Box={page:number;x:number;y:number;w:number;h:number};
export const pdfMap:Record<string,Box>=mapping;
// Self-healing memo for binary template stream
const memo=(slot:{current?:Promise<ArrayBuffer>},path:string)=>slot.current??=asset(path).catch(error=>{slot.current=undefined;throw error});
const templates:{current?:Promise<ArrayBuffer>}={};
async function asset(path:string){
  // First attempt JSON template endpoint to eliminate browser download managers (IDM) interception
  if(!path.endsWith('.ttf')){
    try{
      const res=await fetch('/api/template');
      if(res.ok){
        const json=await res.json();
        if(json?.template){
          const bin=atob(json.template);
          const len=bin.length;
          const bytes=new Uint8Array(len);
          for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);
          if(bytes.length>100&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46)return bytes.buffer;
        }
      }
    }catch{}
  }
  try {
    const response=await fetch(path);
    if(response.ok){
      const buf=await response.arrayBuffer();
      const b=new Uint8Array(buf);
      if(path.endsWith('.ttf')){
        if(b.length>1000)return buf;
      } else {
        if(b.length>100&&b[0]===0x25&&b[1]===0x50&&b[2]===0x44&&b[3]===0x46)return buf;
      }
    }
  }catch{}
  throw new Error(`Could not load ${path}. Please retry.`);
}
export function wrap(text:string,font:PDFFont,size:number,width:number){const lines:string[]=[];for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;if(font.widthOfTextAtSize(word,size)>width){if(line){lines.push(line);line=''}let part='';for(const char of word){if(font.widthOfTextAtSize(part+char,size)>width&&part){lines.push(part);part=''}part+=char}line=part}else if(line&&font.widthOfTextAtSize(line+' '+word,size)>width){lines.push(line);line=word}else line+=(line?' ':'')+word}lines.push(line)}return lines}
export function getFieldAlignment(key: string): 'left' | 'center' | 'right' {
  if (
    key === 'birthDate' ||
    key === 'caseDate' ||
    key === 'signatureDate' ||
    key === 'accomplished' ||
    key === 'extension' ||
    key.endsWith('Extension') ||
    key === 'bloodType' ||
    key === 'height' ||
    key === 'weight' ||
    key.endsWith('Zip') ||
    key === 'zipCode' ||
    /\.(from|to|childBirth|examDate|licenseValidity|units|graduated|rating|salaryGrade|status|govService|hours|type)$/.test(key)
  ) {
    return 'center';
  }
  if (/\.salary$/.test(key)) {
    return 'right';
  }
  return 'left';
}

function fit(
  page: PDFPage,
  font: PDFFont,
  rawText: string,
  b: Box,
  max = 8,
  forcedAlign?: 'left' | 'center' | 'right',
  singleLine = false
) {
  if (!rawText) return true;
  const text = rawText
    .replace(/₱/g, 'P')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/•/g, '*');

  const align = forcedAlign || 'left';
  const padX = align === 'left' ? 3.5 : 1.5;
  const availWidth = Math.max(8, b.w - padX * 2);

  let size = Math.min(max, b.h * 0.78);
  let lines = wrap(text, font, size, availWidth);
  const lineGapRatio = 1.14;

  if (singleLine) {
    while (lines.length > 1 && size > 4.0) {
      size -= 0.2;
      lines = wrap(text, font, size, availWidth);
    }
  }

  while (lines.length * size * lineGapRatio > b.h && size > 4.0) {
    size -= 0.2;
    lines = wrap(text, font, size, availWidth);
  }
  if (lines.length * size * lineGapRatio > b.h + 0.6) return false;

  const lineGap = size * lineGapRatio;
  const cellCenter = page.getHeight() - b.y - b.h / 2;
  const firstLineBaseline = cellCenter + ((lines.length - 1) * lineGap) / 2 - size * 0.28;

  lines.forEach((line, i) => {
    const lineWidth = font.widthOfTextAtSize(line, size);
    let posX = b.x + padX;
    if (align === 'center') {
      posX = Math.max(b.x + 1, b.x + (b.w - lineWidth) / 2);
    } else if (align === 'right') {
      posX = Math.max(b.x + 1, b.x + b.w - lineWidth - padX);
    }
    const posY = firstLineBaseline - i * lineGap;
    page.drawText(line, {
      x: posX,
      y: posY,
      size,
      font,
      color: rgb(0.07, 0.07, 0.07),
    });
  });
  return true;
}

function tick(page:PDFPage,x:number,y:number){page.drawLine({start:{x:x+.8,y:page.getHeight()-y-3},end:{x:x+2.7,y:page.getHeight()-y-5.1},thickness:1});page.drawLine({start:{x:x+2.7,y:page.getHeight()-y-5.1},end:{x:x+5.8,y:page.getHeight()-y-.3},thickness:1})}
export async function generatePDF(data:PDS,provided?:{template:Uint8Array;font?:Uint8Array}){
 const template=provided?.template??await memo(templates,'/api/template');
 const pdf=await PDFDocument.load(template);
 // Official standard PDF Helvetica — 100% reliable across all browsers and devices without external font dependencies
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const fontBold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const pages=pdf.getPages();const overflow:{label:string;value:string}[]=[];

 // Automatically sort work experience records in reverse-chronological order (most recent first)
 const effectiveData: PDS = {
   ...data,
   records: {
     ...data.records,
     work: sortWorkRecordsDescending(data.records?.work || []),
   },
 };

 const draw=(key:string,text:string,box:Box)=>{
   if(!text)return;
   const label=fields.find(f=>f.key===key)?.label||key;
   const align=getFieldAlignment(key);
   const field=fields.find(f=>f.key===key);
   const isSingleLine = field?.type === 'date' || /\.(from|to|birthDate|graduated|examDate|validUntil)$/.test(key) || key.startsWith('id') || key === 'tin' || key === 'umid' || key === 'pagibig' || key === 'philhealth' || key === 'psn' || key === 'mobile' || key === 'telephone';
   if(!fit(pages[box.page],font,text,box,8,align,isSingleLine)){
     overflow.push({label:key.includes('.')?`${key.split('.')[0]} record ${Number(key.split('.')[1])+1} — ${label}`:label,value:text});
     fit(pages[box.page],font,`[See note ${overflow.length}]`,box,5,'center');
   }
 };
 for(const [key,box0] of Object.entries(pdfMap)){
   let b={...box0};if(['idType','idNumber','idIssue'].includes(key)){b.x=116;b.w=98}
   if(key==='accomplished') continue; // Handled explicitly below with exact coordinates and formatting
   let value=getValue(effectiveData,key);if(!value)continue;
   const field=fields.find(f=>f.key===key);
   const isWorkDate = /^work\.\d+\.(from|to)$/.test(key);
   if (isWorkDate) {
     value = displayDateCompact(value);
   } else if (field?.type==='date'||/\.(from|to)$/.test(key)) {
     value = displayDate(value);
   }
   draw(key,value,b);
 }
 const p=pages[0];const v=effectiveData.values;
 const options:Record<string,Record<string,[number,number]>>={sex:{Male:[100,199.5],Female:[179.5,199.2]},civilStatus:{Single:[100,214],Married:[179.5,214.4],Widowed:[100,224.5],Separated:[179.5,224.7],Other:[100,235.8]},citizenship:{Filipino:[366.5,161.8],'Dual Citizenship':[407.8,161.6]},citizenshipBasis:{'By birth':[422.3,174.5],'By naturalization':[459.2,171.3]}};
 for(const [key,choices] of Object.entries(options)){const xy=choices[v[key]];if(xy)tick(p,...xy)}
 if(v.citizenshipCountry)draw('citizenshipCountry',v.citizenshipCountry,{page:0,x:445,y:184,w:115,h:10});
 if(v.civilStatus==='Other'&&v.civilOther)draw('civilOther',v.civilOther,{page:0,x:135,y:234,w:115,h:10});

  // Fix Vocational / Trade Course label on Page 0 (official template text has misaligned baseline where VOCATIONAL was printed over SECONDARY)
  // Use exact template gray and REGULAR font (Helvetica 5.5pt, black) matching ELEMENTARY, SECONDARY, COLLEGE, GRADUATE STUDIES
  const levelGray = rgb(234 / 255, 234 / 255, 234 / 255);
  // Keep background rectangle strictly inside cell interior, extending down to 290.0 to cover template TRADE baseline artifact
  pages[0].drawRectangle({
    x: 12.0,
    y: 290.0,
    width: 83.6,
    height: 21.5,
    color: levelGray,
  });
  pages[0].drawText('VOCATIONAL /', {
    x: 21.95,
    y: 303.8,
    size: 5.5,
    font,
    color: rgb(0, 0, 0),
  });
  pages[0].drawText('TRADE COURSE', {
    x: 21.95,
    y: 296.5,
    size: 5.5,
    font,
    color: rgb(0, 0, 0),
  });

  // Explicitly draw the cell borders to guarantee crisp, clean separation
  // Line between VOCATIONAL and COLLEGE across the entire table
  pages[0].drawLine({
    start: { x: 11.36, y: 292.43 },
    end: { x: 566.51, y: 292.43 },
    thickness: 0.52,
    color: rgb(0, 0, 0),
  });
  // Line between SECONDARY and VOCATIONAL
  pages[0].drawLine({
    start: { x: 11.36, y: 312.09 },
    end: { x: 566.51, y: 312.09 },
    thickness: 0.52,
    color: rgb(0, 0, 0),
  });
  // Vertical line separating LEVEL column from NAME OF SCHOOL column
  pages[0].drawLine({
    start: { x: 96.15, y: 292.43 },
    end: { x: 96.15, y: 312.09 },
    thickness: 0.52,
    color: rgb(0, 0, 0),
  });

 const qPositions=[[383,443.6,63],[383,443.6,76.1],[382.1,444.6,120.6],[382.1,446.5,162],[381.6,448.3,213.6],[381.2,448.3,253.5],[382.1,463.2,288],[383,464.1,312.7],[382.1,463.2,342.4],[382.1,464.1,411.9],[382.1,464.1,432.7],[382.1,464.1,455.1]];
 const detailY=[91,101,139,180,231,268,302,327,359,424,446,468];
 questions.forEach((q,i)=>{const answer=v[q.key];if(answer==='Yes'||answer==='No')tick(pages[3],qPositions[i][answer==='Yes'?0:1],qPositions[i][2]);if(answer==='Yes'&&v[q.key+'Details'])draw(q.key+'Details',v[q.key+'Details'],{page:3,x:443,y:detailY[i]-5,w:115,h:9})});
 if(v.caseDate)draw('caseDate',displayDate(v.caseDate),{page:3,x:469,y:182,w:90,h:10});if(v.caseStatus)draw('caseStatus',v.caseStatus,{page:3,x:444,y:195,w:116,h:10});
 
 // Exact signature and date boxes from official CSC CS Form 212 (Revised 2026)
 // Adjusted x to 99 to ensure signature doesn't bleed into or cover the gray "SIGNATURE" header
 const signBoxes = [
   { page: 0, x: 99, y: 766, w: 275, h: 18 },  // Page 1: SIGNATURE row (data cell)
   { page: 1, x: 99, y: 771, w: 210, h: 17 },  // Page 2: SIGNATURE row (data cell)
   { page: 2, x: 99, y: 755, w: 280, h: 17 },  // Page 3: SIGNATURE row (data cell)
   { page: 3, x: 240, y: 638, w: 198, h: 42 }, // Page 4: Signature (Sign inside the box)
 ];
 const dateBoxes = [
   { page: 0, x: 410, y: 766, w: 155, h: 18 }, // Page 1: DATE row
   { page: 1, x: 335, y: 771, w: 230, h: 17 }, // Page 2: DATE row
   { page: 2, x: 410, y: 755, w: 155, h: 17 }, // Page 3: DATE row
   { page: 3, x: 240, y: 684, w: 198, h: 14 }, // Page 4: Date Accomplished
 ];

 // 1. Signature Date on Pages 1-3: ONLY if user set up signature and checked date toggle
 if (effectiveData.signatureDate) {
   const formattedSigDate = formatFullDate(effectiveData.signatureDate);
   for (let i = 0; i < 3; i++) {
     fit(pages[dateBoxes[i].page], font, formattedSigDate, dateBoxes[i], 7.5, 'center');
   }
 }

 // 2. Date Accomplished on Page 4: fills from data.values.accomplished (or signatureDate if set)
 const accomplishedDate = effectiveData.values.accomplished || (effectiveData.signatureDate ? formatFullDate(effectiveData.signatureDate) : '');
 if (accomplishedDate) {
   fit(pages[3], font, formatFullDate(accomplishedDate), dateBoxes[3], 7.5, 'center');
 }

  // 3. Photo & Signatures
  for(const [key,boxes] of [['photo',[{page:3,x:476,y:498,w:74,h:95}]],['signature',signBoxes]] as const){
    const image=effectiveData[key as 'photo' | 'signature'];if(!image)continue;
    const isPng=image.startsWith('data:image/png');
    const embedded=isPng?await pdf.embedPng(image):await pdf.embedJpg(image);
    for(const box of boxes){
      if(key==='signature'){
        // Mask the red template instruction placeholder inside the white data cell
        pages[box.page].drawRectangle({
          x: box.x + 1,
          y: pages[box.page].getHeight() - box.y - box.h + 1,
          width: box.w - 2,
          height: box.h - 2,
          color: rgb(1, 1, 1),
        });
      }
      // Scale signature prominently so it is clearly visible and fills the signature area naturally
      let scale: number;
      if (key === 'signature') {
        const targetW = box.page === 3 ? 170 : 135;
        const targetH = box.page === 3 ? 42 : 25;
        scale = Math.min(targetW / embedded.width, targetH / embedded.height);
      } else {
        scale = Math.min(box.w / embedded.width, box.h / embedded.height);
      }
      const w=embedded.width*scale,h=embedded.height*scale;
      pages[box.page].drawImage(embedded,{
        x:box.x+(box.w-w)/2,
        y:pages[box.page].getHeight()-box.y-box.h+(box.h-h)/2,
        width:w,
        height:h
      });
    }
  }
 for(const [key,t] of Object.entries(tables))data.records[key]?.slice(t.capacity).forEach((r,i)=>overflow.push({label:`${t.label} — additional record ${t.capacity+i+1}`,value:t.columns.map(c=>`${c.label}: ${displayDate(r[c.key]||'N/A')}`).join('\n')}));
 // Supplemental text avoids clipping, omission or shrinking content to illegibility.
 if(overflow.length){let page=pdf.addPage([576,1008]),y=70;const heading=()=>{page.drawText('PERSONAL DATA SHEET — ADDITIONAL INFORMATION',{x:30,y:967,size:11,font});page.drawText([v.firstName,v.surname].filter(Boolean).join(' '),{x:30,y:947,size:9,font})};heading();for(let i=0;i<overflow.length;i++){const item=overflow[i];const lines=wrap(`${i+1}. ${item.label}\n${item.value}`,font,9,516);for(const line of lines){if(y>947){page=pdf.addPage([576,1008]);y=70;heading()}page.drawText(line,{x:30,y:1008-y,size:9,font});y+=13}y+=15}}
 // A private machine-readable attachment enables lossless import of this app's PDFs.
 await pdf.attach(JSON.stringify(data),'zeticuz-pds.json',{mimeType:'application/json',description:'Editable Personal Data Sheet data'});
 pdf.setTitle('Personal Data Sheet — CS Form 212 Revised 2026');pdf.setAuthor('');pdf.setSubject('Applicant-completed CSC Personal Data Sheet');pdf.setCreator('Zeticuz PDS Builder');
 return new Uint8Array(await pdf.save());
}
// Renders an A4 letter with a subject line, wrapped body paragraphs and a signature block.
export async function letterPDF(letter:Letter,pds:PDS){
 const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);const bold=await doc.embedFont(StandardFonts.HelveticaBold);const W=595.28,H=841.89,M=56,BOTTOM=70;
 let page=doc.addPage([W,H]),y=H-64;const next=()=>{page=doc.addPage([W,H]);y=H-64};
 const put=(text:string,size:number,useFont:PDFFont,gap:number)=>{for(const line of wrap(text,useFont,size,W-2*M)){if(y<BOTTOM)next();page.drawText(line,{x:M,y,size,font:useFont});y-=gap}};
 const paragraph=(text:string,size=10.5,gap=15)=>{for(const part of text.split('\n')){if(!part.trim()){y-=8;continue}put(part,size,font,gap)}y-=6};
 const v=pds.values,applicant=[v.firstName,v.middleName,v.surname,v.extension].filter(Boolean).join(' ');
 if(applicant)put(applicant,13,bold,17);
 put([v.residentialHouse,v.residentialStreet].filter(Boolean).join(' '),8.5,font,12);
 put([[v.residentialVillage,v.residentialBarangay].filter(Boolean).join(', '),[v.residentialCity,v.residentialProvince].filter(Boolean).join(', '),[v.mobile,v.email].filter(Boolean).join(' · ')].filter(Boolean).join(' | '),8.5,font,12);
 y-=18;page.drawText(longDate(letter.date),{x:M,y,size:10.5,font});y-=34;
 for(const item of [letter.recipientName,letter.recipientTitle,letter.organization,...letter.organizationAddress.split('\n')].map(s=>s.trim()).filter(Boolean))put(item,10.5,font,15);
 y-=10;put(`Subject: ${applyPlaceholders(letter.subject,letter,pds)}`,10.5,bold,15);
 y-=8;page.drawText(`Dear ${salutation(letter)},`,{x:M,y,size:10.5,font});y-=24;
 paragraph(applyPlaceholders(letter.body,letter,pds));
 y-=8;if(y<150)next();page.drawText('Respectfully yours,', {x:M,y,size:10.5,font});y-=44;
 page.drawLine({start:{x:M,y},end:{x:M+180,y},thickness:.7});y-=15;
 put(letter.senderName||applicant,10.5,bold,14);put(letter.senderAddress,8.5,font,12);
 if(letter.senderContact)page.drawText(letter.senderContact,{x:M,y:y-2,size:8.5,font});
 doc.setTitle(`${letter.kind==='application'?'Application':'Transmittal'} letter — CS Form 212 Revised 2026`);doc.setCreator('Zeticuz PDS Builder');
 return new Uint8Array(await doc.save());
}
