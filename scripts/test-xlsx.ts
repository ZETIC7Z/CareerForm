import fs from 'node:fs';
import {generateXLSX} from '../src/lib/xlsx';
import {parseCSV} from '../src/lib/import';

async function main(){
  const raw = fs.readFileSync('private/SAM_PDS_RECORD.csv', 'utf8');
  const r = parseCSV(raw, 'SAM');
  const tpl = fs.readFileSync('assets/csc-2026.xlsx');
  const bytes = await generateXLSX(r.data, tpl.buffer.slice(tpl.byteOffset, tpl.byteOffset + tpl.byteLength));
  fs.writeFileSync('tmp/SAM-populated.xlsx', Buffer.from(bytes));
  console.log('generateXLSX verified! size:', bytes.length);
}
main();
