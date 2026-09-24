/**
 * Keep only the first N pages of a PDF, in place.
 *
 *   node scripts/trim-pdf.mjs public/csc-2026.pdf 4
 *
 * `render-template-pdf.py` uses this because LibreOffice exports the workbook's hidden
 * continuation sheets (C5–C11) along with the four form pages, and the app only ever fills
 * the four form pages.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [file, pages] = [process.argv[2], Number(process.argv[3])];
if (!file || !pages) throw new Error('usage: node scripts/trim-pdf.mjs <pdf> <pages>');

const { PDFDocument } = await import('pdf-lib');
const doc = await PDFDocument.load(readFileSync(file));
for (let index = doc.getPageCount() - 1; index >= pages; index--) doc.removePage(index);
writeFileSync(file, await doc.save());
console.log(`${file}: kept ${Math.min(pages, doc.getPageCount())} of ${doc.getPageCount()} pages`);
