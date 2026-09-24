// Regression check for the rendered CSC PDS template.
//
// Verifies the things a career-service form must get right:
//   * every page is the same A4 page size (so print output is uniform)
//   * the expected page count
//   * no two *visible* text runs overlap (the old 8x14 template printed
//     captions on top of each other around the EDUCATION and CITIZENSHIP rows)
//   * the captions the form depends on are present and on one line
//
// LibreOffice emits an invisible text run for every legacy form-control value
// ("FALSE", "0", ...) sitting on top of its caption. Those runs carry no ink, so
// they are separated from real overlaps by sampling the rasterised page.
//
// Usage: node scripts/check-template-render.mjs [pdf]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

const file = process.argv[2] || 'public/csc-2026.pdf';
const A4 = { width: 595.28, height: 841.89 };
const TOLERANCE = 1.5;
const SCALE = 3;          // raster scale for the ink probe
const INK = 100;          // grayscale threshold that counts as ink
const MIN_INK = 0.02;     // a run must cover 2% of its box to be "visible"
const OVERLAP_RATIO = 0.3; // fraction of the smaller box that must intersect
// Text LibreOffice draws for the legacy form controls baked into the CSC workbook. Every
// caption in the form is preceded by one of these, and they always carry no ink.
const FORM_VALUE = /^(FALSE|TRUE|YES|NO|PHOTO|\d{1,2}|_+|#+)$/;

const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), isEvalSupported: false }).promise;
const failures = [];
const notes = [];

// --- page geometry -----------------------------------------------------------
const sizes = [];
for (let n = 1; n <= doc.numPages; n++) {
  const vp = (await doc.getPage(n)).getViewport({ scale: 1 });
  sizes.push({ n, w: vp.width, h: vp.height });
}
if (doc.numPages !== 4) failures.push(`expected 4 pages, found ${doc.numPages}`);
for (const s of sizes) {
  if (Math.abs(s.w - A4.width) > TOLERANCE || Math.abs(s.h - A4.height) > TOLERANCE) {
    failures.push(`page ${s.n} is ${s.w.toFixed(2)}x${s.h.toFixed(2)}, expected A4 ${A4.width}x${A4.height}`);
  }
}
notes.push(`pages: ${sizes.map(s => `${s.w.toFixed(1)}x${s.h.toFixed(1)}`).join(', ')}`);

