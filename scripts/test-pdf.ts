import {readFileSync,writeFileSync} from 'node:fs';
import {generatePDF} from '../src/lib/pdf';
import {emptyPDS} from '../src/lib/model';
async function main(){const d=emptyPDS();d.values={surname:'LOCAL TEST',firstName:'JUAN',birthDate:'1994-08-16',sex:'Male',civilStatus:'Single',citizenship:'Filipino',accomplished:'2026-09-07'};const out=await generatePDF(d,{template:readFileSync('public/csc-2026.pdf'),font:readFileSync('public/NotoSans.ttf')});writeFileSync('tmp/test-pds.pdf',out);console.log('PDF generated',out.length)}main();
