#!/usr/bin/env node
//
// Checks the T-44C Practice Flight against its publications: every call the FTI prints and every
// course rule must be found in the publication it cites.
//
//   node tools/practice-t44c-verify.js
//
// The publications are in _reference-docs/ (gitignored); without them this says so and stops.
// A line is found when its words appear in order, close together, anywhere in the publication's
// text. Blanks the flight fills ({cs}, {rwy}) are left out. The T-44C's numbers tables
// (numbers.js) are read off rendered pages and are not checked here.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadSrc } = require('./lib/loadSrc.js');

const ROOT = path.resolve(__dirname, '..');
const REFS = path.join(ROOT, '_reference-docs', 'T44C Advanced', 'Fundamental References');
const FILES = {
  'ME FTI': 'P-561 Rev6 CH3.pdf',
  'Course Rules Manual': 'CORPUS COURSE RULES MANUAL.pdf',
};

if (!fs.existsSync(REFS)) {
  console.log('The publications are not here (_reference-docs is gitignored): nothing checked.');
  process.exit(0);
}

// The manual is a scan's text layer, and misreads a few characters.
const OCR = [[/\b3l([lr])\b/gi, '31$1'], [/\bl00r\b/gi, '100r'], [/\bcomer\b/gi, 'corner'], [/\b1 5\b/g, '15'], [/\b0 5 5\b/g, '055'], [/\b2 5 5\b/g, '255'], [/\b3 1 l\b/gi, '31 l'], [/\b13 l\b/gi, '13 l']];
const words = (text, doc) => {
  let s = String(text).toLowerCase();
  if (doc) OCR.forEach(([from, to]) => { s = s.replace(from, to); });
  return s.replace(/\{[^}]*\}/g, ' ').replace(/[“”"'’`]/g, '').replace(/[^a-z0-9%]+/g, ' ').split(' ').filter(Boolean);
};

const texts = {};
const tokensOf = (work) => {
  if (!texts[work]) {
    const out = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', path.join(REFS, FILES[work]), '-'], { maxBuffer: 64 << 22, stdio: ['ignore', 'pipe', 'ignore'] });
    texts[work] = words(out.toString('utf8'), true);
  }
  return texts[work];
};

const WINDOW = 60;
function found(doc, want) {
  if (!want.length) return true;
  for (let i = 0; i < doc.length; i++) {
    if (doc[i] !== want[0]) continue;
    let at = i;
    let ok = true;
    for (const w of want.slice(1)) {
      let j = at + 1;
      while (j < doc.length && j - at <= WINDOW && doc[j] !== w) j++;
      if (j >= doc.length || j - at > WINDOW) { ok = false; break; }
      at = j;
    }
    if (ok) return true;
  }
  return false;
}

const { CALLS, CHECKLISTS, CUES } = loadSrc(path.join(ROOT, 'src/components/practice/t44c/script.js'));
const { allRules } = loadSrc(path.join(ROOT, 'src/components/practice/t44c/routes.js'));

const lines = [];
Object.entries(CALLS).forEach(([id, c]) => lines.push({ text: c.find || c.text, ref: c.ref, where: `call ${id}` }));
Object.entries(CHECKLISTS).forEach(([id, c]) => lines.push({ text: c.find || c.title, ref: c.ref, where: `checklist ${id}` }));
Object.entries(CUES).forEach(([id, c]) => lines.push({ text: c.text, ref: c.ref, where: `cue ${id}` }));
allRules().forEach((r) => lines.push(r));
// A number table's quoted words are callouts: those are the FTI's too.
const NUM = loadSrc(path.join(ROOT, 'src/components/practice/t44c/numbers.js'));
const tables = [...Object.entries(NUM.MANEUVERS).map(([id, m]) => [id, m]), ...Object.entries(NUM.LAPS).map(([id, m]) => [id, m]),
  ...Object.entries(NUM).filter(([, v]) => v && v.rows && v.ref)];
tables.forEach(([id, table]) => table.rows.forEach(([label, value]) => [label, value].forEach((cell) => {
  (String(cell).match(/"[^"]+"/g) || []).forEach((q) => lines.push({ text: q.replace(/,"$/, '"'), ref: table.ref, where: `numbers ${id}` }));
})));

let missing = 0;
lines.forEach(({ text, ref, where }) => {
  if (!FILES[ref.work]) {
    console.log(`?  ${where}: no file for ${ref.work}`);
    missing++;
    return;
  }
  if (!found(tokensOf(ref.work), words(text))) {
    console.log(`X  ${where}: "${text}" not found in ${ref.work} (${ref.loc}, ${ref.pages})`);
    missing++;
  }
});

console.log(`${lines.length - missing} of ${lines.length} lines found.`);
process.exit(missing ? 1 : 0);
