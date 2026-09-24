// Rasterises PDF pages to PNG so the rendered form can be inspected cell by cell.
// Usage: node scripts/render-pdf-pages.mjs <pdf> <outDir> [scale]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

const [file = 'public/csc-2026.pdf', outDir = 'tmp/pages', scaleArg = '2'] = process.argv.slice(2);
const scale = Number(scaleArg);

const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), isEvalSupported: false }).promise;
mkdirSync(outDir, { recursive: true });

for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // pdfjs passes a bare 2d context; @napi-rs/canvas satisfies the subset it uses.
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const out = path.join(outDir, `page-${n}.png`);
  writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`${out}  ${canvas.width}x${canvas.height}`);
}
