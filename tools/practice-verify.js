#!/usr/bin/env node
//
// Checks the Practice Flight's script against its publications: every checklist name and every
// call must be found in the publication it cites.
//
//   node tools/practice-verify.js
//
// The publications are in _reference-docs/ (gitignored); without them this says so and stops.
// A line is found when its words appear in order, close together, anywhere in the cited
// publication's text: the study guide prints its checklists as three-column tables, which
// pdftotext interleaves, so a response can be split by a line of the next column. Placeholders
// the student fills in ("(call sign)", "____") and the runway placeholder are left out.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadSrc } = require('./lib/loadSrc.js');

const ROOT = path.resolve(__dirname, '..');
const REFS = path.join(ROOT, '_reference-docs', 'T6b Primary', 'Fundamental References');
const FILES = {
  'Checklist Study Guide': 'Expanded Checklists and Brief.pdf',
  'FAM FTI': 'FAM FTI.pdf',
  'Course Rules Manual': 'CORPUS COURSE RULES MANUAL.pdf',
  'VT-28 Student Standardization Handout': 'VT-28 Student Standardization Handout_ July Final PDF.pdf',
};

if (!fs.existsSync(REFS)) {
  console.log('No _reference-docs/T6b Primary: nothing to check against.');
  process.exit(0);
}

// A placeholder in the script is dropped; the publication's own parentheses are kept, since
// one can open in one column and close many lines later in another.
const words = (s, doc) => String(s).toLowerCase()
  .replace(/\{rwy\}/g, ' ')
  // The FTI's degree sign comes out of its text layer as a letter: "30-60o AOB".
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

// Every word of `want`, in order, each within WINDOW words of the one before.
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

const { CHECKLISTS, CALLS, GROUND, VOICE_REPORT, WHEN, WHEN_REF } = loadSrc(path.join(ROOT, 'src/components/practice/famScript.js'));

const lines = [];
const add = (text, ref, where) => lines.push({ text, ref, where });

Object.entries(CHECKLISTS).forEach(([id, cl]) => add(cl.title, cl.ref, `${id} title`));
// A call made up for practice (`generated`) has no source to be found in.
Object.entries(CALLS).forEach(([group, calls]) => calls.forEach((c, n) => {
  if (!c.generated) add(c.text, c.ref, `${group} ${n + 1}`);
}));
Object.entries(WHEN).forEach(([k, text]) => add(text, WHEN_REF[k], `when ${k}`));
add('Identification, Situation, Position, and Intention', VOICE_REPORT.ref, 'voice report');

// The FTI's procedures and VT-28's memory aids, a paragraph or line at a time, marks taken out.
const unmark = (s) => s.replace(/\[\[|\]\]/g, '');
const { FTI } = loadSrc(path.join(ROOT, 'src/components/practice/ftiProcedures.js'));
const { VT28 } = loadSrc(path.join(ROOT, 'src/components/practice/vt28.js'));
Object.entries(FTI).forEach(([id, p]) => p.rule.forEach((para, n) => add(unmark(para.text).replace(/^[a-z]+\. /, ''), p.ref, `FTI ${id} ${n + 1}`)));
Object.entries(VT28).forEach(([id, p]) => p.rule.forEach((line, n) => add(unmark(line.text).replace(' – ', ' '), p.ref, `VT-28 ${id} ${n + 1}`)));

let missing = 0;
lines.forEach(({ text, ref, where }) => {
  if (!FILES[ref.work]) {
    console.log(`?  ${where}: no file for ${ref.work}`);
    missing++;
    return;
  }
  const want = words(text);
  if (!found(tokensOf(ref.work), want)) {
    console.log(`✗  ${where}: "${text}" not found in ${ref.work} (${ref.loc}, ${ref.pages})`);
    missing++;
  }
});

console.log(`${lines.length - missing} of ${lines.length} lines found.`);
if (GROUND.length === 0) console.log('The flight has no ground segments.');
process.exit(missing ? 1 : 0);
