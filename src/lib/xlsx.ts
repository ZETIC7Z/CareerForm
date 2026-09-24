import ExcelJS from 'exceljs';
import schema from './schema.json';
import {PDS,getValue,displayDate,questions} from './model';
import {TEMPLATE_REVISION} from './site';

const PAGE_SHEETS=['C1','C2','C3','C4'];

/**
 * Loads the official CSC 2026 Excel workbook and populates it with PDS data,
 * preserving original cell formatting, borders, fonts, formulas, and print dimensions.
 */
export async function generateXLSX(data:PDS,templateBuffer?:ArrayBuffer):Promise<Uint8Array>{
  const wb=new ExcelJS.Workbook();
  if(templateBuffer){
    await wb.xlsx.load(templateBuffer);
  } else if(typeof window==='undefined'){
    const fs=await import('node:fs');
    const path=await import('node:path');
    const file=fs.readFileSync(path.join(process.cwd(),'assets','csc-2026.xlsx'));
    await wb.xlsx.load(file as any);
  } else {
    // In browser, safely fetch binary stream from API route with static fallback
    let buf:ArrayBuffer|undefined;
    for(const url of [`/api/template-xlsx?v=${TEMPLATE_REVISION}`,`/csc-2026.xlsx?v=${TEMPLATE_REVISION}`]){
      try{
        const res=await fetch(url);
        if(res.ok){buf=await res.arrayBuffer();break}
      }catch{}
    }
    if(!buf)throw new Error('Could not load official PDS spreadsheet template.');
    await wb.xlsx.load(buf);
  }

  // 1. Populate scalar fields defined in schema.json
  for(const f of schema.fields){
    if(!f.cell||f.page===undefined)continue;
    const sheetName=PAGE_SHEETS[f.page];
    const ws=wb.getWorksheet(sheetName);
    if(!ws)continue;
    let val=getValue(data,f.key);
    if(!val)continue;
    if(f.type==='date'||/\.(from|to)$/.test(f.key)){
      val=displayDate(val);
    }
    const cell=ws.getCell(f.cell);
    cell.value=val;
  }

  // 2. Questions 34-40 on Sheet C4
  const ws4=wb.getWorksheet('C4');
  if(ws4){
    questions.forEach((q)=>{
      const answer=data.values[q.key];
      // Tick/mark Yes/No if mapped, or place details
      if(answer==='Yes'&&data.values[q.key+'Details']){
        // details are populated by schema fields if cells exist
      }
    });
    if(data.values.caseDate){
      ws4.getCell('I20').value=displayDate(data.values.caseDate);
    }
    if(data.values.caseStatus){
      ws4.getCell('I21').value=data.values.caseStatus;
    }
    if(data.values.accomplished){
      ws4.getCell('F64').value=displayDate(data.values.accomplished);
    }
  }

  const outBuffer=await wb.xlsx.writeBuffer();
  return new Uint8Array(outBuffer);
}
