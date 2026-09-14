import {readFileSync,writeFileSync} from 'node:fs';
import {letterPDF} from '../src/lib/pdf';
import {parseCSV} from '../src/lib/import';
import {letterFor,letterPlainText} from '../src/lib/letter';
async function main(){
 const assets={font:readFileSync('public/NotoSans.ttf')};
 const r=parseCSV(readFileSync('private/SAM_PDS_RECORD.csv','utf8'),'SAM_PDS_RECORD.csv');
 const letter={...letterFor('application',r.data),recipientTitle:'Regional Director',recipientName:'MARIA D. SANTOS',organization:'Department of Education',organizationAddress:'DepEd Region VII\nSudlon, Lahug, Cebu City'};
 const text=letterPlainText(letter,r.data);
 if(!text.includes('MARIA D. SANTOS')||!text.includes('Subject:'))throw new Error('Letter text assembly failed');
 const out=await letterPDF(letter,r.data);
 writeFileSync('tmp/test-letter.pdf',out);
 const empty=await letterPDF(letterFor('transmittal',{version:1,values:{},records:{}}),{version:1,values:{},records:{}});
 console.log('letter bytes',out.length,'· empty-pds bytes',empty.length);
}
main();