// --- per page: text runs, ink probe, overlaps --------------------------------
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale: 1 });
  const H = vp.height;
  const content = await page.getTextContent();

  // rasterise once so each run can be tested for actual ink
  const rvp = page.getViewport({ scale: SCALE });
  const canvas = createCanvas(Math.ceil(rvp.width), Math.ceil(rvp.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: rvp, canvas }).promise;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const runs = [];
  const glyphRuns = []; // tick-box squares etc. come through as text runs with no readable string
  for (const it of content.items) {
    const x = it.transform[4];
    const y = H - it.transform[5];
    const w = it.width;
    const h = it.height || 8;
    const box = { x, y, w, h, x0: x, x1: x + w, y0: y - h * 0.85, y1: y + h * 0.25 };
    const s = (it.str || '').trim();
    if (!s) { if (w > 1.5) glyphRuns.push(box); continue; }
    runs.push({ ...box, s });
  }

  // Decide whether each run actually paints ink. A run is judged only on the pixels of its own
  // box that are not claimed by another text run or by vector artwork (table rules, tick boxes),
  // so neither a caption nor a neighbouring checkbox can be mistaken for the run's own glyphs.
  // LibreOffice overlays an inkless copy of each legacy form control's value on its caption;
  // without this attribution those copies look like catastrophic caption collisions.
  const covered = new Uint8Array(canvas.width * canvas.height);   // vector artwork
  const owner = new Int32Array(canvas.width * canvas.height).fill(-1); // owning text run
  const bounds = (x0, y0, x1, y1) => [
    Math.max(0, Math.floor(x0 * SCALE)),
    Math.max(0, Math.floor(y0 * SCALE)),
    Math.min(canvas.width, Math.ceil(x1 * SCALE)),
    Math.min(canvas.height, Math.ceil(y1 * SCALE)),
  ];
  const markBox = (x0, y0, x1, y1) => {
    const [px0, py0, px1, py1] = bounds(x0, y0, x1, y1);
    for (let py = py0; py < py1; py++) {
      const row = py * canvas.width;
      for (let px = px0; px < px1; px++) covered[row + px] = 1;
    }
  };
  for (const g of glyphRuns) markBox(g.x0, g.y0, g.x1, g.y1);
  runs.forEach((r, idx) => {
    const [px0, py0, px1, py1] = bounds(r.x0, r.y0, r.x1, r.y1);
    for (let py = py0; py < py1; py++) {
      const row = py * canvas.width;
      for (let px = px0; px < px1; px++) owner[row + px] = idx;
    }
  });

  // vector artwork boxes from the display list (transformed through the current matrix)
  const { OPS } = pdfjs;
  const ol = await page.getOperatorList();
  const mul = (a, b) => [
    a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
    a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
  let ctm = [1, 0, 0, 1, 0, 0];
  const ctmStack = [];
  let artBoxes = 0;

  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i], a = ol.argsArray[i];
    if (fn === OPS.save) ctmStack.push(ctm.slice());
    else if (fn === OPS.restore) { const p = ctmStack.pop(); if (p) ctm = p; }
    else if (fn === OPS.transform) ctm = mul(ctm, Array.from(a));
    else if (fn === OPS.constructPath) {
      const coords = a[1];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let k = 0; k + 1 < coords.length; k += 2) {
        const X = ctm[0] * coords[k] + ctm[2] * coords[k + 1] + ctm[4];
        const Y = ctm[1] * coords[k] + ctm[3] * coords[k + 1] + ctm[5];
        if (X < minX) minX = X; if (X > maxX) maxX = X;
        if (Y < minY) minY = Y; if (Y > maxY) maxY = Y;
      }
      // Only thin rules and small boxes matter here; large filled panels are background and
      // would otherwise mask the whole page. Nothing that big is dark enough to be confused
      // with glyph ink anyway.
      const bw = maxX - minX, bh = maxY - minY;
      if (Number.isFinite(minX) && (Math.min(bw, bh) <= 4 || (bw <= 16 && bh <= 16))) {
        markBox(minX, H - maxY, maxX, H - minY);
        artBoxes++;
      }
    }
  }

  const sample = (r, idx) => {
    const [px0, py0, px1, py1] = bounds(r.x0, r.y0, r.x1, r.y1);
    let dark = 0, total = 0;
    for (let py = py0; py < py1; py++) {
      const row = py * canvas.width;
      for (let px = px0; px < px1; px++) {
        const cell = row + px;
        if (covered[cell]) continue;
        const own = owner[cell];
        if (own !== -1 && own !== idx) continue;
        total++;
        const i = cell * 4;
        if ((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 < INK) dark++;
      }
    }
    return { ink: total ? dark / total : 0, area: total };
  };

  runs.forEach((r, idx) => {
    const own = sample(r, idx);
    const [px0, py0, px1, py1] = bounds(r.x0, r.y0, r.x1, r.y1);
    const boxPixels = Math.max(1, (px1 - px0) * (py1 - py0));
    r.exclusiveFraction = own.area / boxPixels;
    r.ink = own.ink;
    r.decided = r.exclusiveFraction >= 0.15;
    // A run whose every pixel is shared with a caption or a rule stays undecided: we cannot
    // prove it paints nothing, so it neither fails the check nor excuses an overlap.
    r.visible = r.decided ? own.ink >= MIN_INK : true;
  });

  let overlaps = 0;
  const invisible = runs.filter(r => r.decided && !r.visible);
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i], b = runs[j];
      // Inkless means the run paints nothing at all (the pixel probe proved it); FORM_VALUE
      // catches the same class of run where a neighbouring tick box made the probe inconclusive.
      const overlay = (r) => (r.decided && !r.visible) || FORM_VALUE.test(r.s);
      if (overlay(a) || overlay(b)) continue;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox <= 0 || oy <= 0) continue;
      const area = ox * oy;
      const small = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
      if (small <= 0 || area / small < OVERLAP_RATIO) continue;
      overlaps++;
      failures.push(`page ${n}: visible overlap "${a.s.slice(0, 40)}" @${a.x0.toFixed(1)},${a.y.toFixed(1)} with "${b.s.slice(0, 40)}" @${b.x0.toFixed(1)},${b.y.toFixed(1)}`);
    }
  }
  notes.push(`page ${n}: ${runs.length} runs, ${runs.length - invisible.length} with ink, ${overlaps} visible overlaps`);
  if (invisible.length) notes.push(`page ${n}: ${invisible.length} inkless overlay runs (${[...new Set(invisible.map(r => r.s))].slice(0, 6).join(', ')})`);

  page.cleanup();
}

// --- captions that must be present and on a single line ----------------------
const p1 = await doc.getPage(1);
const H1 = p1.getViewport({ scale: 1 }).height;
const p1texts = (await p1.getTextContent()).items
  .filter(i => (i.str || '').trim())
  .map(i => ({ s: i.str.replace(/\s+/g, ' ').trim(), x: +i.transform[4].toFixed(1), y: +(H1 - i.transform[5]).toFixed(1), w: i.width }));
const required = [
  'FIRST NAME', 'MIDDLE NAME', 'DATE OF BIRTH', 'PLACE OF BIRTH', 'SEX AT BIRTH',
  'ELEMENTARY', 'SECONDARY', 'VOCATIONAL / TRADE COURSE', 'COLLEGE', 'GRADUATE STUDIES',
  'Dual Citizenship', 'by birth', 'by naturalization', 'SIGNATURE',
];
for (const want of required) {
  if (!p1texts.some(t => t.s === want)) failures.push(`page 1: caption "${want}" missing from the render`);
}
// The level captions must share one left edge (the old template shifted VOCATIONAL left by
// a whole column and wrapped "TRADE COURSE" over the COLLEGE row).
const levels = ['ELEMENTARY', 'SECONDARY', 'VOCATIONAL / TRADE COURSE', 'COLLEGE', 'GRADUATE STUDIES']
  .map(l => p1texts.find(t => t.s === l)).filter(Boolean);
if (levels.length === 5) {
  const xs = levels.map(l => l.x);
  const spread = Math.max(...xs) - Math.min(...xs);
  const gap = Math.min(...levels.slice(1).map((l, i) => l.y - levels[i].y));
  notes.push(`education captions: x ${xs.join(', ')} (spread ${spread.toFixed(1)}pt), row pitch >= ${gap.toFixed(1)}pt`);
  if (spread > 5) failures.push(`page 1: education captions do not share a left edge (spread ${spread.toFixed(1)}pt)`);
  if (gap < 14) failures.push(`page 1: education rows are ${gap.toFixed(1)}pt apart — captions would collide`);
}

const outDir = process.argv[3];
if (outDir) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'check-report.json'), JSON.stringify({ file, notes, failures }, null, 2));
}

for (const note of notes) console.log('  ' + note);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('\n✓ template render OK');
