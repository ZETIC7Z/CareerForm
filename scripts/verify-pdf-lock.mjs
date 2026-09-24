#!/usr/bin/env node
/**
 * Freeze guard for the live PDS form.
 *
 * The PDF pipeline (geometry, field mapping, schema and the bundled official template)
 * is calibrated against the CSC CS Form 212 (Revised 2026) template asset itself. Every
 * value in it was measured by rendering real pages and reading pixels back, so an
 * innocent refactor — reordering a JSON key, reformatting a box, retyping a coordinate —
 * silently moves ink on an official government document.
 *
 * This script hashes the frozen files and fails when one of them changes, which turns
 * "did my refactor break the form?" into a deliberate, reviewable decision.
 *
 *   node scripts/verify-pdf-lock.mjs           # verify against the lock
 *   node scripts/verify-pdf-lock.mjs --write   # re-freeze after an intended change
 *
 * Run it before deploying: `npm run verify:form`.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK_PATH = resolve(root, 'src/lib/pdf-lock.json');

/** Everything that decides where ink lands on the official form. */
const FROZEN = [
  'src/lib/pdf.ts',
  'src/lib/pdf-calibration.json',
  'src/lib/pdf-map.json',
  'src/lib/schema.json',
  'src/lib/model.ts',
  'public/csc-2026.pdf',
  'public/csc-2026.xlsx',
];

const hash = file => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');

const current = {};
for (const file of FROZEN) {
  current[file] = existsSync(resolve(root, file)) ? hash(file) : 'MISSING';
}

const write = process.argv.includes('--write');

if (write) {
  const payload = {
    note: 'Frozen live-form contract. Regenerate with: node scripts/verify-pdf-lock.mjs --write',
    frozenAt: new Date().toISOString(),
    files: current,
  };
  writeFileSync(LOCK_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`\n\u2705 Form frozen — wrote ${relative(root, LOCK_PATH)} (${FROZEN.length} files).\n`);
  process.exit(0);
}

if (!existsSync(LOCK_PATH)) {
  console.error('\n\u274c src/lib/pdf-lock.json is missing. Run: node scripts/verify-pdf-lock.mjs --write\n');
  process.exit(1);
}

const lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
const drifted = [];
const added = [];

for (const file of FROZEN) {
  if (!(file in lock.files)) {
    added.push(file);
    continue;
  }
  if (lock.files[file] !== current[file]) drifted.push(file);
}

const removed = Object.keys(lock.files).filter(f => !FROZEN.includes(f));

if (drifted.length === 0 && added.length === 0 && removed.length === 0) {
  console.log(`\n\u2705 Live form intact — ${FROZEN.length} frozen files match the lock (frozen ${lock.frozenAt}).\n`);
  process.exit(0);
}

console.error('\n\u26d4 LIVE FORM DRIFT DETECTED\n');
if (drifted.length) {
  console.error('Changed since the form was frozen:');
  for (const file of drifted) console.error(`  • ${file}`);
}
if (added.length) console.error(`  • new file pulled into the contract: ${added.join(', ')}`);
if (removed.length) console.error(`  • removed from the contract: ${removed.join(', ')}`);

console.error(`\nThe CSC PDS render is calibrated pixel-by-pixel against public/csc-2026.pdf.
If the change is intentional, verify the rendered pages first, then re-freeze:

    npm run verify:form:accept

Otherwise revert the file(s) above — production stays untouched until this passes.\n`);
process.exit(1);
