import {PDFDocument,PDFFont,PDFPage,rgb,StandardFonts,pushGraphicsState,popGraphicsState,moveTo,lineTo,closePath,clip,endPath} from 'pdf-lib';
import mapping from './pdf-map.json';
import calibrationJson from './pdf-calibration.json';
import {PDS,getValue,fields,tables,displayDate,formatFullDate,sortWorkRecordsDescending,sortEducationRecords,questions} from './model';
import {Letter,applyPlaceholders,longDate,salutation} from './letter';
import {TEMPLATE_REVISION} from './site';
export type Box={page:number;x:number;y:number;w:number;h:number};
export type Rect=[number,number,number,number,number];
export const pdfMap:Record<string,Box>=mapping;

/**
 * Everything the official A4 template needs beyond the field map. These values were
 * originally tuned by hand against the older 8in x 14in template and are converted onto
 * the A4 page by `scripts/build-pdf-calibration.py` (see scripts/build-pdf-map.py).
 */
export const calibration=calibrationJson as unknown as {
  page:{width:number;height:number};
  ticks:Record<string,[string,number,number][]>;
  boxes:Record<string,Rect>;
  questionTicks:number[][];
  questionDetailY:number[];
  signatureBoxes:Rect[];
  dateBoxes:Rect[];
};
const box=(key:keyof typeof calibration.boxes):Box=>{const [page,x,y,w,h]=calibration.boxes[key];return {page,x,y,w,h}};
const rectBox=([page,x,y,w,h]:Rect):Box=>({page,x,y,w,h});
// Self-healing memo for binary template stream
const memo=(slot:{current?:Promise<ArrayBuffer>},path:string)=>slot.current??=asset(path).catch(error=>{slot.current=undefined;throw error});
const templates:{current?:Promise<ArrayBuffer>}={};
async function asset(path:string){
  // First attempt JSON template endpoint to eliminate browser download managers (IDM) interception
  if(!path.endsWith('.ttf')){
    try{
      const res=await fetch(`/api/template?v=${TEMPLATE_REVISION}`);
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
  // The map's cell heights are interpolated and run ~1pt tall, so text sized to the mapped
  // height spills past the printed rule below. Reserve a proportional margin instead: the
  // caller only ever gets a block that the printed cell itself can hold.
  const slack = Math.max(0.35, Math.min(1.6, b.h * 0.1));
  const availHeight = b.h - slack;

  if (singleLine) {
    while (lines.length > 1 && size > 4.0) {
      size -= 0.2;
      lines = wrap(text, font, size, availWidth);
    }
  }

  while (lines.length * size * lineGapRatio > availHeight && size > 4.0) {
    size -= 0.2;
    lines = wrap(text, font, size, availWidth);
  }
  if (lines.length * size * lineGapRatio > availHeight + 0.35) return false;

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
 const template=provided?.template??await memo(templates,`/api/template?v=${TEMPLATE_REVISION}`);
 const pdf=await PDFDocument.load(template);
 // Official standard PDF Helvetica — 100% reliable across all browsers and devices without external font dependencies
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const fontBold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const pages=pdf.getPages();const overflow:{label:string;value:string}[]=[];

 // Automatically sort work experience records in reverse-chronological order (most recent
 // first) and education records onto the form's own row order, so an imported record always
 // lands on the row that carries its level.
 const effectiveData: PDS = {
   ...data,
   records: {
     ...data.records,
     work: sortWorkRecordsDescending(data.records?.work || []),
     education: sortEducationRecords(data.records?.education || []),
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
   const b={...box0};
   if(key==='accomplished') continue; // Handled explicitly below with exact coordinates and formatting
   let value=getValue(effectiveData,key);if(!value)continue;
   const field=fields.find(f=>f.key===key);
   // Every date cell on the form asks for mm/dd/yyyy, the work-experience columns included:
   // they are narrow, so the value is drawn on one line and the size steps down to fit.
   if (field?.type==='date'||/\.(from|to)$/.test(key)) {
     value = displayDate(value);
   }
   draw(key,value,b);
 }
 const p=pages[0];const v=effectiveData.values;
 const options:Record<string,Record<string,[number,number]>>={};
 for(const [group,entries] of Object.entries(calibration.ticks)){
   options[group]={};
   for(const [label,x,y] of entries)options[group][label]=[Number(x),Number(y)];
 }
 for(const [key,choices] of Object.entries(options)){const xy=choices[v[key]];if(xy)tick(p,...xy)}
 if(v.citizenshipCountry)draw('citizenshipCountry',v.citizenshipCountry,box('citizenshipCountry'));
 if(v.civilStatus==='Other'&&v.civilOther)draw('civilOther',v.civilOther,box('civilOther'));
  const qPositions=calibration.questionTicks;
 const detailY=calibration.questionDetailY;
 // Each question's "If YES, give details:" area is two printed writing lines, so the answer is
 // given a two-line box that sits on those lines instead of a cramped single line above them.
 questions.forEach((q,i)=>{const answer=v[q.key];if(answer==='Yes'||answer==='No')tick(pages[3],qPositions[i][answer==='Yes'?0:1],qPositions[i][2]);if(answer==='Yes'&&v[q.key+'Details'])draw(q.key+'Details',v[q.key+'Details'],{page:3,x:368,y:detailY[i]+5,w:150,h:15.5})});
 if(v.caseDate)draw('caseDate',displayDate(v.caseDate),box('caseDate'));if(v.caseStatus)draw('caseStatus',v.caseStatus,box('caseStatus'));
 
  // Signature, date and photo cells, measured from the printed rules of the official blank
  // itself — each cell's own four rules — so a mark lands inside the very cell the form
  // reserves for it, on every page:
  //   page 1  signature x 133.35..366.21 · date x 426.63..551.13 · row y 798.88..818.56
  //   page 2  signature x 132.63..314.14 · date x 386.24..541.78 · row y 757.88..776.73
  //   page 3  signature x 171.38..349.84 · date x 436.39..571.79 · row y 804.99..825.50
  //   page 4  signature x 242.51..424.49 y 658.57..707.73 · date y 717.32..725.72
  //   page 4  photo     x 448.49..528.47 y 523.50..619.47
  const signBoxes = calibration.signatureBoxes.map(rectBox);
  const dateBoxes = calibration.dateBoxes.map(rectBox);
  const PHOTO_BOX:Box={page:3,x:448.49,y:523.5,w:79.98,h:95.97};

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
    fit(pages[3], font, formatFullDate(accomplishedDate), dateBoxes[3], 6.8, 'center');
  }

  // 3. Photo & Signatures
  for(const [key,boxes] of [['photo',[PHOTO_BOX]],['signature',signBoxes]] as const){
    const image=effectiveData[key as 'photo' | 'signature'];if(!image)continue;
    const embedded=image.startsWith('data:image/png')
      ? await pdf.embedPng(image).catch(()=>null)
      : await pdf.embedJpg(image).catch(()=>null);
    if(!embedded)continue;
    for(const box of boxes){
      const page=pages[box.page];
      const floorY=page.getHeight()-box.y-box.h;
      if(key==='signature'){
        // Every signature cell prints its red e-signature caption inside the cell itself, so
        // the cell is cleared first. The 0.7pt inset keeps the printed rules around it.
        page.drawRectangle({x:box.x+0.7,y:floorY+0.7,width:box.w-1.4,height:box.h-1.4,color:rgb(1,1,1)});
      }
      // A signature sits inside its cell with breathing room above and below; the photo is
      // scaled to cover its frame and clipped to it, so no white gap is left at any edge
      // whatever aspect ratio the uploaded picture happens to have.
      const cover=key==='photo';
      const scale=cover
        ? Math.max(box.w/embedded.width,box.h/embedded.height)
        : Math.min((box.w*0.5)/embedded.width,(box.h*0.72)/embedded.height);
      const w=embedded.width*scale,h=embedded.height*scale;
      if(cover){
        page.pushOperators(pushGraphicsState(),moveTo(box.x,floorY),lineTo(box.x+box.w,floorY),lineTo(box.x+box.w,floorY+box.h),lineTo(box.x,floorY+box.h),closePath(),clip(),endPath());
      }
      page.drawImage(embedded,{x:box.x+(box.w-w)/2,y:floorY+(box.h-h)/2,width:w,height:h});
      if(cover)page.pushOperators(popGraphicsState());
    }
  }
 for(const [key,t] of Object.entries(tables))data.records[key]?.slice(t.capacity).forEach((r,i)=>overflow.push({label:`${t.label} — additional record ${t.capacity+i+1}`,value:t.columns.map(c=>`${c.label}: ${displayDate(r[c.key]||'N/A')}`).join('\n')}));
 // Supplemental text avoids clipping, omission or shrinking content to illegibility.
 const {width:PW,height:PH}=calibration.page;
 if(overflow.length){let page=pdf.addPage([PW,PH]),y=70;const top=PH-41;const heading=()=>{page.drawText('PERSONAL DATA SHEET — ADDITIONAL INFORMATION',{x:30,y:top,size:11,font});page.drawText([v.firstName,v.surname].filter(Boolean).join(' '),{x:30,y:top-20,size:9,font})};heading();const margin=30;for(let i=0;i<overflow.length;i++){const item=overflow[i];const lines=wrap(`${i+1}. ${item.label}\n${item.value}`,font,9,PW-2*margin);for(const line of lines){if(y>PH-61){page=pdf.addPage([PW,PH]);y=70;heading()}page.drawText(line,{x:margin,y:PH-y,size:9,font});y+=13}y+=15}}
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
  y-=8;if(y<150)next();page.drawText('Respectfully yours,', {x:M,y,size:10.5,font});
  const sigData = letter.signature || pds.signature;
  if (sigData && sigData.startsWith('data:image/')) {
    try {
      const base64 = sigData.split(',')[1];
      const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const sigImg = sigData.includes('png') ? await doc.embedPng(sigBytes) : await doc.embedJpg(sigBytes);
      const scaled = sigImg.scaleToFit(140, 36);
      page.drawImage(sigImg, {
        x: M + 10,
        y: y - 38,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {}
  }
  y-=44;
  page.drawLine({start:{x:M,y},end:{x:M+180,y},thickness:.7});y-=15;
  put(letter.senderName||applicant,10.5,bold,14);put(letter.senderAddress,8.5,font,12);
 if(letter.senderContact)page.drawText(letter.senderContact,{x:M,y:y-2,size:8.5,font});
 doc.setTitle(`${letter.kind==='application'?'Application':'Transmittal'} letter — CS Form 212 Revised 2026`);doc.setCreator('Zeticuz PDS Builder');
 return new Uint8Array(await doc.save());
}
