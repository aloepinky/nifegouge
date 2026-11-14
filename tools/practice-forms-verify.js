#!/usr/bin/env node
//
// Checks the Practice Flight's formation script against its publications: every call, course
// rule, checklist name and note must be found in the publication it cites.
//
//   node tools/practice-forms-verify.js
//
// The same check as tools/practice-verify.js (which does the contact flight), over every line
// the formation flights can have: flights are built for enough codes to fly every profile,
// both flows and both lead orders. A line is found when its words appear in order, close
// together, anywhere in the cited publication's text. Placeholders ("(TAC)", "(fuel 11)") are
// left out. Signals, numbers rows and radio switches are the site's own layout of the
// publications and are not checked word for word; neither is a line marked `generated`.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadSrc } = require('./lib/loadSrc.js');

const ROOT = path.resolve(__dirname, '..');
const REFS = path.join(ROOT, '_reference-docs', 'T6b Primary', 'Fundamental References');
const FILES = {
  'F FTI': 'Primary Formation FTI P-766 (Rev.3 06-26).pdf',
  'TW-4 Formation Supplement': 'TW4 Form Supp.pdf',
  'Checklist Study Guide': 'Expanded Checklists and Brief.pdf',
  'TW-4 Briefing Guide': 'Expanded Checklists and Brief.pdf',
  'Course Rules Manual': 'CORPUS COURSE RULES MANUAL.pdf',
};

if (!fs.existsSync(REFS)) {
  console.log('No _reference-docs/T6b Primary: nothing to check against.');
  process.exit(0);
}

const words = (s, doc) => String(s).toLowerCase()
  .replace(/\{rwy\}/g, ' ')
  .replace(/(\d)o\b/g, '$1')
  .replace(doc ? /$^/ : /\([^)]*\)/g, ' ')
  .replace(/[“”"'’]/g, '')
  .replace(/[^a-z0-9%]+/g, ' ')
  .split(' ')
  .filter(Boolean);

const texts = {};
const tokensOf = (work) => {
  if (!texts[work]) {
    const out = execFileSync('pdftotext', ['-layout', path.join(REFS, FILES[work]), '-'], { maxBuffer: 64 << 20 });
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

const { buildFlight, encodeCode } = loadSrc(path.join(ROOT, 'src/components/practice/forms/flight.js'));
const { PROFILES } = loadSrc(path.join(ROOT, 'src/components/practice/forms/profiles.js'));

// Every distinct line, by its words before filling, with the publication it cites.
const lines = new Map();
const CHECKED = new Set(['call', 'station', 'rule', 'checklist', 'note']);
Object.keys(PROFILES).forEach((p) => {
  for (let seed = 0; seed < 400; seed++) {
    const flight = buildFlight(encodeCode(p, seed * 7919 + 3));
    flight.beats.forEach((b) => b.lines.forEach((l) => {
      if (!CHECKED.has(l.kind) || l.generated || !l.ref) return;
      const text = l.raw.replace(/\[\[|\]\]/g, '');
      const key = `${l.ref.work}|${text}`;
      if (!lines.has(key)) lines.set(key, { text, ref: l.ref, where: b.title });
    }));
  }
});

let missing = 0;
lines.forEach(({ text, ref, where }) => {
  if (!FILES[ref.work]) {
    console.log(`?  ${where}: no file for ${ref.work}`);
    missing++;
    return;
  }
  if (!found(tokensOf(ref.work), words(text))) {
    console.log(`✗  ${where}: "${text}" not found in ${ref.work} (${ref.loc}, ${ref.pages})`);
    missing++;
  }
});

console.log(`${lines.size - missing} of ${lines.size} lines found.`);
process.exit(missing ? 1 : 0);
